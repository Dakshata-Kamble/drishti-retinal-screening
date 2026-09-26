/**
 * DRISHTI — AI-Assisted Retinal Screening Report (PDF)
 * Frontend-only PDF generation for the SIH prototype.
 */

import { jsPDF } from 'jspdf';
import type { Patient } from '../types';
import type { DiagnosisResult } from '../types';

export interface ScreeningReportData {
  patient: Patient;
  od: DiagnosisResult;
  os: DiagnosisResult;
  analyzedAt?: string;
  doctorNotes?: string;
  doctorDecision?: string;
}

function line(
  doc: jsPDF,
  y: number,
  label: string,
  value: string,
  labelW = 48,
) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  doc.text(label, 18, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  const lines = doc.splitTextToSize(value || '—', 180 - labelW);
  doc.text(lines, 18 + labelW, y);
  return y + Math.max(5, lines.length * 4.5);
}

function sectionTitle(doc: jsPDF, y: number, title: string) {
  doc.setFillColor(13, 118, 110);
  doc.rect(14, y - 4, 182, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(title, 18, y + 1);
  return y + 10;
}

function gradeLabel(g: number | undefined): string {
  const map: Record<number, string> = {
    0: 'Level 0 — No DR',
    1: 'Level 1 — Mild NPDR',
    2: 'Level 2 — Moderate NPDR',
    3: 'Level 3 — Severe NPDR',
    4: 'Level 4 — Proliferative DR',
  };
  return g !== undefined && map[g] ? map[g] : '—';
}

/**
 * Generate and download the DRISHTI clinical screening report as PDF.
 */
export function downloadScreeningReportPdf(data: ScreeningReportData): void {
  const { patient, od, os, analyzedAt, doctorNotes, doctorDecision } = data;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 16;

  // ── Header ──────────────────────────────────────────────────────────
  doc.setFillColor(13, 118, 110);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('DRISHTI', 18, 12);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('AI-Assisted Retinal Screening Report', 18, 18);
  doc.setFontSize(8);
  doc.text('Explainable AI for Diabetic Retinopathy Screening · SIH Prototype', 18, 24);

  y = 36;

  // ── Patient ─────────────────────────────────────────────────────────
  y = sectionTitle(doc, y, 'PATIENT');
  y = line(doc, y, 'Patient ID', patient.id);
  y = line(doc, y, 'Name', patient.name);
  y = line(doc, y, 'Age / Gender', `${patient.age} years · ${patient.gender}`);
  y = line(doc, y, 'Village', patient.village || '—');
  y = line(doc, y, 'Mobile', patient.mobile || '—');
  if (patient.diabetesStatus) {
    y = line(doc, y, 'Diabetes', patient.diabetesStatus);
  }
  if (patient.diabetesDuration) {
    y = line(doc, y, 'Duration', patient.diabetesDuration);
  }
  y += 3;

  // ── Image Quality ───────────────────────────────────────────────────
  y = sectionTitle(doc, y, 'IMAGE QUALITY');
  const qOd = od.qualityAssessment || patient.odImageQuality || 'gradable';
  const qOs = os.qualityAssessment || patient.osImageQuality || 'gradable';
  y = line(doc, y, 'Right eye (OD)', String(qOd));
  y = line(doc, y, 'Left eye (OS)', String(qOs));
  y = line(doc, y, 'Suitable for analysis', 'Yes — images accepted for screening');
  y += 3;

  // ── AI Screening Result ─────────────────────────────────────────────
  y = sectionTitle(doc, y, 'AI SCREENING RESULT');
  y = line(doc, y, 'OD Diagnosis', od.diagnosis);
  y = line(doc, y, 'OD ICDR Grade', gradeLabel(od.icdrGrade));
  y = line(doc, y, 'OD Confidence', `${od.confidence.toFixed(1)}%`);
  y += 1;
  y = line(doc, y, 'OS Diagnosis', os.diagnosis);
  y = line(doc, y, 'OS ICDR Grade', gradeLabel(os.icdrGrade));
  y = line(doc, y, 'OS Confidence', `${os.confidence.toFixed(1)}%`);

  const maxGrade = Math.max(od.icdrGrade ?? 0, os.icdrGrade ?? 0);
  const referable = maxGrade >= 2 || od.csmeStatus === 'Present' || os.csmeStatus === 'Present';
  y += 1;
  y = line(
    doc,
    y,
    'Classification',
    referable ? 'Referable DR — Ophthalmologist review required' : 'Non-referable / Routine follow-up',
  );
  y += 3;

  // ── Detected Evidence ───────────────────────────────────────────────
  y = sectionTitle(doc, y, 'DETECTED EVIDENCE (LESION-LEVEL)');
  y = line(doc, y, 'OD Microaneurysms', od.microaneurysms);
  y = line(doc, y, 'OD Hemorrhages', od.hemorrhages);
  y = line(doc, y, 'OD Exudates', od.exudates);
  y = line(doc, y, 'OD CSME', od.csmeStatus);
  y += 1;
  y = line(doc, y, 'OS Microaneurysms', os.microaneurysms);
  y = line(doc, y, 'OS Hemorrhages', os.hemorrhages);
  y = line(doc, y, 'OS Exudates', os.exudates);
  y = line(doc, y, 'OS CSME', os.csmeStatus);
  y += 3;

  // ── Explainability ──────────────────────────────────────────────────
  y = sectionTitle(doc, y, 'EXPLAINABILITY');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  const explainText =
    od.explainabilityNote ||
    os.explainabilityNote ||
    'Highlighted retinal regions (Grad-CAM attention map) indicate areas contributing to the model prediction. Lesion evidence above supports the ICDR grade.';
  const explainLines = doc.splitTextToSize(explainText, 174);
  doc.text(explainLines, 18, y);
  y += explainLines.length * 4.5 + 4;

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(
    'Note: This is a simulated prototype output for demonstration. Not a clinically validated diagnosis.',
    18,
    y,
  );
  y += 8;

  // ── Recommendation ──────────────────────────────────────────────────
  y = sectionTitle(doc, y, 'RECOMMENDATION');
  y = line(
    doc,
    y,
    'Action',
    referable
      ? 'Ophthalmologist Review Required · Consider referral'
      : 'Routine screening interval · Continue diabetes care',
  );
  if (doctorDecision && doctorDecision !== 'pending') {
    y = line(doc, y, 'Clinician decision', doctorDecision);
  }
  if (doctorNotes) {
    y = line(doc, y, 'Doctor notes', doctorNotes);
  }
  y += 4;

  // ── Footer ──────────────────────────────────────────────────────────
  const footerY = 285;
  doc.setDrawColor(200, 200, 200);
  doc.line(14, footerY - 6, pageW - 14, footerY - 6);
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Generated: ${analyzedAt ? new Date(analyzedAt).toLocaleString('en-IN') : new Date().toLocaleString('en-IN')}  ·  DRISHTI SIH Prototype  ·  Human-in-the-loop clinical decision support only`,
    18,
    footerY,
  );
  doc.text(`Report ID: ${patient.id}-${Date.now().toString(36).toUpperCase()}`, 18, footerY + 4);

  const safeName = (patient.name || 'patient').replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
  doc.save(`DRISHTI_Screening_Report_${patient.id}_${safeName}.pdf`);
}
