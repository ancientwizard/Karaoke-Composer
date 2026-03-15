/*
 * convert-lrc module features.
 * Contains implementation for convert lrc.
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { CdgConvertLrcFlow } from "@/CDGSharp/convert/CdgConvertLrcFlow";

const DEFAULT_BG_COLOR = "#008";
const DEFAULT_TEXT_COLOR = "#fff";
const DEFAULT_SUNG_TEXT_COLOR = "#ff0";
const DEFAULT_FONT = "DejaVu Sans";
const DEFAULT_FONT_SIZE = 17;

const usageText = [
  "Usage:",
  "  npm run convert:lrc:ts -- <input.lrc> <output.cdg> [options]",
  "",
  "Options:",
  `  --bg-color <color>           Background color (default: ${DEFAULT_BG_COLOR})`,
  `  --text-color <color>         Lyrics text color (default: ${DEFAULT_TEXT_COLOR})`,
  `  --sung-text-color <color>    Sung/highlight color (default: ${DEFAULT_SUNG_TEXT_COLOR})`,
  `  --font <name>|/path/font.ttf Font name or file path (default: '${DEFAULT_FONT}')`,
  `  --font-size <n>              Font size in pixels (default: ${DEFAULT_FONT_SIZE})`,
  "  --font-style normal|bold",
  "  --modify-timestamps 0.25",
  "  --uppercase-text",
  "  --wrap-grace-px 5",
  "  --all-breaks",
  "  --max-lines 5",
  "  --debug-timing-json tmp/timing.json",
  "  --debug-scheduling-log tmp/scheduling.log",
  "  --transition-mode clear|trailing-wipe",
  "  --trailing-wipe-delay-ms 2000",
  "  --trailing-wipe-region-ready-threshold 0.8",
  "  -h, --help"
].join("\n");

class CliUsageError extends Error {}

interface CliOptions {
  input: string;
  output: string;
  bgColor?: string;
  textColor?: string;
  sungTextColor?: string;
  font?: string;
  fontSize?: number;
  fontStyle?: "regular" | "bold";
  uppercaseText?: boolean;
  modifyTimestamps?: number;
  wrapGracePx?: number;
  allBreaks?: boolean;
  maxLines?: number;
  debugTimingJsonPath?: string;
  debugSchedulingLogPath?: string;
  transitionMode?: "clear" | "trailing-wipe";
  trailingWipeDelayMs?: number;
  trailingWipeRegionReadyThreshold?: number;
}

const printUsage = (): void => {
  console.log(usageText);
};

const parseArgs = (argv: string[]): CliOptions | null => {
  if (argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    return null;
  }

  if (argv.length < 2) {
    throw new CliUsageError("Missing required arguments: <input.lrc> <output.cdg>");
  }

  const [input, output, ...rest] = argv;
  const options: CliOptions = {
    input,
    output
  };

  for (let index = 0; index < rest.length; index += 1) {
    const flag = rest[index];

    switch (flag) {
      case "--bg-color":
        options.bgColor = rest[index + 1];
        index += 1;
        break;
      case "--text-color":
        options.textColor = rest[index + 1];
        index += 1;
        break;
      case "--sung-text-color":
        options.sungTextColor = rest[index + 1];
        index += 1;
        break;
      case "--font":
        options.font = rest[index + 1];
        index += 1;
        break;
      case "--font-size":
        options.fontSize = Number.parseInt(rest[index + 1] ?? "", 10);
        index += 1;
        break;
      case "--font-style": {
        const style = rest[index + 1]?.toLowerCase();
        if (style === "regular" || style === "normal") {
          options.fontStyle = "regular";
        } else if (style === "bold") {
          options.fontStyle = "bold";
        } else {
          throw new CliUsageError(`Unsupported --font-style value: ${style}`);
        }
        index += 1;
        break;
      }
      case "--wrap-grace-px":
        options.wrapGracePx = Number.parseInt(rest[index + 1] ?? "", 10);
        index += 1;
        break;
      case "--modify-timestamps":
        options.modifyTimestamps = Number.parseFloat(rest[index + 1] ?? "");
        index += 1;
        break;
      case "--uppercase-text":
        options.uppercaseText = true;
        break;
      case "--all-breaks":
        options.allBreaks = true;
        break;
      case "--max-lines":
        options.maxLines = Number.parseInt(rest[index + 1] ?? "", 10);
        index += 1;
        break;
      case "--debug-timing-json":
        options.debugTimingJsonPath = resolve(rest[index + 1] ?? "");
        index += 1;
        break;
      case "--debug-scheduling-log":
        options.debugSchedulingLogPath = resolve(rest[index + 1] ?? "");
        index += 1;
        break;
      case "--transition-mode": {
        const mode = rest[index + 1];
        if (mode === "clear" || mode === "trailing-wipe") {
          options.transitionMode = mode;
        } else {
          throw new CliUsageError(`Unsupported --transition-mode value: ${mode}`);
        }
        index += 1;
        break;
      }
      case "--trailing-wipe-delay-ms":
        options.trailingWipeDelayMs = Number.parseInt(rest[index + 1] ?? "", 10);
        index += 1;
        break;
      case "--trailing-wipe-region-ready-threshold":
        options.trailingWipeRegionReadyThreshold = Number.parseFloat(rest[index + 1] ?? "");
        index += 1;
        break;
      default:
        throw new CliUsageError(`Unknown option: ${flag}`);
    }
  }

  return options;
};

const main = (): void => {
  const options = parseArgs(process.argv.slice(2));
  if (options === null) {
    return;
  }

  const flow = new CdgConvertLrcFlow();

  const bytes = flow.execute({
    filePath: resolve(options.input),
    bgColor: options.bgColor ?? DEFAULT_BG_COLOR,
    textColor: options.textColor ?? DEFAULT_TEXT_COLOR,
    sungTextColor: options.sungTextColor ?? DEFAULT_SUNG_TEXT_COLOR,
    font: options.font ?? DEFAULT_FONT,
    fontSize: options.fontSize ?? DEFAULT_FONT_SIZE,
    fontStyle: options.fontStyle,
    uppercaseText: options.uppercaseText,
    modifyTimestamps: options.modifyTimestamps,
    wrapGracePx: options.wrapGracePx,
    allBreaks: options.allBreaks,
    maxLines: options.maxLines,
    debugTimingJsonPath: options.debugTimingJsonPath,
    debugSchedulingLogPath: options.debugSchedulingLogPath,
    transitionMode: options.transitionMode,
    trailingWipeDelayMs: options.trailingWipeDelayMs,
    trailingWipeRegionReadyThreshold: options.trailingWipeRegionReadyThreshold
  });

  const outputPath = resolve(options.output);
  writeFileSync(outputPath, bytes);
  console.log(`Wrote ${bytes.length} bytes to ${outputPath}`);
};

try {
  main();
} catch (error) {
  if (error instanceof CliUsageError) {
    console.error(`Error: ${error.message}`);
    console.error("");
    printUsage();
    process.exitCode = 2;
  } else if (error instanceof Error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  } else {
    console.error("Error: unknown failure");
    process.exitCode = 1;
  }
}

// END