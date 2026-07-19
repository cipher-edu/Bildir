"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Plus, Trash2 } from "lucide-react";
import { complianceApi } from "@/lib/api";
import { useI18n } from "@/i18n/I18nProvider";

type Risk = {
  id: string;
  title: string;
  description: string;
  level: string;
  status: string;
  owner_name?: string;
  due_date?: string | null;
};

function unwrapList<T>(res: { data?: unknown }): T[] {
  const body = res.data as { data?: T[] };
  return Array.isArray(body?.data) ? body.data : [];
}

export default function AdminRisksPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("medium");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-risks"],
    queryFn: async () => unwrapList<Risk>(await complianceApi.risks()),
  });

  const createMut = useMutation({
    mutationFn: () =>
      complianceApi.createRisk({ title, description, level, status: "open" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-risks"] });
      qc.invalidateQueries({ queryKey: ["compliance-kpi"] });
      setTitle("");
      setDescription("");
    },
  });

  const delMut = useMutation({
    mutationFn: (id: string) => complianceApi.deleteRisk(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-risks"] });
      qc.invalidateQueries({ queryKey: ["compliance-kpi"] });
    },
  });

  const items = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">{t("admin.risk")}</h1>
        <p className="text-sm text-slate-400 mt-1">{t("risk.subtitle")}</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim()) createMut.mutate();
        }}
        className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("risk.title")}
          className="w-full px-3 py-2.5 rounded-xl border border-white/10 bg-black/20 text-sm text-white"
          required
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl border border-white/10 bg-black/20 text-sm text-white"
        />
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="px-3 py-2 rounded-xl border border-white/10 bg-[#0a1020] text-sm text-white"
          >
            <option value="low">{t("risk.low")}</option>
            <option value="medium">{t("risk.medium")}</option>
            <option value="high">{t("risk.high")}</option>
            <option value="critical">{t("risk.critical")}</option>
          </select>
          <button
            type="submit"
            disabled={createMut.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold"
          >
            {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {t("common.create")}
          </button>
        </div>
      </form>

      {isLoading ? (
        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <div
              key={r.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div>
                <div className="flex gap-2 text-[10px] font-bold mb-1">
                  <span className="text-rose-300">{r.level}</span>
                  <span className="text-slate-500">{r.status}</span>
                </div>
                <p className="font-bold text-white text-sm">{r.title}</p>
                <p className="text-xs text-slate-500 mt-1">{r.description}</p>
              </div>
              <button
                type="button"
                onClick={() => delMut.mutate(r.id)}
                className="p-2 rounded-lg border border-rose-400/20 text-rose-300"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-sm text-slate-500 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {t("common.empty")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
