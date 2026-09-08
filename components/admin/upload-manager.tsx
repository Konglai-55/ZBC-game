"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icon";
import type { UploadRecord } from "@/lib/types";

function formatSize(size: number) { return size >= 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`; }
export function UploadManager({ initialUploads }: { initialUploads: UploadRecord[] }) {
  const router = useRouter(); const [uploads, setUploads] = useState(initialUploads); const [loading, setLoading] = useState(false); const [notice, setNotice] = useState("");
  async function upload(file?: File) { if (!file) return; setLoading(true); setNotice(""); const formData = new FormData(); formData.set("file", file); const response = await fetch("/api/admin/uploads", { method: "POST", body: formData }); const result = await response.json() as { data?: UploadRecord; error?: string }; if (response.ok && result.data) { setUploads((current) => [result.data!, ...current]); setNotice(`${file.name} 上传完成，图片已生成对象存储外链`); router.refresh(); } else setNotice(result.error || "上传失败"); setLoading(false); }
  async function remove(file: UploadRecord) { if (!window.confirm(`确定删除文件“${file.name}”吗？引用它的内容不会自动清空。`)) return; const response = await fetch(`/api/admin/uploads/${encodeURIComponent(file.name)}`, { method: "DELETE" }); if (response.ok) { setUploads((current) => current.filter((item) => item.name !== file.name)); setNotice(`${file.name} 已删除`); router.refresh(); } }
  return <><div className="admin-upload-drop"><div><span className="admin-upload-drop__icon"><Icon name="download" size={25} /></span><strong>上传图片或常规附件</strong><p>支持 JPG、PNG、WebP、GIF、ZIP、7Z、RAR、PDF、TXT、JSON；图片最大 5 MB，其他附件最大 128 MB。</p></div><label className="admin-primary-button"><Icon name="download" size={17} />{loading ? "正在上传…" : "选择文件"}<input type="file" disabled={loading} accept=".jpg,.jpeg,.png,.webp,.gif,.zip,.7z,.rar,.pdf,.txt,.json" onChange={(event) => upload(event.target.files?.[0])} /></label></div>{notice && <p className="admin-form-message is-success" role="status">{notice}</p>}<div className="admin-file-grid">{uploads.map((file) => <article className="admin-file-card" key={file.name}>{file.kind === "image" ? <Image src={file.url} alt={file.name} width={260} height={120} /> : <div className="admin-file-card__placeholder"><Icon name={file.kind === "archive" ? "download" : "book"} size={30} /><span>{file.kind === "archive" ? "ARCHIVE" : "DOCUMENT"}</span></div>}<div><strong title={file.name}>{file.name}</strong><small>{formatSize(file.size)} · {new Date(file.updatedAt).toLocaleDateString("zh-CN")}</small><code>{file.url}</code></div><footer><a href={file.url} target="_blank" rel="noreferrer">预览 / 下载</a><button type="button" onClick={() => remove(file)}>删除</button></footer></article>)}</div>{uploads.length === 0 && <div className="admin-empty">文件库还没有上传内容。</div>}</>;
}
