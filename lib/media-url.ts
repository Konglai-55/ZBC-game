const fallbackPublicMediaUrl = "https://gameimg.cn-nb1.rains3.com";

// 公共访问域名直接写在源码中；它不包含任何私密凭据。
export const publicMediaUrl = fallbackPublicMediaUrl;

export function mediaUrl(source: string) {
  if (!source) return source;
  if (/^https?:\/\//i.test(source) || source.startsWith("data:") || source.startsWith("blob:")) return source;
  const pathname = source.startsWith("/") ? source : `/${source}`;
  return `${publicMediaUrl}${pathname}`;
}

export function isManagedMediaUrl(value: string) {
  if (value.startsWith("/uploads/") || value.startsWith("/covers/") || value.startsWith("/brand/")) return true;
  try {
    return new URL(value).origin === new URL(publicMediaUrl).origin;
  } catch {
    return false;
  }
}
