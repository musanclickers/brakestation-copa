import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function uploadRegistrationPhoto(args: {
  ticketCode: string;
  buffer: Buffer;
  contentType: string;
}): Promise<string> {
  const ts = Date.now();
  const ym = new Date().toISOString().slice(0, 7);
  const ext = args.contentType === 'image/png' ? 'png' : 'jpg';
  const key = `registrations/${ym}/${args.ticketCode}_${ts}.${ext}`;

  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    Body: args.buffer,
    ContentType: args.contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }));

  return `${process.env.R2_PUBLIC_BASE_URL}/${key}`;
}

export async function deleteRegistrationPhoto(photoUrl: string): Promise<void> {
  const baseUrl = process.env.R2_PUBLIC_BASE_URL!;
  if (!photoUrl.startsWith(baseUrl)) return;
  const key = photoUrl.slice(baseUrl.length + 1);

  try {
    await r2.send(new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
    }));
  } catch {
    // best-effort cleanup
  }
}
