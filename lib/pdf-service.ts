import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { AthleteReport } from "@/services/reporting.service";
import type { AssessmentRecord } from "@/types/assessment";
import type { HabitRecord } from "@/types/habit-record";
import { athleteIqPillars, getCoachRecommendation, getReadinessMode, readinessChecklist } from "@/lib/readiness-model";
import { getCompatiblePillarScore, getCompatibleReadinessState } from "@/lib/assessment-compat";
import { getHabitScoreSummary } from "@/lib/athlete-habits";
import { formatScore } from "./utils";

interface JsPDFWithAutoTable extends jsPDF {
  lastAutoTable?: {
    finalY: number;
  };
}

type TFunction = (key: string, values?: Record<string, string | number>) => string;
type PillarKey = (typeof athleteIqPillars)[number]["key"];

// Localized labels for the twin-based reports (provided by the caller so the
// PdfService stays locale-agnostic). Guidance is labelled as rule-based, never AI.
export type TwinReportLabels = {
  title: string;
  generatedAt: string;
  dateRange: string;
  summary: string;
  keyMetrics: string;
  metric: string;
  value: string;
  guidance: string;
  coachNotes: string;
  sources: string;
  none: string;
  teamTitle: string;
  athleteCount: string;
};

type Palette = {
  ink: [number, number, number];
  muted: [number, number, number];
  line: [number, number, number];
  panel: [number, number, number];
  panelSoft: [number, number, number];
  accent: [number, number, number];
  accentSoft: [number, number, number];
  positive: [number, number, number];
  caution: [number, number, number];
  danger: [number, number, number];
  white: [number, number, number];
};

const palette: Palette = {
  ink: [20, 32, 51],
  muted: [92, 106, 130],
  line: [214, 225, 240],
  panel: [244, 248, 255],
  panelSoft: [250, 252, 255],
  accent: [37, 99, 235],
  accentSoft: [232, 241, 255],
  positive: [5, 150, 105],
  caution: [217, 119, 6],
  danger: [220, 38, 38],
  white: [255, 255, 255]
};

const pillarColors: Record<PillarKey, [number, number, number]> = {
  physical_pillar: [15, 118, 110],
  mental_pillar: [79, 70, 229],
  sport_brain_pillar: [124, 58, 237],
};

const REPORT_MAX_SCORE = 5;
let brandImageDataUrlPromise: Promise<string | null> | null = null;
let brandImageDataUrl: string | null = null;

export const PdfService = {
  async ensureBrandImage(): Promise<string | null> {
    if (!brandImageDataUrlPromise) {
      brandImageDataUrlPromise = fetch("/images/habigoal_logo.png")
        .then((res) => res.arrayBuffer())
        .then((buffer) => {
          let binary = "";
          const bytes = new Uint8Array(buffer);
          const chunkSize = 0x8000;
          for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, i + chunkSize);
            binary += String.fromCharCode(...chunk);
          }
          brandImageDataUrl = `data:image/png;base64,${btoa(binary)}`;
          return brandImageDataUrl;
        })
        .catch(() => {
          brandImageDataUrl = null;
          return null;
        });
    }

    return brandImageDataUrlPromise;
  },

  async ensureUnicodeFont(doc: jsPDF): Promise<void> {
    const fontName = "ArialUnicode";
    if (doc.getFontList()[fontName]) {
      doc.setFont(fontName, "normal");
      return;
    }

    const base64 = await fetch("/fonts/Arial.ttf")
      .then((res) => res.arrayBuffer())
      .then((buffer) => {
        let binary = "";
        const bytes = new Uint8Array(buffer);
        const chunkSize = 0x8000;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.subarray(i, i + chunkSize);
          binary += String.fromCharCode(...chunk);
        }
        return btoa(binary);
      })
      .catch(() => "");

    if (!base64) {
      return;
    }

    doc.addFileToVFS("Arial.ttf", base64);
    doc.addFont("Arial.ttf", fontName, "normal");
    doc.setFont(fontName, "normal");
  },

  async generateOriginalReport(record: AssessmentRecord, t: TFunction, tc: TFunction, ts: TFunction, tr?: TFunction, history: AssessmentRecord[] = [], habitHistory: HabitRecord[] = []): Promise<void> {
    await this.generateModernReport(record, t, tc, ts, tr ?? t, history, habitHistory);
  },

  async generateMapReport(record: AssessmentRecord, t: TFunction, tc: TFunction, ts: TFunction, tr: TFunction, history: AssessmentRecord[] = [], habitHistory: HabitRecord[] = []): Promise<void> {
    await this.generateModernReport(record, t, tc, ts, tr, history, habitHistory);
  },

  async generateModernReport(record: AssessmentRecord, t: TFunction, tc: TFunction, ts: TFunction, tr: TFunction, history: AssessmentRecord[] = [], habitHistory: HabitRecord[] = []): Promise<void> {
    const doc = new jsPDF({ unit: "mm", format: "a4" }) as JsPDFWithAutoTable;
    await this.ensureUnicodeFont(doc);
    await this.ensureBrandImage();

    const trendData = this.getSortedHistory(record, history);
    const baseline = trendData[0] ?? record;
    const latest = trendData[trendData.length - 1] ?? record;
    const latestReadiness = getCompatibleReadinessState(latest);
    const latestReadinessChecks = latestReadiness.count;
    const readinessMode = getReadinessMode(latestReadinessChecks, latestReadiness.total);
    const pillarRows = athleteIqPillars.map((pillar) => {
      const current = this.getPillarScore(latest, pillar.key);
      const starting = this.getPillarScore(baseline, pillar.key);
      return {
        key: pillar.key,
        label: ts(pillar.title),
        current,
        baseline: starting,
        delta: current - starting
      };
    });
    const recommendation = getCoachRecommendation(
      pillarRows.map((pillar) => ({ key: pillar.key, score: pillar.current })),
      latestReadinessChecks
    );
    const operatingSummary = this.getOperatingSummary(latest, trendData, habitHistory, ts, tr);

    this.drawCoverPage(doc, latest, tc, tr, trendData.length, latestReadinessChecks, latestReadiness.total);
    this.drawExecutiveSummaryPage(doc, latest, baseline, pillarRows, recommendation, readinessMode, latestReadinessChecks, latestReadiness.total, t, tc, tr);
    this.drawOperatingSnapshotPage(doc, latest.child.name, operatingSummary, tc, tr);
    this.drawPerformanceProfilePage(doc, latest, pillarRows, t, ts, tr);
    this.drawTrendPage(doc, trendData, latest, baseline, ts, tr);
    this.drawNotesPage(doc, latest, recommendation, t, tc, ts, tr);
    this.drawFooters(doc);

    const safeName = (latest.child.name || "athlete").replace(/[^\w-]+/g, "_");
    doc.save(`${safeName}_${tr("fileStem")}.pdf`);
  },

  // Twin-based athlete report (services/reporting.service AthleteReport shape).
  async generateTwinReport(report: AthleteReport, labels: TwinReportLabels, athleteName?: string): Promise<void> {
    const doc = new jsPDF({ unit: "mm", format: "a4" }) as JsPDFWithAutoTable;
    await this.ensureUnicodeFont(doc);
    await this.ensureBrandImage();
    this.drawTwinReportSection(doc, report, labels, athleteName ?? report.athleteId, true);
    this.drawFooters(doc);
    const safe = (athleteName ?? report.athleteId).replace(/[^\w-]+/g, "_");
    doc.save(`${safe}_${report.reportDate.slice(0, 10)}.pdf`);
  },

  // Twin-based team report: cover page + one section per athlete.
  async generateTeamTwinReport(
    team: { generatedAt: string; athleteCount: number; reports: AthleteReport[] },
    labels: TwinReportLabels,
    nameById: Record<string, string> = {}
  ): Promise<void> {
    const doc = new jsPDF({ unit: "mm", format: "a4" }) as JsPDFWithAutoTable;
    await this.ensureUnicodeFont(doc);
    await this.ensureBrandImage();

    this.drawPageHeader(doc, labels.teamTitle, "");
    this.drawContextGrid(doc, 20, 40, [
      [labels.generatedAt, team.generatedAt.slice(0, 10)],
      [labels.athleteCount, String(team.athleteCount)],
    ]);

    for (const report of team.reports) {
      this.drawTwinReportSection(doc, report, labels, nameById[report.athleteId] ?? report.athleteId, false);
    }
    this.drawFooters(doc);
    doc.save(`team-report_${team.generatedAt.slice(0, 10)}.pdf`);
  },

  drawTwinReportSection(
    doc: JsPDFWithAutoTable,
    report: AthleteReport,
    labels: TwinReportLabels,
    athleteName: string,
    isFirst: boolean
  ) {
    if (!isFirst) doc.addPage();
    this.drawPageHeader(doc, labels.title, athleteName);
    let y = 40;

    this.drawContextGrid(doc, 20, y, [
      [labels.generatedAt, report.reportDate.slice(0, 10)],
      [labels.dateRange, `${report.dateRange.from} – ${report.dateRange.to}`],
      [labels.summary, report.summary],
    ]);
    y = (doc.lastAutoTable?.finalY ?? y) + 8;

    this.drawSectionTitle(doc, 20, y, labels.keyMetrics);
    y += 6;
    autoTable(doc, {
      startY: y,
      margin: { left: 20, right: 20 },
      head: [[labels.metric, labels.value]],
      body: Object.entries(report.keyMetrics).map(([key, val]) => [key, String(val)]),
      styles: { font: "ArialUnicode", fontSize: 9, textColor: palette.ink, cellPadding: 2.5 },
      headStyles: { fillColor: palette.panel, textColor: palette.ink, lineColor: palette.line, lineWidth: 0.2 },
      bodyStyles: { lineColor: palette.line, lineWidth: 0.2 },
    });
    y = (doc.lastAutoTable?.finalY ?? y) + 8;

    y = this.drawTwinNarrative(doc, y, 170, labels.guidance, report.guidanceCommentary, labels);
    y = this.drawTwinNarrative(doc, y, 170, labels.coachNotes, report.coachNotes.length ? report.coachNotes.join("\n") : labels.none, labels);
    this.drawTwinNarrative(doc, y, 170, labels.sources, report.sourceDataNotes.length ? report.sourceDataNotes.join("\n") : labels.none, labels);
  },

  drawTwinNarrative(doc: JsPDFWithAutoTable, y: number, w: number, label: string, body: string, labels: TwinReportLabels): number {
    const lines = doc.splitTextToSize(body || labels.none, w - 8) as string[];
    const height = Math.max(20, 14 + lines.length * 4.4);
    if (y + height > 280) {
      doc.addPage();
      this.drawPageHeader(doc, labels.title, "");
      y = 40;
    }
    this.drawNarrativeBlock(doc, 20, y, w, height, label, body || labels.none);
    return y + height + 6;
  },

  drawCoverPage(doc: jsPDF, record: AssessmentRecord, tc: TFunction, tr: TFunction, sessionCount: number, readinessChecks: number, readinessTotal: number) {
    const pillarRows = athleteIqPillars.map((pillar) => ({
      label: this.getPillarDisplayLabel(pillar.key),
      score: this.getPillarScore(record, pillar.key)
    }));
    const strongest = pillarRows.slice().sort((a, b) => b.score - a.score)[0];
    const focus = pillarRows.slice().sort((a, b) => a.score - b.score)[0];
    const average = this.average(pillarRows.map((pillar) => pillar.score));
    const readinessMode = getReadinessMode(readinessChecks, readinessTotal);

    doc.setFillColor(...palette.ink);
    doc.rect(0, 0, 210, 58, "F");
    doc.setFillColor(...palette.accentSoft);
    doc.roundedRect(16, 70, 178, 88, 10, 10, "F");
    doc.setDrawColor(...palette.line);
    doc.roundedRect(16, 70, 178, 88, 10, 10);

    this.drawBrand(doc, 105, 10, 38, true);
    doc.setTextColor(...palette.white);
    doc.setFont("ArialUnicode", "normal");
    doc.setFontSize(16);
    doc.text(tr("athletePerformanceReport"), 105, 49, { align: "center" });

    doc.setTextColor(...palette.ink);
    doc.setFontSize(22);
    doc.text(record.child.name, 24, 90);
    doc.setFontSize(11);
    doc.setTextColor(...palette.muted);
    doc.text(`${tc("date")}: ${record.session.date}`, 24, 100);
    doc.text(`${tr("sessionCountLabel")}: ${sessionCount}`, 24, 107);
    doc.text(`${tr("readinessChecksLabel")}: ${readinessChecks}/${readinessTotal}`, 24, 114);
    doc.text(`${tr("locationLabel")}: ${record.session.location || tc("emptyValue")}`, 24, 121);

    this.drawStatChip(doc, 24, 128, 54, 18, tc("date"), record.child.birthDate || tc("emptyValue"));
    this.drawStatChip(doc, 82, 128, 48, 18, tr("contextLabel"), tr(`contextValue${capitalize(record.session.context)}`));
    this.drawStatChip(doc, 134, 128, 26, 18, tr("groupSizeLabel"), record.session.groupSize || tc("emptyValue"));
    this.drawStatChip(doc, 164, 128, 24, 18, tr("overallAverageLabel"), formatScore(average));

    this.drawNarrativePanel(doc, 20, 170, 54, 34, tr("strongestAreaLabel"), strongest?.label ?? tc("emptyValue"), `${formatScore(strongest?.score ?? null)} / ${REPORT_MAX_SCORE}`);
    this.drawNarrativePanel(doc, 78, 170, 54, 34, tr("priorityFocusLabel"), focus?.label ?? tc("emptyValue"), `${formatScore(focus?.score ?? null)} / ${REPORT_MAX_SCORE}`);
    this.drawNarrativePanel(doc, 136, 170, 54, 34, tr("readinessModeLabel"), tr(`readinessModeValue${capitalize(readinessMode)}`), tr("coachDirectionBody", {
      checks: readinessChecks,
      total: readinessTotal,
      priorities: focus?.label ?? tc("emptyValue")
    }));

    this.drawSectionTitle(doc, 20, 218, tr("coachDirectionTitle"));
    doc.setFontSize(11);
    doc.setTextColor(...palette.ink);
    doc.text(doc.splitTextToSize(`{Hg} ${tr("coachDirectionBody", {
      checks: readinessChecks,
      total: readinessTotal,
      priorities: focus?.label ?? tc("emptyValue")
    })}`, 170), 20, 226);
  },

  drawExecutiveSummaryPage(
    doc: JsPDFWithAutoTable,
    latest: AssessmentRecord,
    baseline: AssessmentRecord,
    pillarRows: Array<{ key: PillarKey; label: string; current: number; baseline: number; delta: number }>,
    recommendation: ReturnType<typeof getCoachRecommendation>,
    readinessMode: string,
    readinessChecks: number,
    readinessTotal: number,
    t: TFunction,
    tc: TFunction,
    tr: TFunction
  ) {
    doc.addPage();
    this.drawPageHeader(doc, tr("executiveSummary"), latest.child.name);

    const strongest = pillarRows.slice().sort((a, b) => b.current - a.current)[0];
    const focus = pillarRows.slice().sort((a, b) => a.current - b.current)[0];
    const avgCurrent = this.average(pillarRows.map((pillar) => pillar.current));
    const avgBaseline = this.average(pillarRows.map((pillar) => pillar.baseline));

    this.drawMetricCard(doc, 20, 36, 38, 22, tr("overallAverageLabel"), formatScore(avgCurrent), palette.accent);
    this.drawMetricCard(doc, 64, 36, 38, 22, tr("baselineAverageLabel"), formatScore(avgBaseline), palette.muted);
    this.drawMetricCard(doc, 108, 36, 38, 22, tr("readinessModeLabel"), tr(`readinessModeValue${capitalize(readinessMode)}`), this.getModeColor(readinessMode));
    this.drawMetricCard(doc, 152, 36, 38, 22, tr("completionLabel"), `${latest.computed.completion.done}/${latest.computed.completion.total}`, palette.positive);

    this.drawNarrativePanel(
      doc,
      20,
      66,
      82,
      44,
      tr("strongestAreaLabel"),
      strongest?.label ?? tc("emptyValue"),
      tr("strongestAreaBody", {
        score: formatScore(strongest?.current ?? null),
        baseline: formatScore(strongest?.baseline ?? null)
      })
    );

    this.drawNarrativePanel(
      doc,
      108,
      66,
      82,
      44,
      tr("priorityFocusLabel"),
      focus?.label ?? tc("emptyValue"),
      tr("priorityFocusBody", {
        score: formatScore(focus?.current ?? null),
        baseline: formatScore(focus?.baseline ?? null)
      })
    );

    const priorities = recommendation.priorityKeys
      .map((key) => athleteIqPillars.find((pillar) => pillar.key === key))
      .filter(Boolean)
      .map((pillar) => tr("coachPriorityPillar", { pillar: pillar ? t(pillar.title) : t("executionQualityFallback") }));

    this.drawSectionTitle(doc, 20, 122, tr("coachDirectionTitle"));
    doc.setFontSize(11);
    doc.setTextColor(...palette.ink);
    doc.text(doc.splitTextToSize(t(`coachMode${capitalize(recommendation.mode)}`), 170), 20, 130);
    doc.setTextColor(...palette.muted);
    doc.text(
      doc.splitTextToSize(
        tr("coachDirectionBody", {
          checks: readinessChecks,
          total: readinessTotal,
          priorities: priorities.join(" • ") || t("executionQualityFallback")
        }),
        170
      ),
      20,
      142
    );

    autoTable(doc, {
      startY: 156,
      theme: "plain",
      head: [[tr("pillarTablePillar"), tr("pillarTableCurrent"), tr("pillarTableBaseline"), tr("pillarTableDelta")]],
      body: pillarRows.map((pillar) => [
        pillar.label,
        formatScore(pillar.current),
        formatScore(pillar.baseline),
        this.formatDelta(pillar.delta)
      ]),
      styles: {
        font: "ArialUnicode",
        fontSize: 10,
        textColor: palette.ink
      },
      headStyles: {
        fillColor: palette.panel,
        textColor: palette.ink,
        lineColor: palette.line,
        lineWidth: 0.2
      },
      bodyStyles: {
        fillColor: palette.panelSoft,
        lineColor: palette.line,
        lineWidth: 0.2
      },
      columnStyles: {
        1: { halign: "center" },
        2: { halign: "center" },
        3: { halign: "center" }
      }
    });
  },

  drawPerformanceProfilePage(
    doc: jsPDF,
    record: AssessmentRecord,
    pillarRows: Array<{ key: PillarKey; label: string; current: number; baseline: number; delta: number }>,
    t: TFunction,
    ts: TFunction,
    tr: TFunction
  ) {
    doc.addPage();
    this.drawPageHeader(doc, tr("performanceProfileTitle"), record.child.name);
    doc.setFontSize(11);
    doc.setTextColor(...palette.muted);
    doc.text(doc.splitTextToSize(tr("performanceProfileSubtitle"), 170), 20, 36);

    let y = 52;
    pillarRows.forEach((pillar) => {
      this.drawPillarBand(doc, 20, y, 170, 18, pillar.label, pillar.current, pillar.baseline, pillarColors[pillar.key]);
      y += 24;
    });

    this.drawSectionTitle(doc, 20, 198, tr("readinessChecklistTitle"));
    doc.setFontSize(9);
    doc.setTextColor(...palette.muted);
    doc.text(tr("readinessChecklistSubtitle"), 20, 205);

    const checklistX = [20, 110];
    readinessChecklist.forEach((item, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = checklistX[col];
      const yy = 214 + row * 12;
      const score = record.scores[item.key]?.score;
      const completed = typeof score === "number" && score >= 4;
      doc.setFillColor(...(completed ? palette.positive : palette.panel));
      doc.roundedRect(x, yy - 4, 6, 6, 1.5, 1.5, "F");
      if (!completed) {
        doc.setDrawColor(...palette.line);
        doc.roundedRect(x, yy - 4, 6, 6, 1.5, 1.5);
      }
      doc.setTextColor(...palette.ink);
      doc.text(ts(item.label), x + 10, yy);
    });
  },

  drawOperatingSnapshotPage(
    doc: jsPDF,
    athleteName: string,
    operatingSummary: {
      operatingScore: number;
      habitScore: number | null;
      habitStreak: number;
      loadState: string;
      loadRatio: number;
      pattern: string;
      support: string;
      strongest: string;
    },
    tc: TFunction,
    tr: TFunction
  ) {
    doc.addPage();
    this.drawPageHeader(doc, tr("operatingSnapshotTitle"), athleteName);
    doc.setFontSize(11);
    doc.setTextColor(...palette.muted);
    doc.text(doc.splitTextToSize(tr("operatingSnapshotSubtitle"), 170), 20, 36);

    this.drawMetricCard(doc, 20, 48, 38, 22, tr("operatingScoreLabel"), String(operatingSummary.operatingScore), palette.accent);
    this.drawMetricCard(doc, 64, 48, 38, 22, tr("habitScoreLabel"), operatingSummary.habitScore === null ? tc("emptyValue") : String(operatingSummary.habitScore), palette.positive);
    this.drawMetricCard(doc, 108, 48, 38, 22, tr("habitStreakLabel"), String(operatingSummary.habitStreak), palette.caution);
    this.drawMetricCard(doc, 152, 48, 38, 22, tr("loadStateLabel"), tr(`loadStateValue${capitalize(operatingSummary.loadState)}`), this.getModeColor(operatingSummary.loadState === "heavy" ? "light" : "full"));

    this.drawNarrativePanel(
      doc,
      20,
      78,
      82,
      44,
      tr("memoryPatternLabel"),
      tr(`memoryPatternValue${capitalize(operatingSummary.pattern)}`),
      tr("memoryPatternBody", {
        strongest: operatingSummary.strongest,
        support: operatingSummary.support
      })
    );

    this.drawNarrativePanel(
      doc,
      108,
      78,
      82,
      44,
      tr("loadRatioLabel"),
      operatingSummary.loadRatio.toFixed(2),
      tr("loadRatioBody", {
        ratio: operatingSummary.loadRatio.toFixed(2),
        state: tr(`loadStateValue${capitalize(operatingSummary.loadState)}`)
      })
    );

    this.drawSectionTitle(doc, 20, 136, tr("operatingSnapshotNarrativeTitle"));
    doc.setFontSize(11);
    doc.setTextColor(...palette.ink);
    doc.text(
      doc.splitTextToSize(
        tr("operatingSnapshotNarrativeBody", {
          score: operatingSummary.operatingScore,
          habit: operatingSummary.habitScore ?? tc("emptyValue"),
          streak: operatingSummary.habitStreak,
          pattern: tr(`memoryPatternValue${capitalize(operatingSummary.pattern)}`),
          support: operatingSummary.support,
          loadState: tr(`loadStateValue${capitalize(operatingSummary.loadState)}`)
        }),
        170
      ),
      20,
      144
    );
  },

  drawTrendPage(doc: JsPDFWithAutoTable, history: AssessmentRecord[], latest: AssessmentRecord, baseline: AssessmentRecord, ts: TFunction, tr: TFunction) {
    doc.addPage();
    this.drawPageHeader(doc, tr("trendPageTitle"), latest.child.name);
    doc.setFontSize(11);
    doc.setTextColor(...palette.muted);
    doc.text(doc.splitTextToSize(tr("trendPageSubtitle"), 170), 20, 36);

    this.drawTrendBox(
      doc,
      20,
      48,
      170,
      34,
      tr("overallTrendTitle"),
      history.map((item) => ({
        date: item.session.date,
        value: this.average(athleteIqPillars.map((pillar) => this.getPillarScore(item, pillar.key)))
      })),
      palette.accent
    );

    let boxY = 92;
    athleteIqPillars.forEach((pillar, index) => {
      const x = index % 2 === 0 ? 20 : 108;
      if (index % 2 === 0 && index > 0) {
        boxY += 42;
      }
      this.drawTrendBox(
        doc,
        x,
        boxY,
        82,
        30,
        ts(pillar.title),
        history.map((item) => ({
          date: item.session.date,
          value: this.getPillarScore(item, pillar.key)
        })),
        pillarColors[pillar.key]
      );
    });

    autoTable(doc, {
      startY: 182,
      theme: "plain",
      head: [[tr("sessionLogDate"), tr("sessionLogReadiness"), tr("sessionLogStrongest"), tr("sessionLogFocus")]],
      body: history
        .slice()
        .reverse()
        .slice(0, 8)
        .map((assessment) => {
          const rows = athleteIqPillars.map((pillar) => ({
            label: ts(pillar.title),
            score: this.getPillarScore(assessment, pillar.key)
          }));
          const strongest = rows.slice().sort((a, b) => b.score - a.score)[0];
          const focus = rows.slice().sort((a, b) => a.score - b.score)[0];
          return [
            assessment.session.date,
            `${this.getReadinessChecks(assessment)}/${getCompatibleReadinessState(assessment).total}`,
            strongest?.label ?? "-",
            focus?.label ?? "-"
          ];
        }),
      styles: {
        font: "ArialUnicode",
        fontSize: 9,
        textColor: palette.ink
      },
      headStyles: {
        fillColor: palette.panel,
        textColor: palette.ink,
        lineColor: palette.line,
        lineWidth: 0.2
      },
      bodyStyles: {
        fillColor: palette.panelSoft,
        lineColor: palette.line,
        lineWidth: 0.2
      }
    });

    void baseline;
  },

  drawNotesPage(
    doc: jsPDF,
    record: AssessmentRecord,
    recommendation: ReturnType<typeof getCoachRecommendation>,
    t: TFunction,
    tc: TFunction,
    ts: TFunction,
    tr: TFunction
  ) {
    doc.addPage();
    this.drawPageHeader(doc, tr("notesAndActionsTitle"), record.child.name);

    this.drawSectionTitle(doc, 20, 34, tr("sessionContextTitle"));
    this.drawContextGrid(
      doc,
      20,
      42,
      [
        [t("conductor"), record.session.conductor || tc("emptyValue")],
        [t("observers"), record.session.observers || tc("emptyValue")],
        [tr("locationLabel"), record.session.location || tc("emptyValue")],
        [tr("contextLabel"), tr(`contextValue${capitalize(record.session.context)}`)],
        [t("groupSize"), record.session.groupSize || tc("emptyValue")],
        [tr("consentReportLabel"), record.session.consentReport ? tr("booleanYes") : tr("booleanNo")]
      ]
    );

    this.drawSectionTitle(doc, 20, 92, tr("readinessActionsTitle"));
    const priorityLabels = recommendation.priorityKeys
      .map((key) => athleteIqPillars.find((pillar) => pillar.key === key))
      .filter(Boolean)
      .map((pillar) => pillar ? t(pillar.title) : t("executionQualityFallback"));
    const noteLines = [
      t(`coachMode${capitalize(recommendation.mode)}`),
      tr("priorityLine", { priorities: priorityLabels.join(", ") || t("executionQualityFallback") }),
      tr("readinessChecksNarrative", {
        checks: this.getReadinessChecks(record),
        total: getCompatibleReadinessState(record).total
      })
    ];
    doc.setFontSize(11);
    doc.setTextColor(...palette.ink);
    doc.text(doc.splitTextToSize(noteLines.join(" "), 170), 20, 100);

    this.drawSectionTitle(doc, 20, 126, tr("notesBlockTitle"));
    this.drawNarrativeBlock(doc, 20, 134, 170, 22, tr("generalObservationLabel"), record.notes.general || tr("emptyNarrative"));
    this.drawNarrativeBlock(doc, 20, 160, 170, 22, tr("adaptationNeedsLabel"), record.notes.adaptations || tr("emptyNarrative"));
    this.drawNarrativeBlock(doc, 20, 186, 170, 22, tr("referralNoteLabel"), record.notes.referral || tr("emptyNarrative"));

    this.drawSectionTitle(doc, 20, 220, tr("sessionSignalsTitle"));
    const signals: Array<[string, string]> = [
      [t("knownTraits"), record.child.knownTraits || tr("emptyNarrative")],
      [t("parentSignals"), record.child.parentSignals || tr("emptyNarrative")]
    ];
    this.drawContextGrid(doc, 20, 228, signals);

    void ts;
  },

  drawPageHeader(doc: jsPDF, title: string, athleteName: string) {
    doc.setFillColor(...palette.panel);
    doc.rect(0, 0, 210, 28, "F");
    this.drawBrand(doc, 20, 6, 18);
    doc.setFont("ArialUnicode", "normal");
    doc.setFontSize(12);
    doc.setTextColor(...palette.ink);
    doc.text(`Habigoal · ${title}`, 44, 14);
    doc.setFontSize(9);
    doc.setTextColor(...palette.muted);
    doc.text(athleteName, 44, 20);
    doc.setDrawColor(...palette.line);
    doc.line(20, 24, 190, 24);
  },

  drawBrand(doc: jsPDF, x: number, y: number, size: number, centered = false) {
    const drawFallback = () => this.drawTextBrand(doc, centered ? x : x + size / 2, y + size * 0.68, size * 0.52, true);
    if (!brandImageDataUrl) {
      drawFallback();
      return;
    }

    const drawX = centered ? x - size / 2 : x;
    try {
      doc.addImage(brandImageDataUrl, "PNG", drawX, y, size, size);
    } catch {
      drawFallback();
    }
  },

  drawTextBrand(doc: jsPDF, x: number, y: number, size: number, centered = false) {
    const braceSize = size * 0.74;
    const letterSize = size;
    const letterOffset = size * 0.52;
    const baseX = centered ? x - letterOffset : x;

    doc.setFont("ArialUnicode", "normal");
    doc.setFontSize(braceSize);
    doc.setTextColor(96, 111, 140);
    doc.text("{", baseX - letterOffset, y, centered ? { align: "center" } : undefined);
    doc.setTextColor(...palette.ink);
    doc.setFontSize(letterSize);
    doc.text("Hg", x, y, centered ? { align: "center" } : undefined);
    doc.setTextColor(96, 111, 140);
    doc.setFontSize(braceSize);
    doc.text("}", baseX + letterOffset, y, centered ? { align: "center" } : undefined);
    doc.setTextColor(...palette.ink);
  },

  drawSectionTitle(doc: jsPDF, x: number, y: number, title: string) {
    doc.setFont("ArialUnicode", "normal");
    doc.setFontSize(13);
    doc.setTextColor(...palette.ink);
    doc.text(title, x, y);
    doc.setDrawColor(...palette.line);
    doc.line(x, y + 3, 190, y + 3);
  },

  drawMetricCard(doc: jsPDF, x: number, y: number, w: number, h: number, label: string, value: string, color: [number, number, number]) {
    doc.setFillColor(...palette.panelSoft);
    doc.setDrawColor(...palette.line);
    doc.roundedRect(x, y, w, h, 4, 4, "FD");
    doc.setFillColor(...color);
    doc.roundedRect(x + 2, y + 2, 4, h - 4, 2, 2, "F");
    doc.setTextColor(...palette.muted);
    doc.setFontSize(8);
    doc.text(label, x + 10, y + 8);
    doc.setTextColor(...palette.ink);
    doc.setFontSize(13);
    doc.text(doc.splitTextToSize(value, w - 14), x + 10, y + 15);
  },

  drawNarrativePanel(doc: jsPDF, x: number, y: number, w: number, h: number, eyebrow: string, title: string, body: string) {
    doc.setFillColor(...palette.panelSoft);
    doc.setDrawColor(...palette.line);
    doc.roundedRect(x, y, w, h, 5, 5, "FD");
    doc.setFontSize(8);
    doc.setTextColor(...palette.muted);
    doc.text(eyebrow, x + 6, y + 8);
    doc.setFontSize(12);
    doc.setTextColor(...palette.ink);
    doc.text(title, x + 6, y + 17);
    doc.setFontSize(9);
    doc.setTextColor(...palette.muted);
    doc.text(doc.splitTextToSize(body, w - 12), x + 6, y + 26);
  },

  drawPillarBand(doc: jsPDF, x: number, y: number, w: number, h: number, label: string, current: number, baseline: number, color: [number, number, number]) {
    doc.setFillColor(...palette.panelSoft);
    doc.setDrawColor(...palette.line);
    doc.roundedRect(x, y, w, h, 4, 4, "FD");
    doc.setFontSize(10);
    doc.setTextColor(...palette.ink);
    doc.text(label, x + 4, y + 6);
    doc.setTextColor(...palette.muted);
    doc.setFontSize(8);
    doc.text(`${formatScore(current)} / ${REPORT_MAX_SCORE}`, x + w - 20, y + 6);

    const barX = x + 4;
    const barY = y + 10;
    const barW = w - 8;
    doc.setFillColor(...palette.line);
    doc.roundedRect(barX, barY, barW, 4.5, 2, 2, "F");
    doc.setFillColor(...color);
    doc.roundedRect(barX, barY, (barW * current) / REPORT_MAX_SCORE, 4.5, 2, 2, "F");

    const baselineX = barX + (barW * baseline) / REPORT_MAX_SCORE;
    doc.setDrawColor(...palette.ink);
    doc.setLineWidth(0.5);
    doc.line(baselineX, barY - 1.5, baselineX, barY + 6);
    doc.setFontSize(7.5);
    doc.setTextColor(...palette.muted);
    doc.text(`${formatScore(baseline)}`, baselineX - 4, y + 17);
  },

  drawTrendBox(
    doc: jsPDF,
    x: number,
    y: number,
    w: number,
    h: number,
    title: string,
    points: Array<{ date: string; value: number }>,
    color: [number, number, number]
  ) {
    doc.setFillColor(...palette.panelSoft);
    doc.setDrawColor(...palette.line);
    doc.roundedRect(x, y, w, h, 4, 4, "FD");
    doc.setFontSize(9);
    doc.setTextColor(...palette.ink);
    doc.text(title, x + 4, y + 6);

    const chartX = x + 4;
    const chartY = y + 10;
    const chartW = w - 8;
    const chartH = h - 14;
    doc.setDrawColor(...palette.line);
    doc.line(chartX, chartY + chartH, chartX + chartW, chartY + chartH);

    if (points.length === 0) {
      return;
    }

    if (points.length === 1) {
      doc.setFillColor(...color);
      doc.circle(chartX + chartW / 2, chartY + chartH - (points[0].value / REPORT_MAX_SCORE) * chartH, 1.1, "F");
      return;
    }

    doc.setDrawColor(...color);
    doc.setLineWidth(0.8);
    const step = chartW / Math.max(1, points.length - 1);
    for (let i = 0; i < points.length - 1; i += 1) {
      const current = points[i];
      const next = points[i + 1];
      const x1 = chartX + i * step;
      const y1 = chartY + chartH - (current.value / REPORT_MAX_SCORE) * chartH;
      const x2 = chartX + (i + 1) * step;
      const y2 = chartY + chartH - (next.value / REPORT_MAX_SCORE) * chartH;
      doc.line(x1, y1, x2, y2);
      doc.circle(x1, y1, 0.7, "F");
      if (i === points.length - 2) {
        doc.circle(x2, y2, 0.7, "F");
      }
    }
  },

  drawNarrativeBlock(doc: jsPDF, x: number, y: number, w: number, h: number, label: string, body: string) {
    doc.setFillColor(...palette.panelSoft);
    doc.setDrawColor(...palette.line);
    doc.roundedRect(x, y, w, h, 4, 4, "FD");
    doc.setFontSize(8);
    doc.setTextColor(...palette.muted);
    doc.text(label, x + 4, y + 6);
    doc.setFontSize(10);
    doc.setTextColor(...palette.ink);
    doc.text(doc.splitTextToSize(body, w - 8), x + 4, y + 13);
  },

  drawContextGrid(doc: jsPDF, x: number, y: number, rows: Array<[string, string]>) {
    autoTable(doc as JsPDFWithAutoTable, {
      startY: y,
      margin: { left: x, right: 20 },
      theme: "plain",
      body: rows,
      styles: {
        font: "ArialUnicode",
        fontSize: 9,
        textColor: palette.ink,
        cellPadding: 2.5
      },
      bodyStyles: {
        fillColor: palette.panelSoft,
        lineColor: palette.line,
        lineWidth: 0.2
      },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 44 },
        1: { cellWidth: 126 }
      }
    });
  },

  drawStatChip(doc: jsPDF, x: number, y: number, w: number, h: number, label: string, value: string) {
    doc.setFillColor(...palette.white);
    doc.setDrawColor(...palette.line);
    doc.roundedRect(x, y, w, h, 4, 4, "FD");
    doc.setFontSize(7.5);
    doc.setTextColor(...palette.muted);
    doc.text(label, x + 4, y + 6.5);
    doc.setFontSize(10);
    doc.setTextColor(...palette.ink);
    doc.text(doc.splitTextToSize(value, w - 8), x + 4, y + 13.5);
  },

  drawFooters(doc: jsPDF) {
    const totalPages = doc.getNumberOfPages();
    for (let page = 1; page <= totalPages; page += 1) {
      doc.setPage(page);
      doc.setDrawColor(...palette.line);
      doc.line(20, 286, 190, 286);
      doc.setFont("ArialUnicode", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...palette.muted);
      doc.text("Habigoal", 20, 291);
      doc.text(`${page}/${totalPages}`, 190, 291, { align: "right" });
    }
  },

  getSortedHistory(record: AssessmentRecord, history: AssessmentRecord[]) {
    const items = history.length > 0 ? history : [record];
    return items.slice().sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },

  getPillarScore(record: AssessmentRecord, key: PillarKey) {
    return getCompatiblePillarScore(record, key);
  },

  getReadinessChecks(record: AssessmentRecord) {
    return getCompatibleReadinessState(record).count;
  },

  getPillarDisplayLabel(key: PillarKey) {
    if (key === "physical_pillar") return "Physical readiness";
    if (key === "mental_pillar") return "Mental balance";
    return "Sport brain";
  },

  average(values: number[]) {
    if (values.length === 0) {
      return 0;
    }
    return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
  },

  formatDelta(value: number) {
    if (!Number.isFinite(value)) {
      return "-";
    }
    return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
  },

  getModeColor(mode: string): [number, number, number] {
    if (mode === "full") return palette.positive;
    if (mode === "moderate") return palette.caution;
    return palette.danger;
  },

  getOperatingSummary(record: AssessmentRecord, history: AssessmentRecord[], habitHistory: HabitRecord[], ts: TFunction, tr: TFunction) {
    const readiness = getCompatibleReadinessState(record).gaugeValue * 20;
    const overall = (record.computed.ski ?? 0) * 20;
    const operatingScore = Math.round(readiness * 0.55 + overall * 0.45);
    const latestHabit = habitHistory.find((entry) => entry.date === record.session.date) ?? habitHistory[habitHistory.length - 1] ?? null;
    const habitScore = latestHabit ? getHabitScoreSummary(latestHabit.statuses).score : null;
    const habitStreak = this.getHabitStreak(habitHistory);

    const loadValues = history
      .map((entry) => this.getInternalLoad(entry))
      .filter((value): value is number => value !== null);
    const latestThreeAverage = loadValues.length ? this.average(loadValues.slice(-3)) : 0;
    const previousThreeAverage = loadValues.length > 3 ? this.average(loadValues.slice(-6, -3)) : latestThreeAverage;
    const loadRatio = previousThreeAverage > 0 ? Number((latestThreeAverage / previousThreeAverage).toFixed(2)) : 1;
    const loadState = loadRatio >= 1.3 ? "heavy" : loadRatio <= 0.8 ? "light" : "balanced";

    const recentRows = history.slice(-5).map((entry) => ({
      strongest: athleteIqPillars
        .map((pillar) => ({ label: ts(pillar.title), score: this.getPillarScore(entry, pillar.key) }))
        .sort((a, b) => b.score - a.score)[0]?.label ?? tr("emptyNarrative"),
      focus: athleteIqPillars
        .map((pillar) => ({ label: ts(pillar.title), score: this.getPillarScore(entry, pillar.key) }))
        .sort((a, b) => a.score - b.score)[0]?.label ?? tr("emptyNarrative")
    }));
    const strongest = recentRows[0]?.strongest ?? tr("emptyNarrative");
    const support = recentRows[0]?.focus ?? tr("emptyNarrative");
    const latestReadiness = history[history.length - 1] ? getCompatibleReadinessState(history[history.length - 1]).gaugeValue : 0;
    const previousReadiness = history.length > 2 ? this.average(history.slice(-3, -1).map((entry) => getCompatibleReadinessState(entry).gaugeValue)) : latestReadiness;
    const pattern = latestReadiness - previousReadiness >= 0.35 ? "rising" : previousReadiness - latestReadiness >= 0.35 ? "falling" : "steady";

    return {
      operatingScore,
      habitScore,
      habitStreak,
      loadState,
      loadRatio,
      pattern,
      support,
      strongest
    };
  },

  getHabitCompletion(statuses: Record<string, boolean>) {
    const total = Object.keys(statuses).length;
    const completed = Object.values(statuses).filter(Boolean).length;
    return { completed, total, score: total ? Math.round((completed / total) * 100) : 0 };
  },

  getHabitStreak(history: HabitRecord[]) {
    const sorted = history.slice().sort((a, b) => b.date.localeCompare(a.date));
    let streak = 0;
    for (const record of sorted) {
      if (this.getHabitCompletion(record.statuses).score >= 70) {
        streak += 1;
      } else {
        break;
      }
    }
    return streak;
  },

  getInternalLoad(record: AssessmentRecord) {
    const duration = record.trainingLoad?.durationMinutes;
    const rpe = record.trainingLoad?.rpe;
    if (typeof duration !== "number" || typeof rpe !== "number") return null;
    return Math.round(duration * rpe);
  }
};

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
