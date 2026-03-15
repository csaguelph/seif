import type { NextRequest } from "next/server";

import { getSession } from "~/server/better-auth/server";
import { uploadToR2 } from "~/server/r2";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const UPLOAD_TYPES = ["application-budget", "report-budget", "report-receipt"] as const;
type UploadType = (typeof UPLOAD_TYPES)[number];

const BUDGET_EXT = [".xlsx", ".xls"] as const;
const RECEIPT_EXT = [".xlsx", ".xls", ".pdf", ".png", ".jpg", ".jpeg"] as const;

const CONTENT_TYPES: Record<string, string> = {
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

function parseUploadType(type: string | null): UploadType | null {
  if (type && UPLOAD_TYPES.includes(type as UploadType)) return type as UploadType;
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = parseUploadType(searchParams.get("type"));
    if (!type) {
      return Response.json(
        { error: "Missing or invalid type. Use application-budget, report-budget, or report-receipt." },
        { status: 400 }
      );
    }

    if (type === "report-budget" || type === "report-receipt") {
      const session = await getSession();
      if (!session?.user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return Response.json(
        { error: "Missing or invalid file" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return Response.json(
        { error: "File too large (max 5 MB)" },
        { status: 400 }
      );
    }

    const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();

    if (type === "report-receipt") {
      if (!RECEIPT_EXT.includes(ext as (typeof RECEIPT_EXT)[number])) {
        return Response.json(
          { error: "Allowed: Excel (.xlsx, .xls), PDF, or images (.png, .jpg, .jpeg)" },
          { status: 400 }
        );
      }
    } else {
      // application | report-budget: Excel only
      if (!BUDGET_EXT.includes(ext as (typeof BUDGET_EXT)[number])) {
        return Response.json(
          { error: "Excel files only (.xlsx, .xls)" },
          { status: 400 }
        );
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";
    const prefix = type === "application-budget" ? "budgets" : "reports";

    const { url } = await uploadToR2(buffer, contentType, ext, prefix);

    return Response.json({ path: url });
  } catch (err) {
    console.error("Upload error:", err);
    return Response.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
