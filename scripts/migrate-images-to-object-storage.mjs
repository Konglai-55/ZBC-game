import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { promises as fs } from "node:fs";
import path from "node:path";

const root = process.cwd();

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

const storage = {
  endpoint: process.env.OBJECT_STORAGE_ENDPOINT || "https://cn-nb1.rains3.com",
  region: process.env.OBJECT_STORAGE_REGION || "cn-nb1",
  bucket: process.env.OBJECT_STORAGE_BUCKET || "gameimg",
  accessKeyId: requiredEnv("OBJECT_STORAGE_ACCESS_KEY_ID"),
  secretAccessKey: requiredEnv("OBJECT_STORAGE_SECRET_ACCESS_KEY"),
};

const contentTypes = new Map([
  [".jpg", "image/jpeg"], [".jpeg", "image/jpeg"], [".png", "image/png"], [".webp", "image/webp"],
  [".gif", "image/gif"], [".avif", "image/avif"], [".svg", "image/svg+xml"],
]);

const client = new S3Client({
  endpoint: storage.endpoint,
  region: storage.region,
  forcePathStyle: true,
  credentials: { accessKeyId: storage.accessKeyId, secretAccessKey: storage.secretAccessKey },
});

async function walk(directory) {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(target));
    else if (contentTypes.has(path.extname(entry.name).toLowerCase())) files.push(target);
  }
  return files;
}

const publicDirectory = path.join(root, "public");
const files = await walk(publicDirectory);
const appIcon = path.join(root, "app", "icon.svg");
try { await fs.access(appIcon); files.push(appIcon); } catch {}

for (const file of files) {
  const key = file === appIcon ? "brand/icon.svg" : path.relative(publicDirectory, file).split(path.sep).join("/");
  await client.send(new PutObjectCommand({
    Bucket: storage.bucket,
    Key: key,
    Body: await fs.readFile(file),
    ContentType: contentTypes.get(path.extname(file).toLowerCase()),
    // Built-in assets keep stable names, so use a finite cache window to allow later replacements.
    CacheControl: "public, max-age=604800",
  }));
  console.log(`Uploaded ${key}`);
}

console.log(`Migrated ${files.length} images to object storage.`);
