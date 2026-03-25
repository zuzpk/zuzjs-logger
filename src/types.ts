export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal" | "success"

export interface LogEntry {
  name?: string;
  tag: string;
  level: LogLevel;
  message: string;
  timestamp: string;
  deltaMs?: number;
  data?: any[];
  stack?: string;
  meta?: Record<string, any>;
}

export type FileLogFormat = "text" | "json";

export interface FileLoggerConfig {
  path: string;
  format?: FileLogFormat;
}

export interface WebSocketLoggerConfig {
  url: string;
  reconnectIntervalMs?: number;
  maxQueueSize?: number;
}

export interface LoggerMethods {
  trace: (...args: any[]) => void;
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  fatal: (...args: any[]) => void;
  success: (...args: any[]) => void;
}

export const LOG_LEVELS: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
  success: 6
};

export interface LoggerConfig<T extends string = string> {
  name: string;
  level?: LogLevel;
  /** 
   * Pre-define tags 
   * Use it like log.boot.info
  */
  tags?: T[];
  /** Keys to mask in objects (e.g., ['password', 'token', 'secret']) */
  redact?: string[];
  formatter?: LogFormatter;
  /**
   * Write logs to a local file.
   * String shorthand is treated as `{ path: string }`.
   */
  file?: string | FileLoggerConfig;
  /**
   * Send logs to a websocket URL.
   * String shorthand is treated as `{ url: string }`.
   */
  websocket?: string | WebSocketLoggerConfig;
}

export interface ILogger {
  level: LogLevel;
  tag(tagName: string): LoggerMethods;
  trace(tag: string, ...args: any[]): void;
  debug(tag: string, ...args: any[]): void;
  info(tag: string, ...args: any[]): void;
  warn(tag: string, ...args: any[]): void;
  error(tag: string, ...args: any[]): void;
  fatal(tag: string, ...args: any[]): void;
  success(tag: string, ...args: any[]): void;
}

/**
 * Merges the Logger instance with the dynamic Tags
 */
export type ZuzLogger<T extends string> = ILogger & {
  [K in T]: LoggerMethods;
} & { [key: string]: any }; 

export interface LogFormatterProps {
  timestamp: string;
  name: string;
  level: LogLevel;
  levelLabel: string;
  tag: string;
  message: string;
  deltaLabel: string;
}

export type LogFormatter = (props: LogFormatterProps) => string;