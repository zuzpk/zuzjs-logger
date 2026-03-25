/**
 * Terminal color utilities built on ANSI/VT100 escape sequences (ECMA-48 standard).
 * Zero external dependencies. Supports 16-color, 256-color (ansi256), and 24-bit truecolor (rgb/hex).
 */

// Color support detection

const colorEnabled: boolean = (() => {
  if (typeof process === "undefined") return false;
  const { env, argv, stdout, platform } = process;
  if (env.NO_COLOR  || argv.includes("--no-color")) return false;
  if (env.FORCE_COLOR || argv.includes("--color"))   return true;
  return platform === "win32" || (stdout?.isTTY && env.TERM !== "dumb") || !!env.CI;
})();

// ANSI sequence builder

export type ColorFn = (text: unknown) => string;

/**
 * Wraps `text` with ANSI open/close codes.
 * When the text itself already contains the close code (e.g. a nested style),
 * we re-insert the open code after each occurrence so the outer style isn't lost.
 * `reopenAs` defaults to `open`; bold/dim need a distinct reopen sequence.
 */
const seq = (open: string, close: string, reopenAs = open): ColorFn =>
  (text: unknown): string => {
    const s = String(text);
    let at = s.indexOf(close, open.length);
    if (at === -1) return `${open}${s}${close}`;

    // Re-open the style after every embedded close sequence
    let out = "";
    let cur = 0;
    do {
      out += s.slice(cur, at) + close + reopenAs;
      cur  = at + close.length;
      at   = s.indexOf(close, cur);
    } while (at !== -1);
    return `${open}${out}${s.slice(cur)}${close}`;
  };

const passthrough: ColorFn = (text) => String(text);

// Palette builder

const buildPalette = (enabled = colorEnabled) => {
  const c = (open: string, close: string, reopenAs?: string): ColorFn =>
    enabled ? seq(open, close, reopenAs) : passthrough;

  // Truecolor (24-bit) — not in most zero-dep color libs
  const rgb    = (r: number, g: number, b: number): ColorFn =>
    enabled ? seq(`\x1b[38;2;${r};${g};${b}m`, "\x1b[39m") : passthrough;

  const bgRgb  = (r: number, g: number, b: number): ColorFn =>
    enabled ? seq(`\x1b[48;2;${r};${g};${b}m`, "\x1b[49m") : passthrough;

  // 256-color palette
  const ansi256   = (code: number): ColorFn =>
    enabled ? seq(`\x1b[38;5;${code}m`, "\x1b[39m") : passthrough;

  const bgAnsi256 = (code: number): ColorFn =>
    enabled ? seq(`\x1b[48;5;${code}m`, "\x1b[49m") : passthrough;

  // Hex → rgb helper (e.g. "#ff6600" or "ff6600")
  const hex = (value: string): ColorFn => {
    const h = value.replace(/^#/, "");
    const n = parseInt(h.length === 3 ? h.split("").map((x) => x + x).join("") : h, 16);
    return rgb((n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff);
  };

  const bgHex = (value: string): ColorFn => {
    const h = value.replace(/^#/, "");
    const n = parseInt(h.length === 3 ? h.split("").map((x) => x + x).join("") : h, 16);
    return bgRgb((n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff);
  };

  return {
    enabled,

    // Text modifiers
    reset:         c("\x1b[0m",  "\x1b[0m"),
    bold:          c("\x1b[1m",  "\x1b[22m", "\x1b[22m\x1b[1m"),
    dim:           c("\x1b[2m",  "\x1b[22m", "\x1b[22m\x1b[2m"),
    italic:        c("\x1b[3m",  "\x1b[23m"),
    underline:     c("\x1b[4m",  "\x1b[24m"),
    inverse:       c("\x1b[7m",  "\x1b[27m"),
    hidden:        c("\x1b[8m",  "\x1b[28m"),
    strikethrough: c("\x1b[9m",  "\x1b[29m"),

    // Standard foreground colors
    black:   c("\x1b[30m", "\x1b[39m"),
    red:     c("\x1b[31m", "\x1b[39m"),
    green:   c("\x1b[32m", "\x1b[39m"),
    yellow:  c("\x1b[33m", "\x1b[39m"),
    blue:    c("\x1b[34m", "\x1b[39m"),
    magenta: c("\x1b[35m", "\x1b[39m"),
    cyan:    c("\x1b[36m", "\x1b[39m"),
    white:   c("\x1b[37m", "\x1b[39m"),
    gray:    c("\x1b[90m", "\x1b[39m"),

    // Bright foreground colors
    blackBright:   c("\x1b[90m", "\x1b[39m"),
    redBright:     c("\x1b[91m", "\x1b[39m"),
    greenBright:   c("\x1b[92m", "\x1b[39m"),
    yellowBright:  c("\x1b[93m", "\x1b[39m"),
    blueBright:    c("\x1b[94m", "\x1b[39m"),
    magentaBright: c("\x1b[95m", "\x1b[39m"),
    cyanBright:    c("\x1b[96m", "\x1b[39m"),
    whiteBright:   c("\x1b[97m", "\x1b[39m"),

    // Standard background colors
    bgBlack:   c("\x1b[40m", "\x1b[49m"),
    bgRed:     c("\x1b[41m", "\x1b[49m"),
    bgGreen:   c("\x1b[42m", "\x1b[49m"),
    bgYellow:  c("\x1b[43m", "\x1b[49m"),
    bgBlue:    c("\x1b[44m", "\x1b[49m"),
    bgMagenta: c("\x1b[45m", "\x1b[49m"),
    bgCyan:    c("\x1b[46m", "\x1b[49m"),
    bgWhite:   c("\x1b[47m", "\x1b[49m"),

    // Bright background colors
    bgBlackBright:   c("\x1b[100m", "\x1b[49m"),
    bgRedBright:     c("\x1b[101m", "\x1b[49m"),
    bgGreenBright:   c("\x1b[102m", "\x1b[49m"),
    bgYellowBright:  c("\x1b[103m", "\x1b[49m"),
    bgBlueBright:    c("\x1b[104m", "\x1b[49m"),
    bgMagentaBright: c("\x1b[105m", "\x1b[49m"),
    bgCyanBright:    c("\x1b[106m", "\x1b[49m"),
    bgWhiteBright:   c("\x1b[107m", "\x1b[49m"),

    // Extended color support
    /** True 24-bit foreground color. e.g. `colors.rgb(255, 100, 0)("text")` */
    rgb,
    /** True 24-bit background color. */
    bgRgb,
    /** CSS hex foreground. e.g. `colors.hex("#ff6400")("text")` */
    hex,
    /** CSS hex background. */
    bgHex,
    /** ANSI 256-color foreground (0–255). */
    ansi256,
    /** ANSI 256-color background (0–255). */
    bgAnsi256,
  };
};

export type Colors   = ReturnType<typeof buildPalette>;
export type ColorName = Exclude<keyof Colors, "enabled" | "rgb" | "bgRgb" | "hex" | "bgHex" | "ansi256" | "bgAnsi256">;

export { buildPalette };

const colors = buildPalette();
export default colors;
