/**
 * API gateway: brauzer → /api/v1/* → Django backend
 * ERR_CONNECTION_REFUSED (:8000) oldini oladi.
 */
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function backendBase(): string {
  return (
    process.env.INTERNAL_API_URL ||
    process.env.BACKEND_INTERNAL_URL ||
    "http://127.0.0.1:8000/api/v1"
  ).replace(/\/$/, "");
}

async function proxy(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const { path } = await ctx.params;
  const sub = (path || []).join("/");
  // Django APPEND_SLASH: trailing slash majburiy (POST redirect qila olmaydi)
  let url = `${backendBase()}/${sub}`;
  if (!url.endsWith("/")) {
    url += "/";
  }
  url += req.nextUrl.search;

  // undici fetch ba'zi hop-by-hop headerlarni qo'llab-quvvatlamaydi
  // (masalan Expect: 100-continue → UND_ERR_NOT_SUPPORTED / 500)
  const HOP_BY_HOP = new Set([
    "host",
    "connection",
    "content-length",
    "transfer-encoding",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "upgrade",
    "expect",
    "accept-encoding",
  ]);

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (HOP_BY_HOP.has(key.toLowerCase())) return;
    headers.set(key, value);
  });

  // Cookie (httpOnly JWT) brauzerdan proksi orqali backend ga
  const cookie = req.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: "manual",
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  try {
    let res = await fetch(url, init);

    // Django APPEND_SLASH — bitta redirect
    if ([301, 302, 307, 308].includes(res.status)) {
      const loc = res.headers.get("location");
      if (loc) {
        const nextUrl = loc.startsWith("http")
          ? loc
          : new URL(loc, url).toString();
        res = await fetch(nextUrl, init);
      }
    }

    const out = new Headers();
    res.headers.forEach((value, key) => {
      const k = key.toLowerCase();
      if (
        k === "transfer-encoding" ||
        k === "connection" ||
        k === "content-encoding"
      ) {
        return;
      }
      // Set-Cookie: bir nechta bo'lishi mumkin — getSetCookie (Node 18+)
      if (k === "set-cookie") return;
      out.set(key, value);
    });

    // httpOnly JWT cookie larni brauzerga o'tkazish
    const anyHeaders = res.headers as Headers & {
      getSetCookie?: () => string[];
    };
    const setCookies =
      typeof anyHeaders.getSetCookie === "function"
        ? anyHeaders.getSetCookie()
        : [];
    for (const c of setCookies) {
      out.append("set-cookie", c);
    }

    const buf = await res.arrayBuffer();
    return new NextResponse(buf, { status: res.status, headers: out });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Backendga ulanishda xatolik";
    console.error("[api-proxy]", url, message);
    return NextResponse.json(
      { success: false, detail: `API proksi xatosi: ${message}` },
      { status: 502 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
