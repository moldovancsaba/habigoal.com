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

/**
 * PDF Service for Kidex Reports
 * Handles generation of "Original" and "Map" report formats.
 */
export const PdfService = {
  /**
   * Generates the "Original" technical assessment report.
   */
  async generateOriginalReport(record: AssessmentRecord, t: any, tc: any, ts: any): Promise<void> {
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
  async generateMapReport(record: AssessmentRecord, t: any, tc: any, ts: any): Promise<void> {
    const doc = new jsPDF({ unit: "mm", format: "a4" }) as JsPDFWithAutoTable;
    const logoDataUrl = await this.getLogoDataUrl();

    // --- PAGE 1: COVER ---
    if (logoDataUrl) doc.addImage(logoDataUrl, "JPEG", 70, 40, 70, 70);
    doc.setFont("times", "bold");
    doc.setFontSize(28);
    doc.text("KIDEX", 105, 130, { align: "center" });
    doc.setFontSize(22);
    doc.text("BIO–PSZICHO–SZOCIÁLIS TÉRKÉP", 105, 145, { align: "center" });
    
    doc.setFont("times", "normal");
    doc.setFontSize(18);
    doc.text(record.child.name, 105, 170, { align: "center" });
    doc.setFontSize(14);
    doc.text(`${record.session.date} · Professzionális Értékelés`, 105, 180, { align: "center" });
    
    doc.setDrawColor(19, 165, 158); // Brand Teal
    doc.setLineWidth(1.5);
    doc.line(40, 200, 170, 200);

    // --- PAGE 2: METHODOLOGY ---
    doc.addPage();
    this.drawPageHeader(doc, "MÓDSZERTAN ÉS ÉRTÉKELÉSI SKÁLA", logoDataUrl);
    
    doc.setFontSize(11);
    doc.setFont("times", "normal");
    const introText = "Az alábbi szakmai dokumentum a Kidex Assessment OS keretrendszerében készült, amely a gyermeki fejlődés bio-pszicho-szociális aspektusait vizsgálja. Az értékelés alapját a fejlesztő pedagógus strukturált megfigyelései, az ESÉSIK protokoll és a szülői visszajelzések képezik.";
    doc.text(doc.splitTextToSize(introText, 170), 20, 50);

    autoTable(doc, {
      startY: 70,
      head: [["Érték", "Megnevezés", "Leírás"]],
      body: [
        ["1", "Jelentős eltérés", "Azonnali intervenciót igényel."],
        ["2", "Komoly támogatás", "Célzott fejlesztés javasolt."],
        ["3", "Fejleszthető alap", "Stabilizálást igénylő készségek."],
        ["4", "Életkornak megfelelő", "Stabil, korosztályos szint."],
        ["5", "Jó / Erős", "Átlag feletti teljesítmény."],
        ["6", "Kiemelkedő", "Magas tehetség-potenciál."]
      ],
      theme: "striped",
      headStyles: { fillStyle: "F", fillColor: [61, 63, 77] }
    });

    // --- PAGE 3: GENERAL OBSERVATION ---
    doc.addPage();
    this.drawPageHeader(doc, "I. ÁLTALÁNOS MEGFIGYELÉSEK", logoDataUrl);
    doc.setFontSize(12);
    doc.text("Szakértői vélemény:", 20, 50);
    doc.setFont("times", "italic");
    doc.text(doc.splitTextToSize(record.notes.general || "Nincs rögzített általános megfigyelés.", 170), 20, 60);

    // --- PAGE 4-6: PROFILES ---
    const domains: Array<{key: string, label: string, color: number[]}> = [
      { key: "rapid_movement", label: "II. MOZGÁSPROFIL", color: [19, 165, 158] },
      { key: "rapid_social", label: "III. SZOCIÁLIS PROFIL", color: [253, 203, 88] },
      { key: "rapid_mental", label: "IV. MENTÁLIS PROFIL", color: [61, 63, 77] }
    ];

    for (const domain of domains) {
      doc.addPage();
      this.drawPageHeader(doc, domain.label, logoDataUrl);
      
      const items = rapidSections.find(s => s.key === domain.key)?.items || [];
      autoTable(doc, {
        startY: 50,
        head: [["Terület", "Érték", "Megjegyzés"]],
        body: items.map(item => [
          ts(`${item.key}.title`),
          record.scores[item.key]?.score || "—",
          record.scores[item.key]?.note || "—"
        ]),
        theme: "grid",
        headStyles: { fillColor: domain.color }
      });
    }

    // --- PAGE 7: SKI ---
    doc.addPage();
    this.drawPageHeader(doc, "V. SPORTÁGI KOMPATIBILITÁSI INDEX (SKI)", logoDataUrl);
    
    doc.setFontSize(32);
    doc.setTextColor(19, 165, 158);
    doc.text(formatScore(record.computed.ski), 105, 80, { align: "center" });
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("KIDEX SKI INDEX", 105, 95, { align: "center" });
    
    doc.setFontSize(11);
    const skiExplanation = "Az SKI index a gyermek mozgásos, szociális és mentális érettségének súlyozott átlaga, amely megmutatja a sportági terhelhetőséget és a közösségi beilleszkedés fokát.";
    doc.text(doc.splitTextToSize(skiExplanation, 150), 30, 110);

    // --- PAGE 8: SPORT RECOMMENDATIONS ---
    doc.addPage();
    this.drawPageHeader(doc, "VI. SPORTÁGI AJÁNLÁSOK", logoDataUrl);
    doc.setFontSize(12);
    doc.text("A mért adatok alapján javasolt fejlesztési irányok:", 20, 50);
    doc.text("• Koordináció alapú sportágak", 30, 65);
    doc.text("• Csapatsportok szociális érzékenyítéssel", 30, 75);
    doc.text("• Egyéni készségfejlesztő foglalkozások", 30, 85);

    // --- PAGE 9: PRIORITIES ---
    doc.addPage();
    this.drawPageHeader(doc, "VII. FEJLESZTÉSI PRIORITÁSOK (12 HÓNAP)", logoDataUrl);
    doc.setFont("times", "normal");
    doc.text(doc.splitTextToSize(record.notes.adaptations || "Specifikus fejlesztési célok a következő időszakra.", 170), 20, 60);

    // --- PAGE 10: SIGNATURES ---
    doc.addPage();
    this.drawPageHeader(doc, "ZÁRÓ ÉRTÉKELÉS", logoDataUrl);
    
    doc.line(20, 200, 80, 200);
    doc.text("Vígh Milán", 20, 210);
    doc.setFontSize(9);
    doc.text("Elnök", 20, 215);

    doc.setFontSize(12);
    doc.line(130, 200, 190, 200);
    doc.text(record.session.conductor || "Kidex Fejlesztő", 130, 210);
    doc.setFontSize(9);
    doc.text("Szakértő", 130, 215);

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
