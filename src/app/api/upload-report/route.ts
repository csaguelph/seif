import type { NextRequest } from "next/server";

import { getSession } from "~/server/better-auth/server";
import { uploadReportFile } from "~/server/r2";

const RECEIPT_MAX_SIZE = 5 * 1024 * 1024;
const BUDGET_MAX_SIZE = 10 * 1024 * 1024;
const RECEIPT_EXT = [".xlsx", ".xls", ".pdf", ".png", ".jpg", ".jpeg"] as const;
const BUDGET_EXT = [".xlsx", ".xls"] as const;
const CONTENT_TYPES: Record<string, string> = {
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const isBudget = type === "budget";

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return Response.json(
        { error: "Missing or invalid file" },
        { status: 400 }
      );
    }

    if (file.size > (isBudget ? BUDGET_MAX_SIZE : RECEIPT_MAX_SIZE)) {
      return Response.json(
        { error: isBudget ? "File too large (max 10 MB)" : "File too large (max 5 MB per receipt)" },
        { status: 400 }
      );
    }

    const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
    if (isBudget) {
      if (!BUDGET_EXT.includes(ext as (typeof BUDGET_EXT)[number])) {
        return Response.json({ error: "Excel only (.xlsx, .xls)" }, { status: 400 });
      }
    } else {
      if (!RECEIPT_EXT.includes(ext as (typeof RECEIPT_EXT)[number])) {
        return Response.json(
          { error: "Allowed: Excel (.xlsx, .xls), PDF, or images (.png, .jpg, .jpeg)" },
          { status: 400 }
        );
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";

    const { url } = await uploadReportFile(buffer, contentType, ext);

    return Response.json({ path: url });
  } catch (err) {
    console.error("Report upload error:", err);
    return Response.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
