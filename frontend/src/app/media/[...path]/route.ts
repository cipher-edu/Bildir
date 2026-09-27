/**
 * Media gateway: brauzer → /media/* → Django backend media
 * Docker ichida absolute URL "backend:8000" bo'lib qolmasin.
 */
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function backendOrigin(): string {
  // INTERNAL_API_URL: http://backend:8000/api/v1 → http://backend:8000
  const api =
    process.env.INTERNAL_API_URL ||
    process.env.BACKEND_INTERNAL_URL ||
    "http://127.0.0.1:8000/api/v1";
  try {
    const u = new URL(api);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "http://127.0.0.1:8000";
  }
}

async function proxyMedia(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const { path } = await ctx.params;
  const sub = (path || []).join("/");
  const url = `${backendOrigin()}/media/${sub}${req.nextUrl.search}`;

  try {
    const headersIn = new Headers();
    headersIn.set("Accept", req.headers.get("accept") || "*/*");
    const cookie = req.headers.get("cookie");
    if (cookie) headersIn.set("cookie", cookie);

    const res = await fetch(url, {
      method: req.method,
      headers: headersIn,
      redirect: "follow",
    });

    if (!res.ok) {
      return new NextResponse(null, { status: res.status });
    }

    const headers = new Headers();
    const ct = res.headers.get("content-type");
    if (ct) headers.set("content-type", ct);
    const cl = res.headers.get("content-length");
    if (cl) headers.set("content-length", cl);
    const cc = res.headers.get("cache-control");
    const cd = res.headers.get("content-disposition");
    const nosniff = res.headers.get("x-content-type-options");
    if (cd) headers.set("content-disposition", cd);
    if (nosniff) headers.set("x-content-type-options", nosniff);
    headers.set("cache-control", cc || "private, no-store");

    const buf = await res.arrayBuffer();
    return new NextResponse(buf, { status: 200, headers });
  } catch (e) {
    console.error("[media-proxy]", url, e);
    return NextResponse.json({ detail: "Media proxy xato" }, { status: 502 });
  }
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
) {
  return proxyMedia(req, ctx);
}

export async function HEAD(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
) {
  return proxyMedia(req, ctx);
}
