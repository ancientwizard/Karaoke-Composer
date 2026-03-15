import { describe, expect, it } from "@jest/globals";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { LrcFileParser } from "@/CDGSharp/convert/lrc/LrcFileParser";
import { KaraokeCommandPlanner } from "@/CDGSharp/convert/planning/KaraokeCommandPlanner";
import { KaraokePlan } from "@/CDGSharp/convert/planning/KaraokeCommandModels";

interface LayoutMetrics {
  lineCounts: number[];
  totalLines: number;
  pageCount: number;
  orphanPageCount: number;
  shortPageCount: number;
  oversizedPageCount: number;
  asymmetrySum: number;
  jaggedTransitions: number;
  highLowBreakCount: number;
}

interface LayoutGrade {
  score: number;
  letter: "A" | "B" | "C" | "D" | "F";
  reasons: string[];
}

interface ScenarioAnalysis {
  fontSize: number;
  plan: KaraokePlan;
  metrics: LayoutMetrics;
  grade: LayoutGrade;
}

const buildMetrics = (plan: KaraokePlan): LayoutMetrics => {
  const lineCounts = plan.pages.map((page) => page.lines.length);
  const totalLines = lineCounts.reduce((sum, value) => sum + value, 0);
  const pageCount = lineCounts.length;
  const average = pageCount === 0 ? 0 : totalLines / pageCount;

  const orphanPageCount = lineCounts.filter((count) => count === 1).length;
  const shortPageCount = lineCounts.filter((count) => count === 2).length;
  const oversizedPageCount = lineCounts.filter((count) => count > 6).length;

  const asymmetrySum = lineCounts.reduce((sum, count) => sum + Math.abs(count - average), 0);

  let jaggedTransitions = 0;
  let highLowBreakCount = 0;

  for (let index = 1; index < lineCounts.length; index += 1) {
    const previous = lineCounts[index - 1] ?? 0;
    const current = lineCounts[index] ?? 0;
    const diff = Math.abs(previous - current);

    if (diff >= 2) {
      jaggedTransitions += 1;
    }

    if (previous >= 5 && current <= 2) {
      highLowBreakCount += 1;
    }
  }

  return {
    lineCounts,
    totalLines,
    pageCount,
    orphanPageCount,
    shortPageCount,
    oversizedPageCount,
    asymmetrySum,
    jaggedTransitions,
    highLowBreakCount
  };
};

const gradeLayout = (metrics: LayoutMetrics): LayoutGrade => {
  let score = 100;
  const reasons: string[] = [];

  if (metrics.orphanPageCount > 0) {
    score -= metrics.orphanPageCount * 10;
    reasons.push(`${metrics.orphanPageCount} orphan page(s) with one line`);
  }

  if (metrics.shortPageCount > 0) {
    score -= metrics.shortPageCount * 4;
    reasons.push(`${metrics.shortPageCount} short page(s) with two lines`);
  }

  if (metrics.oversizedPageCount > 0) {
    score -= metrics.oversizedPageCount * 20;
    reasons.push(`${metrics.oversizedPageCount} oversized page(s) above six lines`);
  }

  if (metrics.highLowBreakCount > 0) {
    score -= metrics.highLowBreakCount * 10;
    reasons.push(`${metrics.highLowBreakCount} high→low screen break(s) (5+ to <=2)`);
  }

  score -= Math.floor(metrics.asymmetrySum);
  score -= metrics.jaggedTransitions * 4;

  score = Math.max(0, Math.min(100, score));

  const letter: LayoutGrade["letter"] =
    score >= 90
      ? "A"
      : score >= 80
        ? "B"
        : score >= 70
          ? "C"
          : score >= 60
            ? "D"
            : "F";

  if (reasons.length === 0) {
    reasons.push("balanced page distribution with no major outliers");
  }

  return { score, letter, reasons };
};

const summarizePlan = (analysis: ScenarioAnalysis): string => {
  const lines = [
    `=== Font Size ${analysis.fontSize} ===`,
    `Grade: ${analysis.grade.letter} (${analysis.grade.score}/100)`,
    `Page count: ${analysis.metrics.pageCount}`,
    `Line distribution: [${analysis.metrics.lineCounts.join(", ")}]`,
    `Metrics: orphan=${analysis.metrics.orphanPageCount}, short=${analysis.metrics.shortPageCount}, oversized=${analysis.metrics.oversizedPageCount}, jagged=${analysis.metrics.jaggedTransitions}, asymmetry=${analysis.metrics.asymmetrySum.toFixed(2)}`,
    `Reasons: ${analysis.grade.reasons.join("; ")}`,
    ""
  ];

  analysis.plan.pages.forEach((page, pageIndex) => {
    lines.push(`Screen ${pageIndex + 1} @ ${page.startTimeMs}ms (${page.lines.length} lines)`);
    page.lines.forEach((line, lineIndex) => {
      const text = line.map((part) => part.text).join("");
      lines.push(`  ${lineIndex + 1}. ${text}`);
    });
    lines.push("");
  });

  return lines.join("\n");
};

const analyzeLayoutForFont = (lrcContent: string, fontSize: number): ScenarioAnalysis => {
  const planner = new KaraokeCommandPlanner();
  const lrc = LrcFileParser.parseFileContent(lrcContent);

  const plan = planner.createPlan(lrc, {
    allBreaks: false,
    wrapGracePx: 5,
    maxLines: 6,
    defaultFontName: "DejaVu Sans",
    defaultFontSize: fontSize,
    defaultFontStyle: "regular"
  });

  const metrics = buildMetrics(plan);
  const grade = gradeLayout(metrics);

  return {
    fontSize,
    plan,
    metrics,
    grade
  };
};

describe("Karaoke layout analysis", () => {
  it("generates graded layout report for font sizes 15 and 17", () => {
    const lrcPath = resolve(process.cwd(), "music/meet_me_in_november.lrc");
    const lrcContent = readFileSync(lrcPath, "utf8");

    const analyses = [15, 17].map((fontSize) => analyzeLayoutForFont(lrcContent, fontSize));

    const report = [
      "# Karaoke Layout Analysis (clear-mode planning baseline)",
      "",
      ...analyses.flatMap((analysis) => [summarizePlan(analysis), ""]) 
    ].join("\n");

    const outPath = resolve(process.cwd(), "tmp/layout-analysis.clear.txt");
    writeFileSync(outPath, `${report}\n`, "utf8");

    expect(analyses).toHaveLength(2);
    expect(analyses.every((analysis) => analysis.metrics.oversizedPageCount === 0)).toBe(true);
    expect(analyses.every((analysis) => analysis.grade.score >= 50)).toBe(true);
    expect(report).toContain("Font Size 15");
    expect(report).toContain("Font Size 17");
  });
});
