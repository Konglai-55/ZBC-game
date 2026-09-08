"use client";

import { useEffect, useRef, useState } from "react";
import type { DownloadSource, Game } from "@/lib/types";
import { Icon } from "@/components/icon";
import { mediaUrl } from "@/lib/media-url";

function ProviderIcon({ id }: { id: DownloadSource["id"] }) {
  const logo = id === "quark" ? "quark.svg" : id === "baidu" ? "baidu-pan.svg" : id === "xunlei" ? "xunlei.svg" : "mobile-cloud.svg";
  return <span className={`provider-icon provider-icon--${id}`}><img src={mediaUrl(`/brand/${logo}`)} alt="" aria-hidden="true" /></span>;
}

export function DownloadPanel({ game }: { game: Game }) {
  // A line is available only after its QR code has been configured. Legacy URL-only
  // records stay in the data for editing, but are intentionally hidden from visitors.
  const availableDownloads = game.downloads.filter((source) => Boolean(source.qrCode));
  const [selected, setSelected] = useState<DownloadSource | null>(null);
  const [copied, setCopied] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!selected) return;
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setSelected(null);
      window.requestAnimationFrame(() => triggerButtonRef.current?.focus());
    };

    window.addEventListener("keydown", close);
    document.body.classList.add("modal-open");
    closeButtonRef.current?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener("keydown", close);
      document.body.classList.remove("modal-open");
    };
  }, [selected]);

  function startDownload(source: DownloadSource, trigger: HTMLButtonElement) {
    triggerButtonRef.current = trigger;
    setCopied(false);
    setSelected(source);
  }

  function closeDownload() {
    setSelected(null);
    window.requestAnimationFrame(() => triggerButtonRef.current?.focus());
  }

  async function copyCode() {
    if (!selected?.code) return;
    await navigator.clipboard.writeText(selected.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <>
      <div className="download-panel">
        <div className="download-panel__head">
          <span className="download-panel__mark"><Icon name="cpu" size={21} /></span>
          <div><h3>{game.title} 免安装中文版</h3><p>更新时间：<strong>{game.updated}</strong> · 文件大小 {game.size}</p></div>
        </div>
        <div className="download-panel__alerts">
          <p><Icon name="cloud" size={17} />请使用手机网盘App客户端扫码，并将资源转存至个人网盘后再下载，避免下载限速。</p>
          <p><Icon name="warning" size={17} />为避免恶意采集及服务器资源浪费，下载线路统一通过二维码展示，敬请谅解。</p>
        </div>
        <div className="download-sources">
          {availableDownloads.length > 0 ? availableDownloads.map((source) => (
            <div className="download-source" key={source.id}>
              <ProviderIcon id={source.id} />
              <div><strong>{source.name}</strong>{source.recommended && <span className="recommend-pill">推荐</span>}{source.code && <small>提取码：{source.code}</small>}</div>
              <button type="button" onClick={(event) => startDownload(source, event.currentTarget)}>下载 <Icon name="arrow-right" size={16} /></button>
            </div>
          )) : <p className="download-sources__empty">暂无可用下载线路，请联系管理员补充。</p>}
        </div>
        <p className="download-panel__notice"><Icon name="warning" size={18} />下载后解压报错大概率是解压软件问题，建议优先使用官方稳定版本的解压工具。</p>
      </div>
      {selected && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeDownload()}>
          <section className={`download-modal download-modal--${selected.id}`} role="dialog" aria-modal="true" aria-labelledby="download-modal-title">
            <button className="modal-close" ref={closeButtonRef} type="button" aria-label="关闭弹窗" onClick={closeDownload}><Icon name="x" /></button>
            <h2 id="download-modal-title">手机扫码保存资源</h2>
            <p className="download-modal__lead">请使用{selected.name} App 扫码保存资源，再到电脑上下载即可！！</p>
            {selected.id === "quark" && <p className="download-modal__scan-tip">打开夸克 App - 点击搜索框右侧 - 扫码</p>}
            {selected.id === "baidu" && <p className="download-modal__scan-tip">打开百度网盘 App - 点击搜索框右侧 - 扫码</p>}
            <div className={selected.id === "quark" ? "download-modal__scan-layout" : "download-modal__scan-layout download-modal__scan-layout--single"}>
              <div className="download-qr" role="img" aria-label={`${selected.name}网盘二维码`}>
                {selected.qrCode ? <img src={mediaUrl(selected.qrCode)} alt={`${selected.name}网盘二维码`} /> : <span className="download-qr__status is-error"><Icon name="warning" size={20} />管理员尚未上传此网盘二维码</span>}
              </div>
              {selected.id === "quark" && <img className="download-modal__guide-image" src={mediaUrl("/brand/quark-scan-guide.jpg")} alt="夸克 App 扫码位置示意" />}
            </div>
            {selected.code && (
              <div className="copy-box"><span>提取码 <strong>{selected.code}</strong></span><button type="button" onClick={copyCode}><Icon name={copied ? "check" : "copy"} size={16} />{copied ? "已复制" : "复制"}</button></div>
            )}
            {selected.id === "quark" && <p className="download-modal__note">温馨提示：夸克新用户手机保存有1T的免费网盘空间，电脑上保存的话就只有10G的空间，一般是不够用的，如果没有的话，可以换个手机登录</p>}
            {selected.id === "baidu" && <p className="download-modal__note">建议先在百度网盘 App 内保存资源，再在电脑端下载。</p>}
            <div className="download-redirect-actions"><button className="button button--primary" type="button" onClick={closeDownload}>关闭</button></div>
            <small className="modal-hint">二维码由管理员在游戏下载配置中上传，请使用对应网盘 App 扫码。</small>
          </section>
        </div>
      )}
    </>
  );
}
