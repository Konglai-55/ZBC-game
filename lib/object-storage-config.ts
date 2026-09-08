import "server-only";

export const objectStorageSourceConfig = {
  endpoint: process.env.OBJECT_STORAGE_ENDPOINT || "https://cn-nb1.rains3.com",
  region: process.env.OBJECT_STORAGE_REGION || "cn-nb1",
  bucket: process.env.OBJECT_STORAGE_BUCKET || "gameimg",
  accessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY_ID || "",
  secretAccessKey: process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY || "",
} as const;
