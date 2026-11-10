export const DOC_TYPE_LABEL: Record<string, string> = {
  gazette_notification: "Gazette notification",
  act: "Act",
  bill: "Bill",
  rule: "Rules",
  policy: "Policy",
  order: "Order",
  circular: "Circular",
  press_release: "Press release",
  parliamentary_question: "Parliamentary question",
  parliamentary_debate: "Parliamentary debate",
  committee_report: "Committee report",
  budget_document: "Budget document",
  tender: "Tender",
  report: "Report",
  other: "Other",
};

export const DOC_TYPES = Object.keys(DOC_TYPE_LABEL);

export type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

export const VERIFICATION: Record<string, { label: string; tone: Tone }> = {
  unverified: { label: "Unverified", tone: "neutral" },
  auto_matched: { label: "Auto-matched", tone: "info" },
  verified: { label: "Verified", tone: "success" },
  disputed: { label: "Disputed", tone: "warning" },
  retracted: { label: "Retracted", tone: "danger" },
};

export const EXTRACTION: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Pending", tone: "neutral" },
  extracted: { label: "Extracted", tone: "success" },
  ocr_extracted: { label: "OCR", tone: "info" },
  needs_review: { label: "Needs review", tone: "warning" },
  failed: { label: "Failed", tone: "danger" },
  not_applicable: { label: "N/A", tone: "neutral" },
};

export const RUN_STATUS: Record<string, { label: string; tone: Tone }> = {
  queued: { label: "Queued", tone: "neutral" },
  running: { label: "Running", tone: "info" },
  succeeded: { label: "Succeeded", tone: "success" },
  partial: { label: "Partial", tone: "warning" },
  failed: { label: "Failed", tone: "danger" },
};

export const LICENSE: Record<string, { label: string; tone: Tone }> = {
  unreviewed: { label: "Licence unreviewed", tone: "warning" },
  open_license: { label: "Open licence", tone: "success" },
  permitted_with_attribution: { label: "Permitted w/ attribution", tone: "success" },
  restricted: { label: "Restricted", tone: "danger" },
  prohibited: { label: "Prohibited", tone: "danger" },
};

export function lookup(table: Record<string, { label: string; tone: Tone }>, key: string | null | undefined) {
  return (key && table[key]) || { label: key ?? "—", tone: "neutral" as Tone };
}
