import colors, { buildPalette } from "./colors";
import Logger from "./logger";
import LogIcons from "./symbols";
import { LoggerConfig, ZuzLogger } from "./types";

export type { ColorFn, ColorName, Colors } from "./colors";
export type * from "./types";

const createLogger = <T extends string>(config: LoggerConfig<T>): ZuzLogger<T> => {
  return new Logger(config) as any as ZuzLogger<T>;
};

export { buildPalette, colors, createLogger, LogIcons };

