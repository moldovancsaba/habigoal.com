import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { AssessmentRecord } from "@/types/assessment";
import { formatScore } from "./utils";
import { rapidSections } from "./kidex-schema";

interface JsPDFWithAutoTable extends jsPDF {
  lastAutoTable?: {
    finalY: number;
  };
}

type TFunction = (key: string) => string;

/**
 * PDF Service for Kidex Reports
 * Handles generation of "Original" and "Map" report formats.
 */
export const PdfService = {
  /**
   * Generates the "Original" technical assessment report.
   */
  async generateOriginalReport(record: AssessmentRecord, t: TFunction, tc: TFunction, ts: TFunction): Promise<void> {
    const doc = new jsPDF({ unit: "mm", format: "a4" }) as JsPDFWithAutoTable;
    const reportDate = new Date(record.createdAt).toLocaleDateString();
    const reportTime = new Date(record.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Logo
    const logoDataUrl = await this.getLogoDataUrl();
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, "JPEG", 14, 10, 20, 20);
    }

    // Header
    doc.setFontSize(16);
    doc.text(t("reportPrintTitle"), 38, 16);
    doc.setFontSize(11);
    doc.text(record.child.name, 38, 22);
    
    doc.setFontSize(10);
    doc.text(`${tc("date")}: ${reportDate}`, 140, 14);
    doc.text(`${t("tableTime")}: ${reportTime}`, 140, 19);
    doc.text(`${t("conductor")}: ${record.session.conductor || "—"}`, 140, 24);
    doc.text(`${t("observers")}: ${record.session.observers || "—"}`, 140, 29);

    // Summary Table
    autoTable(doc, {
      startY: 34,
      head: [[ts("movement"), ts("social"), ts("mental"), ts("ski")]],
      body: [[
        formatScore(record.computed.movementAverage),
        formatScore(record.computed.socialAverage),
        formatScore(record.computed.mentalAverage),
        formatScore(record.computed.ski)
      ]],
      theme: "grid",
      styles: { fontSize: 10, halign: "center" }
    });

    // Setup Table
    autoTable(doc, {
      startY: doc.lastAutoTable!.finalY + 4,
      head: [[{ content: t("setupTitle"), colSpan: 2 }]],
      body: [
        [t("childName"), record.child.name],
        [t("birthDate"), record.child.birthDate],
        [t("mode"), record.mode],
        [tc("date"), reportDate],
        [t("location"), record.session.location || "—"],
        [t("conductor"), record.session.conductor || "—"]
      ],
      theme: "grid",
      styles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 55, fontStyle: "bold" }, 1: { cellWidth: 125 } }
    });

    // Detailed Tables
    const sections = rapidSections; // Using rapid as default for now
    for (const section of sections) {
      autoTable(doc, {
        startY: doc.lastAutoTable!.finalY + 6,
        head: [[{ content: ts(section.key), colSpan: 3 }]],
        body: [],
        theme: "plain",
        styles: { fontSize: 11, fontStyle: "bold" }
      });

      autoTable(doc, {
        startY: doc.lastAutoTable!.finalY + 1,
        head: [[t("tableObservation"), t("tableScore"), t("tableNote")]],
        body: section.items.map((item) => {
          const entry = record.scores[item.key];
          return [ts(`${item.key}.title`), `${entry?.score ?? "—"}`, entry?.note || "—"];
        }),
        theme: "grid",
        styles: { fontSize: 9 },
        columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 24, halign: "center" }, 2: { cellWidth: 86 } }
      });
    }

    const safeName = (record.child.name || "report").replace(/[^\w-]+/g, "_");
    doc.save(`kidex_report_${safeName}_${reportDate}.pdf`);
  },

  /**
   * Generates the high-fidelity 10-page "Map" professional report.
   */
  async generateMapReport(
    record: AssessmentRecord, 
    t: TFunction, 
    tc: TFunction, 
    ts: TFunction, 
    tr: TFunction,
    history: AssessmentRecord[] = []
  ): Promise<void> {
    const doc = new jsPDF({ unit: "mm", format: "a4" }) as JsPDFWithAutoTable;
    const logoDataUrl = await this.getLogoDataUrl();

    // --- PAGE 1: COVER ---
    if (logoDataUrl) doc.addImage(logoDataUrl, "JPEG", 70, 40, 70, 70);
    doc.setFont("times", "bold");
    doc.setFontSize(28);
    doc.text("KIDEX", 105, 130, { align: "center" });
    doc.setFontSize(22);
    doc.text(tr("assessmentReport").toUpperCase(), 105, 145, { align: "center" });
    
    doc.setFont("times", "normal");
    doc.setFontSize(18);
    doc.text(record.child.name, 105, 170, { align: "center" });
    doc.setFontSize(14);
    doc.text(`${record.session.date} · ${tr("latestAssessment")}`, 105, 180, { align: "center" });
    
    doc.setDrawColor(19, 165, 158); // Brand Teal
    doc.setLineWidth(1.5);
    doc.line(40, 200, 170, 200);

    // --- PAGE 2: METHODOLOGY & SCALE ---
    doc.addPage();
    this.drawPageHeader(doc, tr("methodologyTitle").toUpperCase(), logoDataUrl);
    
    doc.setFontSize(11);
    doc.setFont("times", "normal");
    doc.text(doc.splitTextToSize(tr("methodologyIntro"), 170), 20, 50);

    autoTable(doc, {
      startY: 70,
      head: [[tr("scaleValue"), tr("scaleName"), tr("scaleDescription")]],
      body: [
        ["1", tr("scale1Name"), tr("scale1Desc")],
        ["2", tr("scale2Name"), tr("scale2Desc")],
        ["3", tr("scale3Name"), tr("scale3Desc")],
        ["4", tr("scale4Name"), tr("scale4Desc")],
        ["5", tr("scale5Name"), tr("scale5Desc")],
        ["6", tr("scale6Name"), tr("scale6Desc")]
      ],
      theme: "striped",
      headStyles: { fillColor: [61, 63, 77] }
    });

    // --- PAGE 3: GENERAL OBSERVATION ---
    doc.addPage();
    this.drawPageHeader(doc, `I. ${t("generalObservation").toUpperCase()}`, logoDataUrl);
    doc.setFontSize(12);
    doc.text(tr("professionalOpinion"), 20, 50);
    doc.setFont("times", "italic");
    doc.text(doc.splitTextToSize(record.notes.general || tr("noGeneralObservation"), 170), 20, 60);

    // --- PAGE 4: DEVELOPMENT TRENDS (NEW) ---
    if (history.length > 1) {
      doc.addPage();
      this.drawPageHeader(doc, tr("developmentTrends").toUpperCase(), logoDataUrl);
      doc.setFontSize(11);
      doc.setFont("times", "normal");
      doc.text(doc.splitTextToSize(tr("trendExplanation"), 170), 20, 50);

      const trendData = [...history].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      autoTable(doc, {
        startY: 65,
        head: [[tc("date"), ts("movement"), ts("social"), ts("mental"), ts("ski")]],
        body: trendData.map(a => [
          a.session.date,
          formatScore(a.computed.movementAverage),
          formatScore(a.computed.socialAverage),
          formatScore(a.computed.mentalAverage),
          formatScore(a.computed.ski)
        ]),
        theme: "grid",
        headStyles: { fillColor: [19, 165, 158] }
      });
    }

    // --- PAGE 5-7: PROFILES ---
    const domains: Array<{key: string, label: string, color: [number, number, number]}> = [
      { key: "rapid_movement", label: `II. ${ts("movement").toUpperCase()}`, color: [19, 165, 158] },
      { key: "rapid_social", label: `III. ${ts("social").toUpperCase()}`, color: [253, 203, 88] },
      { key: "rapid_mental", label: `IV. ${ts("mental").toUpperCase()}`, color: [61, 63, 77] }
    ];

    for (const domain of domains) {
      doc.addPage();
      this.drawPageHeader(doc, domain.label, logoDataUrl);
      
      const items = rapidSections.find(s => s.key === domain.key)?.items || [];
      autoTable(doc, {
        startY: 50,
        head: [[t("tableObservation"), t("tableScore"), t("tableNote")]],
        body: items.map(item => [
          ts(`${item.key}.title`),
          record.scores[item.key]?.score || "—",
          record.scores[item.key]?.note || "—"
        ]),
        theme: "grid",
        headStyles: { fillColor: domain.color }
      });
    }

    // --- PAGE 8: SKI ---
    doc.addPage();
    this.drawPageHeader(doc, `V. ${ts("ski").toUpperCase()} INDEX`, logoDataUrl);
    
    doc.setFontSize(32);
    doc.setTextColor(19, 165, 158);
    doc.text(formatScore(record.computed.ski), 105, 80, { align: "center" });
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`KIDEX ${ts("ski").toUpperCase()}`, 105, 95, { align: "center" });
    
    doc.setFontSize(11);
    doc.text(doc.splitTextToSize(tr("skiExplanation"), 150), 30, 110);

    // --- PAGE 9: SPORT RECOMMENDATIONS ---
    doc.addPage();
    this.drawPageHeader(doc, tr("recommendationsTitle").toUpperCase(), logoDataUrl);
    doc.setFontSize(12);
    doc.text(tr("recommendationsIntro"), 20, 50);
    
    // Dynamic recommendations based on data
    const recs = [];
    const mvAvg = record.computed.movementAverage;
    if (mvAvg !== null && mvAvg < 3) recs.push(t("stabilizing"));
    if (mvAvg !== null && mvAvg >= 4) recs.push(t("sportOrientation"));
    
    if (recs.length > 0) {
      recs.forEach((rec, idx) => {
        doc.text(`• ${rec}`, 30, 65 + (idx * 10));
      });
    } else {
      doc.text("• —", 30, 65);
    }

    // --- PAGE 10: PRIORITIES ---
    doc.addPage();
    this.drawPageHeader(doc, tr("developmentPrioritiesTitle").toUpperCase(), logoDataUrl);
    doc.setFont("times", "normal");
    doc.text(doc.splitTextToSize(record.notes.adaptations || tr("noDevelopmentPriorities"), 170), 20, 60);

    // --- PAGE 11: SIGNATURES ---
    doc.addPage();
    this.drawPageHeader(doc, tr("signaturesTitle").toUpperCase(), logoDataUrl);
    
    doc.line(20, 200, 80, 200);
    doc.text("Vígh Milán", 20, 210);
    doc.setFontSize(9);
    doc.text(tr("president"), 20, 215);

    doc.setFontSize(12);
    doc.line(130, 200, 190, 200);
    doc.text(record.session.conductor || "Kidex Fejlesztő", 130, 210);
    doc.setFontSize(9);
    doc.text(tr("expert"), 130, 215);

    const safeName = (record.child.name || "map").replace(/[^\w-]+/g, "_");
    doc.save(`${safeName}_Kidex_Bio-Pszicho-Szocialis_Terkep.pdf`);
  },

  // Helpers
  async getLogoDataUrl(): Promise<string> {
    return fetch("/logo.jpeg")
      .then((res) => res.blob())
      .then((blob) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }))
      .catch(() => "");
  },

  drawPageHeader(doc: jsPDF, title: string, logoUrl: string) {
    if (logoUrl) doc.addImage(logoUrl, "JPEG", 180, 10, 15, 15);
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.setTextColor(61, 63, 77);
    doc.text(title, 20, 20);
    doc.setDrawColor(61, 63, 77);
    doc.setLineWidth(0.5);
    doc.line(20, 25, 190, 25);
    doc.setTextColor(0, 0, 0);
  }
};
