import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

import { env } from "~/env";

/**
 * S3-compatible client for Cloudflare R2.
 * @see https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/
 */
const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

const BUCKET = env.R2_BUCKET_NAME;

export type UploadResult = { key: string; url: string };

/**
 * Upload a buffer to R2 and return the public URL.
 * Key format: budgets/<uuid>.<ext> so we can prefix or list by folder later.
 */
export async function uploadToR2(
  body: Buffer,
  contentType: string,
  extension: string
): Promise<UploadResult> {
  const key = `budgets/${randomUUID()}${extension}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  const baseUrl = env.R2_PUBLIC_URL.replace(/\/$/, "");
  const url = `${baseUrl}/${key}`;

  return { key, url };
}

/** Upload report files (final budget, receipts). Key prefix: reports/ */
export async function uploadReportFile(
  body: Buffer,
  contentType: string,
  extension: string
): Promise<UploadResult> {
  const key = `reports/${randomUUID()}${extension}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  const baseUrl = env.R2_PUBLIC_URL.replace(/\/$/, "");
  const url = `${baseUrl}/${key}`;

  return { key, url };
}
