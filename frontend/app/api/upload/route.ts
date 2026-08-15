import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { parseDataFile } from "@/lib/engine/csv";
import { extractEvidence, IngestedFile, resetEvidenceCounter } from "@/lib/engine/evidence";
import { validateUpload, sanitizeText } from "@/lib/engine/validation";
import {
  getInvestigation,
  saveEvidence,
  saveUploads,
  getEvidence,
  getUploads,
} from "@/lib/storage";
import type { UploadedFileSummary } from "@/lib/engine/types";

export async function POST(request: Request) {
  const auth = requireAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  try {
    const formData = await request.formData();
    const investigationId = formData.get("investigationId") as string;
    if (!investigationId) {
      return NextResponse.json({ error: "investigationId is required." }, { status: 400 });
    }
    const inv = getInvestigation(investigationId);
    if (!inv) return NextResponse.json({ error: "Investigation not found." }, { status: 404 });

    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });

    const validation = validateUpload(file.name, file.size, file.type);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const text = await file.text();
    const { kind, csvRows, jsonData, rawText } = parseDataFile(text, file.name);

    const ingested: IngestedFile = {
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      kind,
      csvRows,
      jsonData,
      rawText,
    };

    // Extract evidence
    resetEvidenceCounter();
    const existingEvidence = getEvidence(investigationId);
    const { evidence: newEvidence, summaries, errors } = extractEvidence([ingested]);
    const allEvidence = [...existingEvidence, ...newEvidence];
    saveEvidence(investigationId, allEvidence);

    // Save upload summary
    const existingUploads = getUploads(investigationId);
    const summary: UploadedFileSummary = {
      id: `upload_${Date.now().toString(36)}`,
      investigationId,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      contentType: summaries[0]?.type ?? "dataset",
      uploadedAt: new Date().toISOString(),
      summary: summaries[0] ?? {
        fileName: file.name,
        type: "unknown",
        sizeBytes: file.size,
        rowCount: 0,
        columns: [],
        qualityWarnings: [],
        missingValueCount: 0,
        duplicateCount: 0,
        dateFields: [],
        possibleIdentifiers: [],
        evidenceCount: 0,
      },
      evidenceIds: newEvidence.map((e) => e.id),
    };
    saveUploads(investigationId, [...existingUploads, summary]);

    return NextResponse.json({
      upload: summary,
      newEvidenceCount: newEvidence.length,
      totalEvidenceCount: allEvidence.length,
      errors,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
