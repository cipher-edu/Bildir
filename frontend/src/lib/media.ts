/**
 * Media URL normalizatsiya:
 * - relative /media/... → same-origin (Next proxy)
 * - http://backend:8000/media/... → /media/...
 * - http://127.0.0.1:8000/media/... → /media/... (brauzer proxy orqali)
 */

const INTERNAL_HOSTS = new Set([
  "backend",
  "auth-starter-backend-1",
  "127.0.0.1",
  "localhost",
  "0.0.0.0",
]);

export function mediaUrl(path?: string | null): string | null {
  if (!path) return null;
  let p = String(path).trim();
  if (!p) return null;

  // Absolute URL
  if (p.startsWith("http://") || p.startsWith("https://")) {
    try {
      const u = new URL(p);
      if (INTERNAL_HOSTS.has(u.hostname) || u.hostname.endsWith(".local")) {
        // Docker ichki host yoki localhost backend → same-origin proxy
        return `${u.pathname}${u.search}`;
      }
      return p;
    } catch {
      return p;
    }
  }

  // Relative path
  if (!p.startsWith("/")) {
    p = `/${p}`;
  }
  // media bo'lmasa ham path qaytariladi
  return p;
}
