"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageCircleWarning } from "lucide-react";
import { complianceApi } from "@/lib/api";
import { useI18n } from "@/i18n/I18nProvider";

type Tip = {
  id: string;
  tracking_code: string;
  message: string;
  context?: string;
  status: string;
  admin_note?: string;
  created_at: string;
};

function unwrapList<T>(res: { data?: unknown }): T[] {
  const body = res.data as { data?: T[] };
  return Array.isArray(body?.data) ? body.data : [];
}

export default function AdminWhistlePage() {
  const { t } = useI18n();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-whistle"],
    queryFn: async () => unwrapList<Tip>(await complianceApi.whistleList()),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      complianceApi.whistleUpdate(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-whistle"] });
      qc.invalidateQueries({ queryKey: ["compliance-kpi"] });
    },
  });

  const items = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">{t("admin.whistle")}</h1>
        <p className="text-sm text-slate-400 mt-1">{t("whistle.subtitle")}</p>
      </div>

      {isLoading ? (
        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500 flex items-center gap-2">
          <MessageCircleWarning className="w-4 h-4" /> {t("common.empty")}
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((w) => (
            <article
              key={w.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-2"
            >
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="font-mono font-bold text-amber-200">
                  {w.tracking_code}
                </span>
                <span className="text-slate-500">
                  {new Date(w.created_at).toLocaleString()}
                </span>
                <span className="px-2 py-0.5 rounded-full border border-white/10 text-slate-300">
                  {w.status}
                </span>
              </div>
              <p className="text-sm text-slate-200 whitespace-pre-wrap">{w.message}</p>
              {w.context && (
                <p className="text-xs text-slate-500">Context: {w.context}</p>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                {["new", "reviewing", "closed"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={updateMut.isPending}
                    onClick={() => updateMut.mutate({ id: w.id, status: s })}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border ${
                      w.status === s
                        ? "bg-indigo-500/20 border-indigo-400/40 text-indigo-100"
                        : "border-white/10 text-slate-400 hover:bg-white/5"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
