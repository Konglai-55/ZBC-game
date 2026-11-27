const fallbackPublicMediaUrl = "https://gameimg.cn-nb1.rains3.com";

// 公共访问域名直接写在源码中；它不包含任何私密凭据。
export const publicMediaUrl = fallbackPublicMediaUrl;

export function mediaUrl(source: string) {
  if (!source) return source;
  if (source.startsWith(publicMediaUrl + "/")) return "/media/" + source.slice(publicMediaUrl.length + 1);
  if (source.startsWith("/uploads/") && /\.(?:png|jpe?g|webp|gif|svg)$/i.test(source)) return "/media" + source;
  return source;
}

export function isManagedMediaUrl(value: string) {
  if (value.startsWith("/media/uploads/") || value.startsWith("/uploads/") || value.startsWith("/covers/") || value.startsWith("/brand/")) return true;
  try {
    return new URL(value).origin === new URL(publicMediaUrl).origin;
  } catch {
    return false;
  }
}
