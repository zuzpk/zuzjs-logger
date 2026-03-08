import Logger from "./logger";
import { LoggerConfig, ZuzLogger } from "./types";

export type * from "./types";

const createLogger = <T extends string>(config: LoggerConfig<T>): ZuzLogger<T> => {
  return new Logger(config) as any as ZuzLogger<T>;
};

export {
  createLogger
};
