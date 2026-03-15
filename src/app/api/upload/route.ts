import { NextRequest } from "next/server";

import { uploadToR2 } from "~/server/r2";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXT = [".xlsx", ".xls"] as const;

const CONTENT_TYPES: Record<(typeof ALLOWED_EXT)[number], string> = {
  ".xlsx":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
};

export async function POST(req: NextRequest) {
  try {
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
        { error: "File too large (max 10MB)" },
        { status: 400 }
      );
    }

    const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
    if (!ALLOWED_EXT.includes(ext as (typeof ALLOWED_EXT)[number])) {
      return Response.json(
        { error: "Excel files only (.xlsx, .xls)" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType =
      CONTENT_TYPES[ext as (typeof ALLOWED_EXT)[number]] ?? "application/octet-stream";

    const { url } = await uploadToR2(buffer, contentType, ext);

    return Response.json({ path: url });
  } catch (err) {
    console.error("Upload error:", err);
    return Response.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
