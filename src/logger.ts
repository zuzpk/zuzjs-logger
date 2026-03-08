import { inspect } from "node:util";
import pc from "picocolors";
import { LOG_LEVELS, LogEntry, LogFormatter, LoggerConfig, LoggerMethods, LogLevel } from "./types";

export const logHistory: LogEntry[] = [];

export type ScopedLogger = Record<string, any> & Logger;

const defaultFormatter: LogFormatter = ({ timestamp, name, levelLabel, tag, message, deltaLabel }) => {
  const loggerName = pc.bold(pc.blue(name));
  const formattedTag = pc.magenta(`[${tag.toUpperCase()}]`);
  return `${pc.gray(timestamp)} ${loggerName} ${levelLabel} ${formattedTag} ${message}${deltaLabel}\n`;
};

class Logger {

  private _level: LogLevel;
  private _name: string;
  private _lastLogs: Map<string, number> = new Map(); // Track deltas per tag
  private _redactKeys: Set<string>;
  private _formatter: LogFormatter;

  constructor(config: LoggerConfig<any>) {
    if (!config.name) {
      throw new TypeError(`ZuzLogger: \`name\` is required`);
    }

    this._name = config.name;
    this._level = config.level ?? "info";
    this._redactKeys = new Set(config.redact ?? ["password", "token", "secret", "authorization", "key"]);
    this._formatter = config.formatter ?? defaultFormatter;

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

    const loggerName = pc.bold(pc.blue(`[${this._name}]`));

    const timestamp = pc.gray(new Date().toLocaleTimeString());
    const levelLabel = this._getLevelLabel(level);
    const formattedTag = pc.magenta(`[${tag.toUpperCase()}]`);
    const deltaLabel = delta > 0 ? pc.italic(pc.gray(` +${delta}ms`)) : "";

    const fullMessage = args.map(arg => this._formatValue(arg)).join(" ");

    logHistory.push({ 
      tag, 
      level, 
      message: fullMessage, 
      timestamp: new Date().toISOString() 
    });

    if (logHistory.length > 1000) logHistory.shift();

    // Final Output
    process.stdout.write(this._formatter({
      timestamp: new Date().toLocaleTimeString(),
      name: this._name,
      level,
      levelLabel: this._getLevelLabel(level),
      tag: pc.magenta(`[${tag.toUpperCase()}]`),
      message: fullMessage,
      deltaLabel: delta > 0 ? pc.italic(pc.gray(` +${delta}ms`)) : ""
    }));
    
  }

  private _formatError(err: Error | any): string {
    const name = pc.bgRed(pc.white(` ${err.name || 'Error'} `));
    const code = err.code || err.errorCode ? pc.yellow(`[${err.code || err.errorCode}]`) : "";
    const message = pc.bold(err.message);
    
    // Clean up the stack trace: 
    // Remove the first line (the message, since we print it above)
    // Dim the file paths to make the actual function names pop
    const stack = err.stack
      ? err.stack
          .split("\n")
          .slice(1)
          .map((line: string) => {
            // regex to dim paths in brackets or after 'at '
            return pc.gray(line.replace(/(\/.*:\d+:\d+)/, (m) => pc.dim(m)));
          })
          .join("\n")
      : "";

    // Assemble the "Pretty" Error block
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
      trace: pc.gray("TRACE"),
      debug: pc.blue("DEBUG"),
      info: pc.green("INFO "),
      warn: pc.yellow("WARN "),
      error: pc.red("ERROR"),
      fatal: pc.bgRed(pc.white("FATAL")),
      success: pc.bgGreen(pc.white("SUCCESS")),
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