import colors from "./colors";

/**
 * Pre-colored log symbols for use in custom formatters and log messages.
 * Each icon is wrapped with semantic color for context cues.
 */
const LogIcons = {
  // Status indicators
  success:     colors.green("✓"),
  error:       colors.red("✗"),
  warning:     colors.yellow("⚠"),
  info:        colors.blue("ℹ"),
  debug:       colors.cyan("◆"),
  pending:     colors.gray("◌"),

  // Check marks & marks
  check:       colors.greenBright("✔"),
  cross:       colors.redBright("✖"),
  plus:        colors.green("+"),
  minus:       colors.red("−"),

  // Direction & movement
  arrowRight:  colors.gray("→"),
  arrowLeft:   colors.gray("←"),
  arrowUp:     colors.gray("↑"),
  arrowDown:   colors.gray("↓"),
  doubleArrowRight: colors.gray("⇒"),
  doubleArrowLeft:  colors.gray("⇐"),
  hookArrowRight:   colors.gray("↪"),
  hookArrowLeft:    colors.gray("↩"),

  // Triangles & diamonds
  triangleUp:   colors.gray("▲"),
  triangleDown: colors.gray("▼"),
  diamondSmall: colors.magenta("◆"),
  circle:       colors.gray("●"),
  dot:          colors.gray("·"),

  // Special symbols
  ellipsis:     colors.gray("…"),
  sparkles:     colors.yellowBright("✨"),
  star:         colors.yellowBright("★"),
  lightning:    colors.yellowBright("⚡"),
  fire:         colors.redBright("🔥"),
  lock:         colors.red("🔒"),
  unlock:       colors.green("🔓"),
  link:         colors.blue("🔗"),
  code:         colors.cyan("{ }"),
  timer:        colors.cyan("⏱"),
  clock:        colors.cyan("🕐"),

  // Flow control
  pause:        colors.yellow("⏸"),
  play:         colors.green("▶"),
  skip:         colors.gray("⏭"),
  fastForward:  colors.cyan("⏩"),

  // Legacy (kept for backwards compat)
  CheckMark:                colors.green("✓"),
  CrossMark:                colors.red("✗"),
  InformationSource:        colors.blue("ℹ"),
  Sparkles:                 colors.yellowBright("✨"),
  BlackUpPointingTriangle:  colors.gray("▲"),
  BlackDownPointingTriangle: colors.gray("▼"),
  WhiteUpPointingTriangle:  colors.gray("△"),
  WhiteDownPointingTriangle: colors.gray("▽"),
  Ellipsis:                 colors.gray("…"),
  ArrowRight:               colors.gray("→"),
  ArrowLeft:                colors.gray("←"),
  ArrowUp:                  colors.gray("↑"),
  ArrowDown:                colors.gray("↓"),
  TwoHeadedArrowRight:      colors.gray("⇄"),
  TwoHeadedArrowLeft:       colors.gray("⇆"),
  TwoHeadedArrowUp:         colors.gray("⇅"),
  TwoHeadedArrowDown:       colors.gray("⇇"),
  HookLeftArrow:            colors.gray("↩"),
  HookRightArrow:           colors.gray("↪"),
  LeftwardsArrowWithHook:   colors.gray("↩"),
  RightwardsArrowWithHook:  colors.gray("↪"),
  UpwardsArrowWithHook:     colors.gray("↰"),
  DownwardsArrowWithHook:   colors.gray("↲"),
  CircleArrowRight:         colors.gray("↻"),
  CircleArrowLeft:          colors.gray("↺"),
  Therefore:                colors.gray("∴"),
  Because:                  colors.gray("∵"),
};

export default LogIcons;