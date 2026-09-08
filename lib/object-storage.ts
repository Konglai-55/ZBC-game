import "server-only";

import { DeleteObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { publicMediaUrl } from "@/lib/media-url";
import { objectStorageSourceConfig } from "@/lib/object-storage-config";

let client: S3Client | undefined;

function storageClient() {
  if (client) return client;
  const config = objectStorageSourceConfig;
  if (!config.accessKeyId || !config.secretAccessKey) {
    throw new Error("对象存储凭据未配置");
  }
  client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: true,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
  return client;
}

function encodeObjectKey(key: string) {
  return key.split("/").map(encodeURIComponent).join("/");
}

export function objectPublicUrl(key: string) {
  return `${publicMediaUrl}/${encodeObjectKey(key.replace(/^\/+/, ""))}`;
}

export async function putObject(key: string, body: Uint8Array, contentType: string) {
  const config = objectStorageSourceConfig;
  await storageClient().send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  }));
  return objectPublicUrl(key);
}

export async function deleteObject(key: string) {
  const config = objectStorageSourceConfig;
  await storageClient().send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
}

export type StoredObject = { key: string; size: number; updatedAt: string };

export async function listObjects(prefix: string): Promise<StoredObject[]> {
  const config = objectStorageSourceConfig;
  const objects: StoredObject[] = [];
  let continuationToken: string | undefined;
  do {
    const page = await storageClient().send(new ListObjectsV2Command({
      Bucket: config.bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    }));
    for (const item of page.Contents || []) {
      if (!item.Key || item.Key.endsWith("/")) continue;
      objects.push({ key: item.Key, size: item.Size || 0, updatedAt: (item.LastModified || new Date(0)).toISOString() });
    }
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);
  return objects;
}
