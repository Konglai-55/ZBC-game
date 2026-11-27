"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PurgeFile({ url }: { url: string }) {
  const router = useRouter();
  const [message,setMessage] = useState("");
  const [busy,setBusy] = useState(false);
  async function purge() {
    if (!confirm("彻底删除这个文件？存储中的文件将被移除，无法再恢复。")) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/uploads/purge",{ method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url}) });
      if (!response.ok) throw new Error((await response.json()).error);
      router.refresh();
    } catch(error) {setMessage((error as Error).message);} finally {setBusy(false);}
  }
  return <><button onClick={purge} disabled={busy}>彻底删除</button><span role="status">{message}</span></>;
}
