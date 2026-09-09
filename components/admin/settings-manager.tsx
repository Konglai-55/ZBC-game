"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icon";
import type { SiteSettings } from "@/lib/types";

export function SettingsManager({ initialSettings }: { initialSettings: SiteSettings }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    setError("");
    const formData = new FormData(event.currentTarget);
    const payload = {
      siteName: formData.get("siteName"),
      announcement: formData.get("announcement"),
      contactEmail: formData.get("contactEmail"),
      rightsEmail: formData.get("rightsEmail"),
      categoryIntroductions: {
        pc: formData.get("categoryIntroPc"),
        switch: formData.get("categoryIntroSwitch"),
        mobile: formData.get("categoryIntroMobile"),
        ps5: formData.get("categoryIntroPs5"),
        ps4: formData.get("categoryIntroPs4"),
      },
    };
    const response = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json() as { error?: string };
    if (response.ok) {
      setNotice("站点设置已保存，分类页蓝色文案也已同步更新。");
      router.refresh();
    } else {
      setError(result.error || "保存失败");
    }
    setSaving(false);
  }

  return (
    <form className="admin-settings-form" onSubmit={submit}>
      <section className="admin-panel-card">
        <div className="admin-panel-card__head"><div><span>BRAND IDENTITY</span><h2>站点品牌</h2></div><Icon name="sparkles" size={19} /></div>
        <div className="admin-form-grid">
          <label>站点名称<input name="siteName" defaultValue={initialSettings.siteName} required maxLength={40} /></label>
          <label className="admin-form-grid__full">首页公告<input name="announcement" defaultValue={initialSettings.announcement} required maxLength={120} /><small className="admin-field-help">用于前台公告信息，保持一句话即可。</small></label>
        </div>
      </section>
      <section className="admin-panel-card">
        <div className="admin-panel-card__head"><div><span>CATEGORY PAGE COPY</span><h2>教程 / 问题文案</h2></div><Icon name="book" size={19} /></div>
        <p className="admin-settings-intro">编辑各游戏分类页标题上方的蓝色说明文字，保存后前台对应页面立即更新。</p>
        <div className="admin-form-grid admin-copy-grid">
          <label>电脑游戏<textarea name="categoryIntroPc" rows={2} defaultValue={initialSettings.categoryIntroductions.pc} required maxLength={120} /></label>
          <label>Switch 游戏<textarea name="categoryIntroSwitch" rows={2} defaultValue={initialSettings.categoryIntroductions.switch} required maxLength={120} /></label>
          <label>手机游戏<textarea name="categoryIntroMobile" rows={2} defaultValue={initialSettings.categoryIntroductions.mobile} required maxLength={120} /></label>
          <label>PS5 游戏<textarea name="categoryIntroPs5" rows={2} defaultValue={initialSettings.categoryIntroductions.ps5} required maxLength={120} /></label>
          <label className="admin-form-grid__full">PS4 游戏<textarea name="categoryIntroPs4" rows={2} defaultValue={initialSettings.categoryIntroductions.ps4} required maxLength={120} /></label>
        </div>
      </section>
      <section className="admin-panel-card">
        <div className="admin-panel-card__head"><div><span>CONTACT CHANNELS</span><h2>联系与投诉邮箱</h2></div><Icon name="message" size={19} /></div>
        <div className="admin-form-grid">
          <label>联系邮箱<input name="contactEmail" type="email" defaultValue={initialSettings.contactEmail} required maxLength={200} /><small className="admin-field-help">用于“关于我们”和“版权声明”。</small></label>
          <label>侵权投诉邮箱<input name="rightsEmail" type="email" defaultValue={initialSettings.rightsEmail} required maxLength={200} /><small className="admin-field-help">用于“侵权处理”页面。</small></label>
        </div>
      </section>
      {(notice || error) && <p className={`admin-form-message ${error ? "is-error" : "is-success"}`} role={error ? "alert" : "status"}>{error || notice}</p>}
      <div className="admin-settings-actions"><button className="admin-primary-button" type="submit" disabled={saving}>{saving ? "正在保存…" : "保存站点设置"}<Icon name="check" size={17} /></button></div>
    </form>
  );
}
