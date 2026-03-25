import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { inspect } from "node:util";
import WebSocket from "ws";
import colors from "./colors";
import { LOG_LEVELS, LogEntry, LogFormatter, LogFormatterProps, LoggerConfig, LoggerMethods, LogLevel, TagDefinition } from "./types";

export const logHistory: LogEntry[] = [];

export type ScopedLogger = Record<string, any> & Logger;

const defaultFormatter: LogFormatter = ({ timestamp, name, levelLabel, coloredTag, message, deltaLabel }) => {
  const ts = colors.gray(timestamp);
  const n  = colors.bold(colors.blue(`[${name}]`));
  return `${ts} ${n} ${levelLabel} ${coloredTag} ${message}${deltaLabel}\n`;
};

class Logger {

  private _level: LogLevel;
  private _name: string;
  private _lastLogs: Map<string, number> = new Map(); // Track deltas per tag
  private _tagColors: Map<string, (s: string) => string> = new Map();
  private _redactKeys: Set<string>;
  private _formatter: LogFormatter;
  private _filePath?: string;
  private _fileFormat: "text" | "json" = "text";
  private _socket?: WebSocket;
  private _socketUrl?: string;
  private _socketReconnectIntervalMs = 3000;
  private _socketMaxQueueSize = 500;
  private _socketQueue: string[] = [];
  private _socketReconnectTimer?: NodeJS.Timeout;
  private _destroyed = false;
  private _meta: Record<string, any> = {};

  constructor(config: LoggerConfig<any>) {
    if (!config.name) {
      throw new TypeError(`ZuzLogger: \`name\` is required`);
    }

    this._name = config.name;
    this._level = config.level ?? "info";
    this._redactKeys = new Set(config.redact ?? ["password", "token", "secret", "authorization", "key"]);
    this._formatter = config.formatter ?? defaultFormatter;
    this._setupTagColors(config.tags);
    this._setupFileTransport(config);
    this._setupSocketTransport(config);
    this.format = this.format.bind(this);

    // Return a Proxy so that any property access (like log.boot) 
    // automatically creates a scoped logger if the property doesn't exist.
    return new Proxy(this, {
      get: (target, prop: string) => {
        if (prop in target) return (target as any)[prop];
        if (typeof prop === 'symbol') return (target as any)[prop];
        return target.tag(prop);
      }
    });

  }

  private _setupTagColors(tags?: TagDefinition<any>[]) {
    if (!tags) return;
    for (const def of tags) {
      if (typeof def === "string") {
        this._tagColors.set(def, colors.magenta);
      } else {
        const colorFn = (colors as any)[def.color];
        this._tagColors.set(def.label, typeof colorFn === "function" ? colorFn : colors.magenta);
      }
    }
  }

  private _getTagColorFn(tag: string): (s: string) => string {
    return this._tagColors.get(tag) ?? colors.magenta;
  }

  private _setupFileTransport(config: LoggerConfig<any>) {
    if (!config.file) return;

    const fileCfg = typeof config.file === "string"
      ? { path: config.file, format: "text" as const }
      : config.file;

    this._filePath = fileCfg.path;
    this._fileFormat = fileCfg.format ?? "text";
  }

  private _setupSocketTransport(config: LoggerConfig<any>) {
    if (!config.websocket) return;

    const wsCfg = typeof config.websocket === "string"
      ? { url: config.websocket }
      : config.websocket;

    this._socketUrl = wsCfg.url;
    this._socketReconnectIntervalMs = wsCfg.reconnectIntervalMs ?? 3000;
    this._socketMaxQueueSize = wsCfg.maxQueueSize ?? 500;
    this._connectSocket();
  }

  private _connectSocket() {
    if (!this._socketUrl || this._destroyed) return;
    if (this._socket && (this._socket.readyState === WebSocket.OPEN || this._socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const socket = new WebSocket(this._socketUrl);
    this._socket = socket;

    socket.on("open", () => {
      this._flushSocketQueue();
    });

    socket.on("close", () => {
      if (this._destroyed) return;
      this._scheduleSocketReconnect();
    });

    socket.on("error", () => {
      // Intentionally silent to avoid recursive logging loops.
    });
  }

  private _scheduleSocketReconnect() {
    if (this._socketReconnectTimer || this._destroyed) return;
    this._socketReconnectTimer = setTimeout(() => {
      this._socketReconnectTimer = undefined;
      this._connectSocket();
    }, this._socketReconnectIntervalMs);
  }

  private _queueSocketMessage(payload: string) {
    if (this._socketQueue.length >= this._socketMaxQueueSize) {
      this._socketQueue.shift();
    }
    this._socketQueue.push(payload);
  }

  private _flushSocketQueue() {
    if (!this._socket || this._socket.readyState !== WebSocket.OPEN) return;

    while (this._socketQueue.length > 0) {
      const msg = this._socketQueue.shift();
      if (!msg) break;
      this._socket.send(msg);
    }
  }

  private _sendSocket(payload: string) {
    if (!this._socketUrl) return;

    if (!this._socket || this._socket.readyState !== WebSocket.OPEN) {
      this._queueSocketMessage(payload);
      this._connectSocket();
      return;
    }

    this._socket.send(payload);
  }

  private async _writeToFile(logEntry: LogEntry) {
    if (!this._filePath) return;

    try {
      await mkdir(dirname(this._filePath), { recursive: true });

      const line = this._fileFormat === "json"
        ? `${JSON.stringify(logEntry)}\n`
        : `${logEntry.timestamp} [${logEntry.name}] ${logEntry.level.toUpperCase()} [${logEntry.tag.toUpperCase()}] ${logEntry.message}${logEntry.deltaMs ? ` +${logEntry.deltaMs}ms` : ""}\n`;

      await appendFile(this._filePath, this._stripAnsi(line), "utf8");
    } catch {
      // Ignore transport failures to keep logging non-blocking for app flow.
    }
  }

  private _stripAnsi(input: string): string {
    return input.replace(/\x1B\[[0-9;]*m/g, "");
  }

  // Getters for configuration
  get level() { return this._level; }
  set level(val: LogLevel) { this._level = val; }

  /**
   * Creates a "Child" logger with a fixed tag
   */
  tag(tagName: string): LoggerMethods {
    return {
      trace: (...args: any[]) => this._log("trace", tagName, args),
      debug: (...args: any[]) => this._log("debug", tagName, args),
      info: (...args: any[]) => this._log("info", tagName, args),
      warn: (...args: any[]) => this._log("warn", tagName, args),
      error: (...args: any[]) => this._log("error", tagName, args),
      fatal: (...args: any[]) => this._log("fatal", tagName, args),
      success: (...args: any[]) => this._log("success", tagName, args),
    };
  }

  format(props: LogFormatterProps){
    return this._formatter(props)
  }

  setMeta(meta: Record<string, any>) {
    this._meta = { ...this._meta, ...meta };
  }

  /**
   * Deep clones and masks sensitive keys
   */
  private _redact(data: any): any {
    if (data === null || typeof data !== "object") return data;
    
    // Handle Arrays
    if (Array.isArray(data)) return data.map(item => this._redact(item));

    // Handle Errors (don't redact stack traces, but redact properties)
    if (data instanceof Error) return data;

    const redactedObj: any = {};
    for (const key in data) {
      if (this._redactKeys.has(key.toLowerCase())) {
        redactedObj[key] = "[REDACTED]";
      } else if (typeof data[key] === "object") {
        redactedObj[key] = this._redact(data[key]);
      } else {
        redactedObj[key] = data[key];
      }
    }
    return redactedObj;
  }

  // Core logging logic
  private _log(level: LogLevel, tag: string, args: any[]) {

    if (LOG_LEVELS[level] < LOG_LEVELS[this._level]) return;

    const now = Date.now();
    const last = this._lastLogs.get(tag) || now;
    const delta = now - last;
    this._lastLogs.set(tag, now);

    const fullMessage = args.map(arg => this._formatValue(arg)).join(" ");

    const entry: LogEntry = {
      name: this._name,
      tag,
      level,
      message: fullMessage,
      timestamp: new Date().toISOString(),
      deltaMs: delta,
    };

    logHistory.push(entry);

    if (logHistory.length > 1000) logHistory.shift();

    // Final Output
    const coloredTag = this._getTagColorFn(tag)(`[${tag.toUpperCase()}]`);
    process.stdout.write(this._formatter({
      timestamp: new Date().toLocaleTimeString(),
      name: this._name,
      level,
      levelLabel: this._getLevelLabel(level),
      tag,
      coloredTag,
      message: fullMessage,
      deltaLabel: delta > 0 ? colors.italic(colors.gray(` +${delta}ms`)) : ""
    }));

    void this._writeToFile(entry);
    this._sendSocket(JSON.stringify({
      meta: this._meta,
      ...entry
    }));
    
  }

  private _formatError(err: Error | any): string {
    const name    = colors.bgRed(colors.white(` ${err.name || "Error"} `));
    const code    = err.code || err.errorCode ? colors.yellow(`[${err.code || err.errorCode}]`) : "";
    const message = colors.bold(err.message);

    const stack = err.stack
      ? err.stack
          .split("\n")
          .slice(1)
          .map((line: string) =>
            colors.gray(line.replace(/(\/.*:\d+:\d+)/, (m) => colors.dim(m)))
          )
          .join("\n")
      : "";

    return `\n  ${name} ${code} ${message}\n${stack}\n`;
  }

  private _formatValue(val: any): string {
    if (val instanceof Error) {
      return this._formatError(val);
      // return pc.red(val.stack || val.message);
    }
    if (typeof val === "object") {
      return inspect(this._redact(val), { colors: true, depth: 3, compact: true });
    }
    return String(val);
  }

  private _getLevelLabel(level: LogLevel): string {
    const labels: Record<LogLevel, string> = {
      trace:   colors.gray("TRACE"),
      debug:   colors.blue("DEBUG"),
      info:    colors.green("INFO "),
      warn:    colors.yellow("WARN "),
      error:   colors.red("ERROR"),
      fatal:   colors.bgRed(colors.white("FATAL")),
      success: colors.bgGreen(colors.white("SUCCESS")),
    };
    return labels[level];
  }

  trace(tag: string, ...args: any[]) { this._log("trace", tag, args); }
  debug(tag: string, ...args: any[]) { this._log("debug", tag, args); }
  info(tag: string, ...args: any[])  { this._log("info", tag, args); }
  warn(tag: string, ...args: any[])  { this._log("warn", tag, args); }
  error(tag: string, ...args: any[]) { this._log("error", tag, args); }
  fatal(tag: string, ...args: any[]) { this._log("fatal", tag, args); }
  success(tag: string, ...args: any[]) { this._log("success", tag, args); }

}

export default Logger as unknown as {
  new (config: LoggerConfig) : ScopedLogger
}