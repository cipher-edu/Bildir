"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Newspaper, Loader2, Plus, Pencil, Trash2, X, Save, Pin,
  Star, Search, Image as ImageIcon, ExternalLink,
} from "lucide-react";
import { newsApi } from "@/lib/api";
import { mediaUrl } from "@/lib/media";
import type { NewsArticle, NewsCategory, NewsStatus } from "@/types";

const RichTextEditor = dynamic(() => import("@/components/ui/RichTextEditor"), {
  ssr: false,
  loading: () => (
    <div className="h-56 rounded-2xl border border-white/10 bg-black/30 animate-pulse" />
  ),
});

function unwrap<T>(res: { data?: unknown }): T {
  const body = res.data as { data?: T } | T;
  if (body && typeof body === "object" && "data" in (body as object)) {
    return (body as { data: T }).data;
  }
  return body as T;
}

const CATEGORIES: { value: NewsCategory; label: string }[] = [
  { value: "general", label: "Umumiy yangilik" },
  { value: "announcement", label: "E'lon" },
  { value: "event", label: "Tadbir" },
  { value: "regulation", label: "Normativ / tartib" },
  { value: "anti_corruption", label: "Halollik / komplayens" },
];

const STATUSES: { value: NewsStatus; label: string; color: string }[] = [
  { value: "draft", label: "Qoralama", color: "text-slate-300 bg-slate-500/15 border-slate-400/25" },
  { value: "published", label: "Nashr", color: "text-emerald-200 bg-emerald-500/15 border-emerald-400/25" },
  { value: "archived", label: "Arxiv", color: "text-amber-200 bg-amber-500/15 border-amber-400/25" },
];

const emptyForm = {
  title: "",
  title_ru: "",
  title_en: "",
  title_kaa: "",
  summary: "",
  summary_ru: "",
  summary_en: "",
  summary_kaa: "",
  body: "<p></p>",
  body_ru: "",
  body_en: "",
  body_kaa: "",
  category: "general" as NewsCategory,
  status: "draft" as NewsStatus,
  is_featured: false,
  is_pinned: false,
  meta_title: "",
  meta_description: "",
};

type LangTab = "uz" | "ru" | "en" | "kaa";

export default function AdminNewsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [langTab, setLangTab] = useState<LangTab>("uz");
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-news", filterStatus],
    queryFn: async () => {
      const params: Record<string, string> = { all: "1" };
      if (filterStatus) params.status = filterStatus;
      return unwrap<NewsArticle[]>(await newsApi.list(params));
    },
  });

  const items = useMemo(() => {
    const list = data ?? [];
    if (!q.trim()) return list;
    const s = q.toLowerCase();
    return list.filter(
      (n) =>
        n.title.toLowerCase().includes(s) ||
        (n.summary || "").toLowerCase().includes(s)
    );
  }, [data, q]);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setLangTab("uz");
    setCover(null);
    setCoverPreview(null);
    setErr(null);
    setOpen(true);
  };

  const openEdit = async (row: NewsArticle) => {
    setErr(null);
    setEditId(row.id);
    setLangTab("uz");
    setCover(null);
    setCoverPreview(mediaUrl(row.cover_url || row.cover));
    try {
      const full = unwrap<NewsArticle>(await newsApi.detail(row.id));
      const ti = full.title_i18n || {};
      const si = full.summary_i18n || {};
      const bi = full.body_i18n || {};
      setForm({
        // Base maydonlar doim uz (i18n.uz yoki fallback)
        title: ti.uz || full.title || "",
        title_ru: ti.ru || "",
        title_en: ti.en || "",
        title_kaa: ti.kaa || "",
        summary: si.uz || full.summary || "",
        summary_ru: si.ru || "",
        summary_en: si.en || "",
        summary_kaa: si.kaa || "",
        body: bi.uz || full.body || "<p></p>",
        body_ru: bi.ru || "",
        body_en: bi.en || "",
        body_kaa: bi.kaa || "",
        category: full.category || "general",
        status: full.status || "draft",
        is_featured: !!full.is_featured,
        is_pinned: !!full.is_pinned,
        meta_title: full.meta_title || "",
        meta_description: full.meta_description || "",
      });
      setCoverPreview(mediaUrl(full.cover_url || full.cover));
      setOpen(true);
    } catch {
      setErr("Yangilikni yuklab bo'lmadi");
    }
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("summary", form.summary);
      fd.append("body", form.body);
      // Multi-lang — backend merge_i18n_payload (title_ru → title_i18n)
      fd.append("title_uz", form.title);
      if (form.title_ru) fd.append("title_ru", form.title_ru);
      if (form.title_en) fd.append("title_en", form.title_en);
      if (form.title_kaa) fd.append("title_kaa", form.title_kaa);
      fd.append("summary_uz", form.summary);
      if (form.summary_ru) fd.append("summary_ru", form.summary_ru);
      if (form.summary_en) fd.append("summary_en", form.summary_en);
      if (form.summary_kaa) fd.append("summary_kaa", form.summary_kaa);
      fd.append("body_uz", form.body);
      if (form.body_ru) fd.append("body_ru", form.body_ru);
      if (form.body_en) fd.append("body_en", form.body_en);
      if (form.body_kaa) fd.append("body_kaa", form.body_kaa);
      fd.append("category", form.category);
      fd.append("status", form.status);
      fd.append("is_featured", form.is_featured ? "true" : "false");
      fd.append("is_pinned", form.is_pinned ? "true" : "false");
      fd.append("meta_title", form.meta_title);
      fd.append("meta_description", form.meta_description);
      if (cover) fd.append("cover", cover);
      if (editId) return newsApi.update(editId, fd);
      return newsApi.create(fd);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-news"] });
      qc.invalidateQueries({ queryKey: ["landing-news"] });
      setOpen(false);
      setEditId(null);
      setForm(emptyForm);
      setCover(null);
      setCoverPreview(null);
      setErr(null);
    },
    onError: (e: unknown) => {
      const ax = e as { response?: { data?: { detail?: unknown } } };
      const d = ax.response?.data?.detail;
      if (typeof d === "string") setErr(d);
      else if (d && typeof d === "object") setErr(JSON.stringify(d));
      else setErr("Saqlashda xatolik");
    },
  });

  const delMut = useMutation({
    mutationFn: (id: string) => newsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-news"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-indigo-300/80 mb-2">
            <Newspaper className="w-3.5 h-3.5" />
            Yangiliklar moduli
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Yangiliklar boshqaruvi
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-xl">
            E&apos;lon, tadbir va komplayens yangiliklarini yozing, nashr qiling va landingda ko&apos;rsating.
            Matn — zamonaviy rich-text muharrir orqali.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold shadow-lg shadow-indigo-900/30"
        >
          <Plus className="w-4 h-4" />
          Yangi yangilik
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Qidirish…"
            className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-400/40"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-white/10 bg-[#0a1020] text-sm text-slate-200"
        >
          <option value="">Barcha holatlar</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-slate-500 text-sm">
          Hozircha yangilik yo&apos;q. «Yangi yangilik» tugmasidan boshlang.
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((n) => {
            const st = STATUSES.find((s) => s.value === n.status);
            const img = mediaUrl(n.cover_url || n.cover);
            return (
              <article
                key={n.id}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 sm:p-5 flex flex-col sm:flex-row gap-4"
              >
                <div className="w-full sm:w-36 h-28 sm:h-24 rounded-xl overflow-hidden bg-slate-900 border border-white/10 shrink-0">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                      <ImageIcon className="w-7 h-7" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st?.color || ""}`}>
                      {st?.label || n.status}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {n.category_label || n.category}
                    </span>
                    {n.is_pinned && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-300">
                        <Pin className="w-3 h-3" /> Pin
                      </span>
                    )}
                    {n.is_featured && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-cyan-300">
                        <Star className="w-3 h-3" /> Featured
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white truncate">{n.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{n.summary || "—"}</p>
                  <p className="text-[10px] text-slate-600 mt-2">
                    {n.published_at
                      ? new Date(n.published_at).toLocaleString("uz-UZ")
                      : "Nashr vaqti yo'q"}{" "}
                    · /news/{n.slug}
                  </p>
                </div>
                <div className="flex sm:flex-col gap-2 shrink-0">
                  {n.status === "published" && (
                    <a
                      href={`/news/${n.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-xs text-slate-300 hover:bg-white/5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Ko&apos;rish
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => openEdit(n)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-indigo-400/25 bg-indigo-500/10 text-xs text-indigo-200 hover:bg-indigo-500/20"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Tahrir
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("O'chirishni tasdiqlaysizmi?")) delMut.mutate(n.id);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-rose-400/25 bg-rose-500/10 text-xs text-rose-200 hover:bg-rose-500/20"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> O&apos;chirish
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal form */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Yopish"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-white/10 bg-[#070d1c] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 border-b border-white/[0.07] bg-[#070d1c]/95 backdrop-blur-md">
              <div>
                <p className="text-sm font-bold text-white">
                  {editId ? "Yangilikni tahrirlash" : "Yangi yangilik"}
                </p>
                <p className="text-[11px] text-slate-500">Rich-text muharrir · CKEditor uslubi</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {err && (
                <div className="text-sm text-rose-300 bg-rose-500/10 border border-rose-400/25 rounded-xl px-3 py-2">
                  {err}
                </div>
              )}

              {/* Til tanlash — uz / ru / en / kaa */}
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { id: "uz", label: "Oʻzbekcha" },
                    { id: "ru", label: "Русский" },
                    { id: "en", label: "English" },
                    { id: "kaa", label: "Qaraqalpaqsha" },
                  ] as { id: LangTab; label: string }[]
                ).map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setLangTab(l.id)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                      langTab === l.id
                        ? "bg-indigo-600 text-white border-indigo-400/40"
                        : "bg-white/[0.03] text-slate-400 border-white/10 hover:text-white"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                  Sarlavha {langTab === "uz" ? "*" : `(${langTab})`}
                </label>
                <input
                  value={
                    langTab === "uz"
                      ? form.title
                      : langTab === "ru"
                        ? form.title_ru
                        : langTab === "en"
                          ? form.title_en
                          : form.title_kaa
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((f) =>
                      langTab === "uz"
                        ? { ...f, title: v }
                        : langTab === "ru"
                          ? { ...f, title_ru: v }
                          : langTab === "en"
                            ? { ...f, title_en: v }
                            : { ...f, title_kaa: v }
                    );
                  }}
                  className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-sm text-white focus:outline-none focus:border-indigo-400/40"
                  placeholder={
                    langTab === "uz"
                      ? "Masalan: Komplayens oyining ochilishi"
                      : `Title (${langTab})`
                  }
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                  Qisqa tavsif {langTab !== "uz" ? `(${langTab})` : ""}
                </label>
                <textarea
                  value={
                    langTab === "uz"
                      ? form.summary
                      : langTab === "ru"
                        ? form.summary_ru
                        : langTab === "en"
                          ? form.summary_en
                          : form.summary_kaa
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((f) =>
                      langTab === "uz"
                        ? { ...f, summary: v }
                        : langTab === "ru"
                          ? { ...f, summary_ru: v }
                          : langTab === "en"
                            ? { ...f, summary_en: v }
                            : { ...f, summary_kaa: v }
                    );
                  }}
                  rows={2}
                  className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-sm text-white focus:outline-none focus:border-indigo-400/40 resize-none"
                  placeholder="Kartochka uchun 1–2 jumla"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                    Kategoriya
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, category: e.target.value as NewsCategory }))
                    }
                    className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-white/10 bg-[#0a1020] text-sm text-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                    Holat
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, status: e.target.value as NewsStatus }))
                    }
                    className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-white/10 bg-[#0a1020] text-sm text-white"
                  >
                    {STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_featured}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, is_featured: e.target.checked }))
                    }
                    className="rounded border-white/20"
                  />
                  Featured (asosiy)
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_pinned}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, is_pinned: e.target.checked }))
                    }
                    className="rounded border-white/20"
                  />
                  Yuqoriga mahkamlash (pin)
                </label>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                  Muqova rasm
                </label>
                <div className="mt-1.5 flex flex-wrap items-center gap-3">
                  {coverPreview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverPreview}
                      alt=""
                      className="w-28 h-20 object-cover rounded-xl border border-white/10"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setCover(f);
                      if (f) setCoverPreview(URL.createObjectURL(f));
                    }}
                    className="text-xs text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 block">
                  Asosiy matn {langTab === "uz" ? "*" : `(${langTab})`}
                </label>
                <RichTextEditor
                  key={`body-${langTab}-${editId || "new"}`}
                  value={
                    langTab === "uz"
                      ? form.body
                      : langTab === "ru"
                        ? form.body_ru || "<p></p>"
                        : langTab === "en"
                          ? form.body_en || "<p></p>"
                          : form.body_kaa || "<p></p>"
                  }
                  onChange={(html) =>
                    setForm((f) =>
                      langTab === "uz"
                        ? { ...f, body: html }
                        : langTab === "ru"
                          ? { ...f, body_ru: html }
                          : langTab === "en"
                            ? { ...f, body_en: html }
                            : { ...f, body_kaa: html }
                    )
                  }
                  placeholder="To'liq yangilik matni…"
                  minHeight="260px"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                    SEO title
                  </label>
                  <input
                    value={form.meta_title}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, meta_title: e.target.value }))
                    }
                    className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                    SEO description
                  </label>
                  <input
                    value={form.meta_description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, meta_description: e.target.value }))
                    }
                    className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-sm text-white"
                  />
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-sm text-slate-300"
                >
                  Bekor
                </button>
                <button
                  type="button"
                  disabled={saveMut.isPending || !form.title.trim()}
                  onClick={() => saveMut.mutate()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold disabled:opacity-50"
                >
                  {saveMut.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Saqlash
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
