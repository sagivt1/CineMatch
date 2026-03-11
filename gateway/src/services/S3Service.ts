import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "node:crypto";

const allowedContentTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getS3Config() {
  return {
    endpoint: requireEnv("S3_ENDPOINT_URL"),
    region: requireEnv("S3_REGION"),
    bucketName: requireEnv("S3_BUCKET_NAME"),
    accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
  };
}

function getS3Client() {
  const s3Config = getS3Config();

  return new S3Client({
    region: s3Config.region,
    endpoint: s3Config.endpoint,
    credentials: {
      accessKeyId: s3Config.accessKeyId,
      secretAccessKey: s3Config.secretAccessKey,
    },
    forcePathStyle: true,
  });
}

function getExtensionFromContentType(contentType: string): string {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      throw new Error("Unsupported content type");
  }
}

export function validateAvatarContentType(contentType: string) {
  if (!allowedContentTypes.has(contentType)) {
    throw new Error("Unsupported avatar content type");
  }
}

export function buildAvatarFileKey(userId: string, contentType: string): string {
  const ext = getExtensionFromContentType(contentType);
  return `avatars/${userId}/${crypto.randomUUID()}.${ext}`;
}

export function buildPublicFileUrl(fileKey: string): string {
  const s3Config = getS3Config();
  const baseUrl = s3Config.endpoint.replace("s3-storage", "localhost");
  return `${baseUrl}/${s3Config.bucketName}/${fileKey}`;
}

export async function createAvatarUploadUrl(userId: string, contentType: string) {
  validateAvatarContentType(contentType);

  const s3Config = getS3Config();
  const s3Client = getS3Client();
  const fileKey = buildAvatarFileKey(userId, contentType);

  const command = new PutObjectCommand({
    Bucket: s3Config.bucketName,
    Key: fileKey,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  return {
    uploadUrl,
    fileKey,
    publicUrl: buildPublicFileUrl(fileKey),
  };
}

export async function deleteObject(fileKey: string) {
  const s3Config = getS3Config();
  const s3Client = getS3Client();

  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: s3Config.bucketName,
      Key: fileKey,
    }),
  );
}
