import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import type { DatasetSummary, StudentRecord } from './types';
import type { Filters } from './filters';
import { classWiseReport, programWiseReport } from './reportAggregation';

const PAGE_MARGIN = 40;

function describeScope(filters: Filters, atRiskOnly: boolean): string {
  const parts: string[] = [];
  if (filters.program) parts.push(`Program: ${filters.program}`);
  if (filters.classSection) parts.push(`Class/Section: ${filters.classSection}`);
  if (filters.semester) parts.push(`Semester: ${filters.semester}`);
  if (filters.instructor) parts.push(`Instructor: ${filters.instructor}`);
  if (filters.riskLevel) parts.push(`Risk level: ${filters.riskLevel}`);
  if (atRiskOnly) parts.push('At-risk students only');
  return parts.length ? parts.join(' · ') : 'Full dataset';
}

function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(
      `Academic Results Intelligence · Generated ${new Date().toLocaleString()} · Page ${i} of ${pageCount}`,
      PAGE_MARGIN,
      doc.internal.pageSize.getHeight() - 20,
    );
  }
}

export async function generatePdfReport(opts: {
  students: StudentRecord[];
  summary: DatasetSummary | null;
  filters: Filters;
  atRiskOnly: boolean;
  chartsEl: HTMLElement | null;
  institutionName: string;
}): Promise<void> {
  const { students, summary, filters, atRiskOnly, chartsEl, institutionName } = opts;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  const cgpas = students.map((s) => s.latestCgpa).filter((v): v is number => v !== null);
  const avgCgpa = cgpas.length ? (cgpas.reduce((a, b) => a + b, 0) / cgpas.length).toFixed(2) : '—';
  const highRisk = students.filter((s) => s.riskLevel === 'High').length;
  const mediumRisk = students.filter((s) => s.riskLevel === 'Medium').length;

  // --- Cover page ---
  doc.setFontSize(22);
  doc.setTextColor(15);
  doc.text('Academic Results Intelligence', PAGE_MARGIN, 90);
  doc.setFontSize(14);
  doc.setTextColor(80);
  doc.text('At-Risk Student Report', PAGE_MARGIN, 115);

  doc.setFontSize(11);
  doc.setTextColor(60);
  const coverLines = [
    institutionName ? `Institution: ${institutionName}` : null,
    `Report scope: ${describeScope(filters, atRiskOnly)}`,
    `Generated: ${new Date().toLocaleString()}`,
    `Students in scope: ${students.length}`,
  ].filter((l): l is string => !!l);
  doc.text(coverLines, PAGE_MARGIN, 150, { lineHeightFactor: 1.6 });

  autoTable(doc, {
    startY: 230,
    head: [['Metric', 'Value']],
    body: [
      ['Students in scope', String(students.length)],
      ['Average CGPA', avgCgpa],
      ['High risk students', String(highRisk)],
      ['Medium risk students', String(mediumRisk)],
      ['Failed course records', String(students.reduce((sum, s) => sum + s.totalFailedCourses, 0))],
    ],
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42] },
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
  });

  if (summary) {
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(
      `Source: ${summary.layout === 'A' ? 'Course-level (Layout A)' : 'Semester summary (Layout B)'} · ${summary.rowsRead} rows read · ${summary.rowsSkipped} rows skipped`,
      PAGE_MARGIN,
      (doc as any).lastAutoTable.finalY + 20,
    );
  }

  // --- Charts page ---
  if (chartsEl) {
    try {
      const canvas = await html2canvas(chartsEl, { scale: 1.5, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth - PAGE_MARGIN * 2;
      const imgHeight = (canvas.height / canvas.width) * imgWidth;
      doc.addPage();
      doc.setFontSize(14);
      doc.setTextColor(15);
      doc.text('Summary Charts', PAGE_MARGIN, 40);
      doc.addImage(imgData, 'PNG', PAGE_MARGIN, 55, imgWidth, imgHeight);
    } catch (e) {
      // If chart capture fails (e.g. unsupported environment), continue without it.
      console.error('Chart capture failed', e);
    }
  }

  // --- Class / Program summary ---
  const classRows = classWiseReport(students);
  const programRows = programWiseReport(students);
  doc.addPage();
  doc.setFontSize(14);
  doc.setTextColor(15);
  doc.text('Class / Section Summary', PAGE_MARGIN, 40);
  autoTable(doc, {
    startY: 55,
    head: [['Class / Section', 'Students', 'Avg CGPA', 'Pass Rate', 'High Risk', 'Medium Risk']],
    body: classRows.map((r) => [
      r.key,
      String(r.studentCount),
      r.avgCgpa?.toFixed(2) ?? '—',
      r.passRate !== null ? `${r.passRate}%` : '—',
      String(r.highRiskCount),
      String(r.mediumRiskCount),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42] },
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
  });

  const afterClassY = (doc as any).lastAutoTable.finalY + 30;
  doc.setFontSize(14);
  doc.setTextColor(15);
  doc.text('Program Summary', PAGE_MARGIN, afterClassY);
  autoTable(doc, {
    startY: afterClassY + 15,
    head: [['Program', 'Students', 'Avg CGPA', 'Pass Rate', 'High Risk', 'Medium Risk']],
    body: programRows.map((r) => [
      r.key,
      String(r.studentCount),
      r.avgCgpa?.toFixed(2) ?? '—',
      r.passRate !== null ? `${r.passRate}%` : '—',
      String(r.highRiskCount),
      String(r.mediumRiskCount),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42] },
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
  });

  // --- At-risk students table ---
  const atRisk = students.filter((s) => s.riskLevel === 'High' || s.riskLevel === 'Medium');
  doc.addPage();
  doc.setFontSize(14);
  doc.setTextColor(15);
  doc.text('At-Risk Students', PAGE_MARGIN, 40);
  autoTable(doc, {
    startY: 55,
    head: [['Student', 'ID', 'Program', 'CGPA', 'Risk', 'Reason']],
    body: atRisk.map((s) => [
      s.studentName,
      s.studentId,
      s.program,
      s.latestCgpa?.toFixed(2) ?? '—',
      s.riskLevel,
      s.riskReason,
    ]),
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42] },
    styles: { fontSize: 8, cellPadding: 4 },
    columnStyles: { 5: { cellWidth: 220 } },
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
  });

  addFooter(doc);
  doc.save(`academic-results-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
