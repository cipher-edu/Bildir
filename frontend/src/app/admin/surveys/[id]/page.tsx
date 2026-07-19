"use client";

import { Suspense, use, useCallback, useEffect, useMemo, useRef, useState, type ElementType } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Plus, Trash2, Pencil, X, Save, Send, Ban,
  QrCode, BarChart3, Users, Copy, Check, AlertCircle,
  GripVertical, RefreshCw, CheckSquare, Square, MinusSquare,
  Layers, ListChecks, Search, Building2, GraduationCap,
} from "lucide-react";
import { surveysApi, catalogApi } from "@/lib/api";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useToast } from "@/components/ToastProvider";
import type {
  SurveyDetail, SurveyQuestion, SurveyQType, SurveyResults, SurveyParticipation,
} from "@/types";

const Q_TYPES: { value: SurveyQType; label: string }[] = [
  { value: "single", label: "Bir tanlov" },
  { value: "multiple", label: "Ko'p tanlov" },
  { value: "text", label: "Yozma (qisqa)" },
  { value: "textarea", label: "Yozma (batafsil)" },
  { value: "rating", label: "Yulduz" },
  { value: "nps", label: "NPS 0–10" },
  { value: "likert", label: "Likert 1–5" },
];

const STATUS_LABEL: Record<string, string> = {
  draft: "Qoralama", published: "Nashr", closed: "Yopilgan", archived: "Arxiv",
};

function unwrapData<T>(res: { data?: { data?: T } | T }): T {
  const p = res.data as { data?: T } | T | undefined;
  if (p && typeof p === "object" && "data" in (p as object) && (p as { data: T }).data !== undefined) {
    return (p as { data: T }).data;
  }
  return p as T;
}

function apiErrorMessage(err: unknown, fallback: string): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object") {
    try {
      const parts: string[] = [];
      for (const [k, v] of Object.entries(detail as Record<string, unknown>)) {
        const msg = Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : String(v);
        parts.push(`${k}: ${msg}`);
      }
      if (parts.length) return parts.join("; ");
    } catch { /* ignore */ }
  }
  return fallback;
}

type Tab = "settings" | "questions" | "results" | "people";

const emptyQuestion = (): Partial<SurveyQuestion> & { q_type: SurveyQType } => ({
  q_type: "single",
  text: "",
  help_text: "",
  required: true,
  options: [{ text: "Variant 1" }, { text: "Variant 2" }],
  settings: {},
  order: 0,
});

type SettingsForm = {
  title: string;
  description: string;
  audience: string;
  privacy_mode: string;
  stats_level: string;
  track_participation: boolean;
  start_at: string;
  end_at: string;
  study_years: string;
  faculty_ids: string[];
  group_ids: string[];
};

type CatalogGroup = {
  id: string;
  name: string;
  study_year?: number | null;
  specialty_id?: string | null;
  specialty_name?: string | null;
  faculty_id?: string | null;
};

function surveyToSettings(survey: SurveyDetail): SettingsForm {
  return {
    title: survey.title,
    description: survey.description || "",
    audience: survey.audience,
    privacy_mode: survey.privacy_mode,
    stats_level: survey.stats_level,
    track_participation: survey.track_participation !== false,
    start_at: survey.start_at ? survey.start_at.slice(0, 16) : "",
    end_at: survey.end_at ? survey.end_at.slice(0, 16) : "",
    study_years: (survey.study_years || []).join(","),
    faculty_ids: (survey.faculties || []).map(String),
    group_ids: (survey.groups || []).map(String),
  };
}

function AdminSurveyDetailInner({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isReady } = useRoleGuard(["staff"]);
  const qc = useQueryClient();
  const { showSuccess, showError } = useToast();

  const canEdit = ["admin", "superadmin"].includes(user?.role ?? "");
  const canResults = ["admin", "superadmin", "audit_inspector"].includes(user?.role ?? "");

  const tabFromUrl = searchParams.get("tab") as Tab | null;
  const initialTab: Tab =
    tabFromUrl && ["settings", "questions", "results", "people"].includes(tabFromUrl)
      ? tabFromUrl
      : "settings";

  const [tab, setTab] = useState<Tab>(initialTab);
  const [copied, setCopied] = useState(false);
  const [qForm, setQForm] = useState<ReturnType<typeof emptyQuestion> | null>(null);
  const [editingQid, setEditingQid] = useState<string | null>(null);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const settingsDirtyRef = useRef(false);
  const lastSyncedAt = useRef<string | null>(null);
  const autoOpenedQuestions = useRef(false);

  const setTabNav = useCallback(
    (t: Tab) => {
      setTab(t);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", t);
      router.replace(`/admin/surveys/${id}?${params.toString()}`, { scroll: false });
    },
    [id, router, searchParams]
  );

  const {
    data: survey,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-survey", id],
    queryFn: async () => unwrapData<SurveyDetail>(await surveysApi.detail(id)),
    enabled: !!id && isReady && canResults,
    staleTime: 10_000,
    // Qayta fetch formani o'chirmasin — faqat background yangilanish
    refetchOnWindowFocus: false,
  });

  const { data: faculties } = useQuery({
    queryKey: ["catalog-faculties"],
    queryFn: async () => {
      const res = await catalogApi.faculties();
      const raw = res.data?.data ?? res.data ?? [];
      return Array.isArray(raw) ? (raw as { id: string; name: string }[]) : [];
    },
    staleTime: 60_000,
    enabled: isReady && canResults,
  });

  const [groupSearch, setGroupSearch] = useState("");
  const [groupYearFilter, setGroupYearFilter] = useState<string>("all");
  /** ommaviy = cheklov yo'q / barcha; donalab = ro'yxatdan tanlash */
  const [facultyMode, setFacultyMode] = useState<"all" | "pick">("all");
  const [groupMode, setGroupMode] = useState<"all" | "pick">("all");
  const targetingModesSynced = useRef(false);

  const { data: results, refetch: refetchResults, isLoading: resultsLoading } = useQuery({
    queryKey: ["survey-results", id],
    queryFn: async () => unwrapData<SurveyResults>(await surveysApi.results(id)),
    enabled: tab === "results" && canResults && !!id,
    refetchOnWindowFocus: false,
  });

  const { data: people, isLoading: peopleLoading } = useQuery({
    queryKey: ["survey-participations", id],
    queryFn: async () => {
      const res = await surveysApi.participations(id);
      const raw = unwrapData<SurveyParticipation[]>(res);
      return Array.isArray(raw) ? raw : [];
    },
    enabled: tab === "people" && canResults && !!id && survey?.track_participation !== false,
    refetchOnWindowFocus: false,
  });

  const [settings, setSettings] = useState<SettingsForm>({
    title: "",
    description: "",
    audience: "students",
    privacy_mode: "anonymous",
    stats_level: "coarse",
    track_participation: true,
    start_at: "",
    end_at: "",
    study_years: "",
    faculty_ids: [],
    group_ids: [],
  });

  // Tanlangan fakultet(lar) bo'yicha guruhlar
  const facultyIdsKey = settings.faculty_ids.slice().sort().join(",");
  const { data: facultyGroups = [], isFetching: groupsLoading } = useQuery({
    queryKey: ["catalog-groups-by-faculties", facultyIdsKey],
    queryFn: async () => {
      if (!settings.faculty_ids.length) return [] as CatalogGroup[];
      const res = await catalogApi.groups(undefined, undefined, settings.faculty_ids);
      const raw = res.data?.data ?? res.data ?? [];
      return Array.isArray(raw) ? (raw as CatalogGroup[]) : [];
    },
    enabled: isReady && canResults && settings.faculty_ids.length > 0,
    staleTime: 30_000,
  });

  // Faqat birinchi yuklash yoki saqlashdan keyin (dirty emas) sozlamalarni sinxronlash
  useEffect(() => {
    if (!survey) return;
    const stamp = survey.updated_at || survey.id;
    if (settingsDirtyRef.current && lastSyncedAt.current !== null) {
      // Foydalanuvchi tahrirlayotgan bo'lsa — faqat boshqa maydonlar (savollar) yangilansin
      return;
    }
    if (lastSyncedAt.current === stamp) return;
    lastSyncedAt.current = stamp;
    setSettings(surveyToSettings(survey));
    setSettingsDirty(false);
    settingsDirtyRef.current = false;
    if (!targetingModesSynced.current) {
      targetingModesSynced.current = true;
      setFacultyMode((survey.faculties || []).length > 0 ? "pick" : "all");
      setGroupMode((survey.groups || []).length > 0 ? "pick" : "all");
    }
  }, [survey]);

  // URL tab o'zgarsa
  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== tab && ["settings", "questions", "results", "people"].includes(tabFromUrl)) {
      setTab(tabFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabFromUrl]);

  // Yangi draft — avval auditoriya (fakultet/guruh) sozlamalari
  useEffect(() => {
    if (!survey || autoOpenedQuestions.current) return;
    if (survey.status === "draft" && !(survey.questions?.length)) {
      autoOpenedQuestions.current = true;
      // URL da tab berilmagan bo'lsa — sozlamalar (targetlash)
      if (!tabFromUrl) setTabNav("settings");
    }
  }, [survey, tabFromUrl, setTabNav]);

  const isDraft = survey?.status === "draft";
  const isPublished = survey?.status === "published";

  const updateSettings = useCallback((patch: Partial<SettingsForm> | ((s: SettingsForm) => SettingsForm)) => {
    setSettingsDirty(true);
    settingsDirtyRef.current = true;
    setSettings((prev) => (typeof patch === "function" ? patch(prev) : { ...prev, ...patch }));
  }, []);

  const facultyList = faculties || [];
  const allFacultyIds = useMemo(
    () => facultyList.map((f) => String(f.id)),
    [facultyList]
  );

  const toggleFaculty = useCallback((facultyId: string) => {
    const fid = String(facultyId);
    setFacultyMode("pick");
    updateSettings((s) => {
      const checked = s.faculty_ids.includes(fid);
      if (checked) {
        const remainingFac = s.faculty_ids.filter((x) => x !== fid);
        if (!remainingFac.length) {
          return { ...s, faculty_ids: [], group_ids: [] };
        }
        const knownByFac = new Map(
          facultyGroups.map((g) => [String(g.id), String(g.faculty_id || "")])
        );
        return {
          ...s,
          faculty_ids: remainingFac,
          group_ids: s.group_ids.filter((gid) => {
            const gFac = knownByFac.get(gid);
            if (gFac === undefined) return false;
            return remainingFac.includes(gFac);
          }),
        };
      }
      return { ...s, faculty_ids: [...s.faculty_ids, fid] };
    });
  }, [facultyGroups, updateSettings]);

  const selectAllFaculties = useCallback(() => {
    setFacultyMode("pick");
    updateSettings((s) => ({
      ...s,
      faculty_ids: [...allFacultyIds],
    }));
  }, [allFacultyIds, updateSettings]);

  const clearAllFaculties = useCallback(() => {
    setFacultyMode("pick");
    updateSettings({ faculty_ids: [], group_ids: [] });
  }, [updateSettings]);

  const setFacultyModeAll = useCallback(() => {
    setFacultyMode("all");
    setGroupMode("all");
    updateSettings({ faculty_ids: [], group_ids: [] });
  }, [updateSettings]);

  const setFacultyModePick = useCallback(() => {
    setFacultyMode("pick");
  }, []);

  const toggleGroup = useCallback((groupId: string) => {
    const gid = String(groupId);
    setGroupMode("pick");
    updateSettings((s) => ({
      ...s,
      group_ids: s.group_ids.includes(gid)
        ? s.group_ids.filter((x) => x !== gid)
        : [...s.group_ids, gid],
    }));
  }, [updateSettings]);

  const filteredGroups = useMemo(() => {
    let list = facultyGroups;
    if (groupYearFilter !== "all") {
      const y = parseInt(groupYearFilter, 10);
      list = list.filter((g) => g.study_year === y);
    }
    if (groupSearch.trim()) {
      const q = groupSearch.trim().toLowerCase();
      list = list.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          (g.specialty_name || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [facultyGroups, groupYearFilter, groupSearch]);

  const groupYears = useMemo(() => {
    const years = new Set<number>();
    for (const g of facultyGroups) {
      if (g.study_year != null) years.add(g.study_year);
    }
    return Array.from(years).sort((a, b) => a - b);
  }, [facultyGroups]);

  const selectAllVisibleGroups = useCallback(() => {
    setGroupMode("pick");
    updateSettings((s) => {
      const ids = new Set(s.group_ids);
      for (const g of filteredGroups) ids.add(String(g.id));
      return { ...s, group_ids: Array.from(ids) };
    });
  }, [filteredGroups, updateSettings]);

  const selectAllLoadedGroups = useCallback(() => {
    setGroupMode("pick");
    updateSettings((s) => ({
      ...s,
      group_ids: facultyGroups.map((g) => String(g.id)),
    }));
  }, [facultyGroups, updateSettings]);

  const clearVisibleGroups = useCallback(() => {
    setGroupMode("pick");
    updateSettings((s) => {
      const remove = new Set(filteredGroups.map((g) => String(g.id)));
      return { ...s, group_ids: s.group_ids.filter((id) => !remove.has(id)) };
    });
  }, [filteredGroups, updateSettings]);

  const clearAllGroups = useCallback(() => {
    setGroupMode("pick");
    updateSettings({ group_ids: [] });
  }, [updateSettings]);

  const setGroupModeAll = useCallback(() => {
    setGroupMode("all");
    updateSettings({ group_ids: [] });
  }, [updateSettings]);

  const setGroupModePick = useCallback(() => {
    setGroupMode("pick");
  }, []);

  const allFacultiesSelected =
    allFacultyIds.length > 0 &&
    allFacultyIds.every((id) => settings.faculty_ids.includes(id));
  const someFacultiesSelected =
    settings.faculty_ids.length > 0 && !allFacultiesSelected;

  const allVisibleGroupsSelected =
    filteredGroups.length > 0 &&
    filteredGroups.every((g) => settings.group_ids.includes(String(g.id)));
  const someVisibleGroupsSelected =
    filteredGroups.some((g) => settings.group_ids.includes(String(g.id))) &&
    !allVisibleGroupsSelected;

  const allLoadedGroupsSelected =
    facultyGroups.length > 0 &&
    facultyGroups.every((g) => settings.group_ids.includes(String(g.id)));

  const saveMut = useMutation({
    mutationFn: () => {
      const years = settings.study_years
        .split(/[,\s]+/)
        .map((x) => parseInt(x, 10))
        .filter((n) => !isNaN(n) && n > 0);
      const payload: Record<string, unknown> = {
        title: settings.title.trim(),
        description: settings.description,
        start_at: settings.start_at ? new Date(settings.start_at).toISOString() : null,
        end_at: settings.end_at ? new Date(settings.end_at).toISOString() : null,
        // draft va published da: ishtirokchilar ro'yxatini yashirish/ko'rsatish
        track_participation: settings.track_participation,
      };
      if (isDraft) {
        payload.audience = settings.audience;
        payload.privacy_mode = settings.privacy_mode;
        payload.stats_level = settings.stats_level;
        payload.study_years = years;
        // Ommaviy rejim: bo'sh M2M = cheklov yo'q
        payload.faculty_ids = facultyMode === "all" ? [] : settings.faculty_ids;
        payload.group_ids =
          facultyMode === "all" || groupMode === "all" ? [] : settings.group_ids;
      }
      return surveysApi.update(id, payload);
    },
    onSuccess: async () => {
      settingsDirtyRef.current = false;
      setSettingsDirty(false);
      lastSyncedAt.current = null; // qayta sinxron
      await qc.invalidateQueries({ queryKey: ["admin-survey", id] });
      showSuccess("Saqlandi");
    },
    onError: (err: unknown) => {
      showError("Xatolik", apiErrorMessage(err, "Saqlab bo'lmadi"));
    },
  });

  const publishMut = useMutation({
    mutationFn: () => surveysApi.publish(id),
    onSuccess: async () => {
      lastSyncedAt.current = null;
      settingsDirtyRef.current = false;
      setSettingsDirty(false);
      await qc.invalidateQueries({ queryKey: ["admin-survey", id] });
      await qc.invalidateQueries({ queryKey: ["admin-surveys"] });
      showSuccess("Nashr qilindi", "QR kod tayyor");
    },
    onError: (err: unknown) => {
      showError("Nashr xato", apiErrorMessage(err, "Muvaffaqiyatsiz"));
    },
  });

  const closeMut = useMutation({
    mutationFn: () => surveysApi.close(id),
    onSuccess: async () => {
      lastSyncedAt.current = null;
      await qc.invalidateQueries({ queryKey: ["admin-survey", id] });
      showSuccess("So'rovnoma yopildi");
    },
    onError: (err: unknown) => showError("Xatolik", apiErrorMessage(err, "Yopib bo'lmadi")),
  });

  const addQMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => surveysApi.addQuestion(id, data),
    onSuccess: async () => {
      // Sozlamalar formasini buzmasdan faqat survey cache yangilanadi
      await qc.invalidateQueries({ queryKey: ["admin-survey", id] });
      setQForm(null);
      setEditingQid(null);
      showSuccess("Savol qo'shildi");
    },
    onError: (err: unknown) => {
      showError("Xatolik", apiErrorMessage(err, "Savol qo'shilmadi"));
    },
  });

  const updateQMut = useMutation({
    mutationFn: ({ qid, data }: { qid: string; data: Record<string, unknown> }) =>
      surveysApi.updateQuestion(id, qid, data),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-survey", id] });
      setEditingQid(null);
      setQForm(null);
      showSuccess("Savol yangilandi");
    },
    onError: (err: unknown) => showError("Xatolik", apiErrorMessage(err, "Yangilab bo'lmadi")),
  });

  const delQMut = useMutation({
    mutationFn: (qid: string) => surveysApi.deleteQuestion(id, qid),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-survey", id] });
      showSuccess("Savol o'chirildi");
    },
    onError: (err: unknown) => showError("Xatolik", apiErrorMessage(err, "O'chirib bo'lmadi")),
  });

  const needsOptions = useMemo(
    () => qForm && (qForm.q_type === "single" || qForm.q_type === "multiple"),
    [qForm]
  );

  function submitQuestion() {
    if (!qForm?.text?.trim()) {
      showError("Savol matni majburiy");
      return;
    }
    if (needsOptions) {
      const opts = (qForm.options || []).filter((o) => o.text?.trim());
      if (opts.length < 1) {
        showError("Kamida bitta variant kerak");
        return;
      }
    }
    const data: Record<string, unknown> = {
      q_type: qForm.q_type,
      text: qForm.text.trim(),
      help_text: qForm.help_text || "",
      required: qForm.required ?? true,
      options: needsOptions
        ? (qForm.options || []).filter((o) => o.text?.trim()).map((o, i) => ({
            text: o.text.trim(),
            order: i,
            ...(o.id ? { id: o.id } : {}),
          }))
        : [],
      settings:
        qForm.q_type === "rating"
          ? { min: 1, max: 5 }
          : qForm.q_type === "text"
          ? { max_length: 500 }
          : qForm.q_type === "textarea"
          ? { max_length: 5000 }
          : qForm.q_type === "nps"
          ? { min: 0, max: 10 }
          : qForm.q_type === "likert"
          ? { min: 1, max: 5 }
          : qForm.settings || {},
    };
    if (editingQid) {
      updateQMut.mutate({ qid: editingQid, data });
    } else {
      addQMut.mutate(data);
    }
  }

  function startEditQ(q: SurveyQuestion) {
    setEditingQid(q.id);
    setQForm({
      q_type: q.q_type,
      text: q.text,
      help_text: q.help_text,
      required: q.required,
      options: q.options?.length ? q.options : [{ text: "" }, { text: "" }],
      settings: q.settings,
      order: q.order,
    });
    // Forma ko'rinsin
    requestAnimationFrame(() => {
      document.getElementById("question-form")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  async function copyUrl() {
    if (!survey?.public_url) return;
    try {
      await navigator.clipboard.writeText(survey.public_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showError("Nusxa olinmadi");
    }
  }

  if (!isReady || !user) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!canResults) {
    return (
      <div className="glass rounded-2xl p-8 border border-white/[0.06] text-center text-slate-400">
        Bu bo&apos;limga ruxsat yo&apos;q.
      </div>
    );
  }

  if (isLoading && !survey) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="space-y-4">
        <Link href="/admin/surveys" className="text-sm text-indigo-400 hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Orqaga
        </Link>
        <div className="glass rounded-2xl p-8 border border-red-500/20 text-red-400 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <p>So&apos;rovnoma topilmadi yoki yuklanmadi</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-2 text-xs text-indigo-400 hover:underline"
            >
              Qayta urinish
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: ElementType }[] = [
    { id: "settings", label: "Sozlamalar", icon: Pencil },
    { id: "questions", label: `Savollar (${survey.questions?.length ?? 0})`, icon: GripVertical },
    { id: "results", label: "Natijalar", icon: BarChart3 },
    {
      id: "people",
      label: survey.track_participation === false ? "Ishtirokchilar (yopiq)" : "Ishtirokchilar",
      icon: Users,
    },
  ];

  const mediaHost =
    process.env.NEXT_PUBLIC_MEDIA_URL || "http://127.0.0.1:8000";
  const qrSrc = survey.qr_image
    ? (survey.qr_image.startsWith("http")
        ? survey.qr_image
        : `${mediaHost.replace(/\/$/, "")}${survey.qr_image}`)
    : null;

  const qBusy = addQMut.isPending || updateQMut.isPending;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <Link href="/admin/surveys" className="text-xs text-slate-500 hover:text-indigo-400 flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> So&apos;rovnomalar
          </Link>
          <h1 className="text-xl font-bold text-white">{survey.title}</h1>
          <div className="flex flex-wrap gap-2 mt-2 text-xs">
            <span className="px-2 py-0.5 rounded-full border border-white/10 text-slate-300">
              {STATUS_LABEL[survey.status]}
            </span>
            <span className="px-2 py-0.5 rounded-full border border-white/10 text-slate-400">
              {survey.privacy_mode === "anonymous" ? "Anonim" : "Ochiq"}
            </span>
            <span className="px-2 py-0.5 rounded-full border border-white/10 text-slate-400">
              {survey.response_count ?? 0} javob
            </span>
            {settingsDirty && (
              <span className="px-2 py-0.5 rounded-full border border-amber-500/30 text-amber-300">
                Saqlanmagan o&apos;zgarishlar
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white disabled:opacity-40"
            title="Yangilash"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          {canEdit && isDraft && (
            <button
              type="button"
              onClick={() => {
                if (!(survey.questions?.length)) {
                  showError("Avval kamida bitta savol qo'shing");
                  setTabNav("questions");
                  return;
                }
                if (settingsDirty) {
                  showError("Avval sozlamalarni saqlang");
                  setTabNav("settings");
                  return;
                }
                publishMut.mutate();
              }}
              disabled={publishMut.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold"
            >
              <Send className="w-4 h-4" />
              {publishMut.isPending ? "Nashr..." : "Nashr qilish"}
            </button>
          )}
          {canEdit && isPublished && (
            <button
              type="button"
              onClick={() => closeMut.mutate()}
              disabled={closeMut.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600/90 hover:bg-amber-500 text-white text-sm font-semibold"
            >
              <Ban className="w-4 h-4" />
              Yopish
            </button>
          )}
        </div>
      </div>

      {/* Wizard hint for draft */}
      {isDraft && canEdit && (
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3 text-xs text-slate-300 space-y-1">
          <p>
            <span className="text-indigo-300 font-medium">Shakllantirish:</span>{" "}
            1) Auditoriya — fakultet va guruh tanlang → 2) Savollar → 3) Nashr (QR)
          </p>
          <p className="text-slate-500">
            Fakultet tanlanganda shu fakultet guruhlari chiqadi. Guruh tanlanmasa — fakultetdagi barcha guruhlar qamrab olinadi.
          </p>
        </div>
      )}

      {/* Public link + QR */}
      {(isPublished || survey.status === "closed") && (
        <div className="glass rounded-2xl border border-white/[0.06] p-4 flex flex-col sm:flex-row gap-4 items-start">
          <div className="flex-1 min-w-0 space-y-2">
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <QrCode className="w-3.5 h-3.5" /> Ommaviy havola
            </p>
            <div className="flex gap-2">
              <code className="flex-1 text-xs text-indigo-300 bg-black/30 px-3 py-2 rounded-lg truncate">
                {survey.public_url}
              </code>
              <button
                type="button"
                onClick={copyUrl}
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white text-xs flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                Nusxa
              </button>
            </div>
          </div>
          {qrSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrSrc} alt="QR" className="w-28 h-28 rounded-xl bg-white p-1 border border-white/10" />
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTabNav(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              tab === t.id
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                : "text-slate-400 hover:text-white border border-transparent"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Settings tab */}
      {tab === "settings" && (
        <div className="glass rounded-2xl border border-white/[0.06] p-5 space-y-4">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Sarlavha</label>
            <input
              disabled={!canEdit}
              value={settings.title}
              onChange={(e) => updateSettings({ title: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white disabled:opacity-60"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Tavsif</label>
            <textarea
              disabled={!canEdit}
              value={settings.description}
              onChange={(e) => updateSettings({ description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white resize-none disabled:opacity-60"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Auditoriya</label>
              <select
                disabled={!canEdit || !isDraft}
                value={settings.audience}
                onChange={(e) => updateSettings({ audience: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 disabled:opacity-60"
              >
                <option value="students">Talabalar</option>
                <option value="staff">Xodimlar</option>
                <option value="all">Hammasi</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Maxfiylik (javob↔shaxs)</label>
              <select
                disabled={!canEdit || !isDraft}
                value={settings.privacy_mode}
                onChange={(e) => updateSettings({ privacy_mode: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 disabled:opacity-60"
              >
                <option value="anonymous">Anonim (javob unlink)</option>
                <option value="open">Ochiq (shaxs bog&apos;lanadi)</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label
                className={`flex items-start gap-3 px-3 py-3 rounded-xl border cursor-pointer transition-colors ${
                  settings.track_participation
                    ? "border-indigo-500/30 bg-indigo-500/10"
                    : "border-amber-500/30 bg-amber-500/10"
                } ${!canEdit ? "opacity-60 pointer-events-none" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={settings.track_participation}
                  disabled={!canEdit}
                  onChange={(e) => updateSettings({ track_participation: e.target.checked })}
                  className="mt-0.5 rounded border-white/20"
                />
                <span>
                  <span className="text-xs font-medium text-white block">
                    Kim ishtirok etganini admin ko‘rsin
                  </span>
                  <span className="text-[11px] text-slate-400 leading-relaxed block mt-0.5">
                    {settings.track_participation
                      ? "Yoqilgan: «Ishtirokchilar»da ism/email; DB da user bog‘lanadi."
                      : "O‘chirilgan: admin ro‘yxati yopiq + DB da user FK o‘chiriladi (faqat pseudonim kalit)."}
                    {" "}Nashrdan keyin ham o‘zgartirish mumkin — o‘chirish eski yozuvlarni ham anonimlashtiradi.
                  </span>
                </span>
              </label>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Boshlanish</label>
              <input
                type="datetime-local"
                disabled={!canEdit}
                value={settings.start_at}
                onChange={(e) => updateSettings({ start_at: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white disabled:opacity-60"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Tugash</label>
              <input
                type="datetime-local"
                disabled={!canEdit}
                value={settings.end_at}
                onChange={(e) => updateSettings({ end_at: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white disabled:opacity-60"
              />
            </div>
          </div>
          {isDraft && (
            <div className="space-y-5 pt-4 border-t border-white/[0.06]">
              {/* Header */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/25 to-cyan-500/15 border border-indigo-500/20 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Auditoriya targetlash</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Ommaviy (hammasi) yoki donalab tanlang. Fakultet tanlanganda shu fakultet guruhlari ochiladi.
                  </p>
                </div>
              </div>

              {/* Kurslar — chip tanlov */}
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-amber-400/80" />
                  <span className="text-xs font-medium text-slate-300">Kurslar</span>
                  <span className="text-[10px] text-slate-600">bo&apos;sh = barcha kurslar</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6].map((y) => {
                    const years = settings.study_years
                      .split(/[,\s]+/)
                      .map((x) => parseInt(x, 10))
                      .filter((n) => !isNaN(n));
                    const on = years.includes(y);
                    return (
                      <button
                        key={y}
                        type="button"
                        disabled={!canEdit}
                        onClick={() => {
                          const next = on ? years.filter((x) => x !== y) : [...years, y].sort((a, b) => a - b);
                          updateSettings({ study_years: next.join(", ") });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          on
                            ? "bg-amber-500/20 border-amber-500/40 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.12)]"
                            : "bg-white/[0.03] border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200"
                        }`}
                      >
                        {y}-kurs
                      </button>
                    );
                  })}
                  {canEdit && settings.study_years.trim() && (
                    <button
                      type="button"
                      onClick={() => updateSettings({ study_years: "" })}
                      className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-red-400 border border-transparent hover:border-red-500/20"
                    >
                      Tozalash
                    </button>
                  )}
                </div>
              </div>

              {/* ── Fakultetlar ── */}
              <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.03] to-transparent overflow-hidden">
                <div className="px-4 py-3 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-semibold text-white">Fakultetlar</span>
                    {facultyMode === "pick" && settings.faculty_ids.length > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/25">
                        {settings.faculty_ids.length}/{allFacultyIds.length}
                      </span>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex p-0.5 rounded-xl bg-black/30 border border-white/10">
                      <button
                        type="button"
                        onClick={setFacultyModeAll}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                          facultyMode === "all"
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/40"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        Ommaviy (hammasi)
                      </button>
                      <button
                        type="button"
                        onClick={setFacultyModePick}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                          facultyMode === "pick"
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/40"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <ListChecks className="w-3.5 h-3.5" />
                        Donalab tanlash
                      </button>
                    </div>
                  )}
                </div>

                {facultyMode === "all" ? (
                  <div className="p-5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                      <Check className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm text-emerald-200 font-medium">Barcha fakultetlar</p>
                      <p className="text-[11px] text-slate-500">
                        Cheklov yo&apos;q — auditoriyadagi hamma ishtirok eta oladi
                      </p>
                    </div>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={setFacultyModePick}
                        className="ml-auto text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
                      >
                        Tanlashga o&apos;tish →
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="p-3 space-y-2">
                    {/* Master: hammasini tanlash */}
                    {canEdit && facultyList.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 px-1 pb-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (allFacultiesSelected) clearAllFaculties();
                            else selectAllFaculties();
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                            allFacultiesSelected
                              ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-200"
                              : someFacultiesSelected
                              ? "bg-indigo-500/10 border-indigo-500/25 text-indigo-300"
                              : "bg-white/[0.04] border-white/10 text-slate-300 hover:border-indigo-500/30 hover:text-white"
                          }`}
                        >
                          {allFacultiesSelected ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : someFacultiesSelected ? (
                            <MinusSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                          Hammasini tanlash
                        </button>
                        {settings.faculty_ids.length > 0 && (
                          <button
                            type="button"
                            onClick={clearAllFaculties}
                            className="px-3 py-2 rounded-xl text-xs text-slate-500 hover:text-red-400 border border-transparent hover:border-red-500/20"
                          >
                            Tanlovni tozalash
                          </button>
                        )}
                      </div>
                    )}

                    <div className="max-h-52 overflow-y-auto space-y-1 rounded-xl border border-white/[0.06] bg-black/20 p-1.5">
                      {facultyList.map((f) => {
                        const checked = settings.faculty_ids.includes(String(f.id));
                        return (
                          <label
                            key={f.id}
                            className={`flex items-center gap-3 text-xs px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                              checked
                                ? "bg-indigo-500/15 text-indigo-100 border border-indigo-500/30 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.08)]"
                                : "text-slate-300 hover:bg-white/[0.04] border border-transparent"
                            }`}
                          >
                            <span className={`shrink-0 ${checked ? "text-indigo-400" : "text-slate-600"}`}>
                              {checked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                            </span>
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={checked}
                              disabled={!canEdit}
                              onChange={() => toggleFaculty(String(f.id))}
                            />
                            <span className="flex-1 font-medium">{f.name}</span>
                            {checked && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                          </label>
                        );
                      })}
                      {!facultyList.length && (
                        <p className="text-xs text-slate-600 p-4 text-center">
                          Katalog bo&apos;sh. Avval HEMIS sinxronlash orqali fakultetlarni yuklang.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Guruhlar ── */}
              {facultyMode === "pick" && settings.faculty_ids.length > 0 && (
                <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-b from-cyan-500/[0.04] to-transparent overflow-hidden animate-fade-in">
                  <div className="px-4 py-3 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <GraduationCap className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-semibold text-white">Guruhlar</span>
                      {groupMode === "pick" && settings.group_ids.length > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/25">
                          {settings.group_ids.length}
                          {facultyGroups.length ? `/${facultyGroups.length}` : ""} tanlangan
                        </span>
                      )}
                      {groupsLoading && (
                        <RefreshCw className="w-3.5 h-3.5 text-slate-500 animate-spin" />
                      )}
                    </div>
                    {canEdit && (
                      <div className="flex p-0.5 rounded-xl bg-black/30 border border-white/10">
                        <button
                          type="button"
                          onClick={setGroupModeAll}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                            groupMode === "all"
                              ? "bg-cyan-600 text-white shadow-lg shadow-cyan-900/40"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          <Layers className="w-3.5 h-3.5" />
                          Ommaviy (hammasi)
                        </button>
                        <button
                          type="button"
                          onClick={setGroupModePick}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                            groupMode === "pick"
                              ? "bg-cyan-600 text-white shadow-lg shadow-cyan-900/40"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          <ListChecks className="w-3.5 h-3.5" />
                          Donalab tanlash
                        </button>
                      </div>
                    )}
                  </div>

                  {groupMode === "all" ? (
                    <div className="p-5 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center">
                        <Check className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div>
                        <p className="text-sm text-cyan-200 font-medium">
                          Tanlangan fakultet(lar)dagi barcha guruhlar
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {facultyGroups.length
                            ? `Jami ~${facultyGroups.length} ta guruh qamrab olinadi`
                            : "Guruhlar yuklanmoqda yoki katalog bo'sh"}
                        </p>
                      </div>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={setGroupModePick}
                          className="ml-auto text-[11px] text-cyan-400 hover:text-cyan-300 font-medium shrink-0"
                        >
                          Donalab tanlash →
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 space-y-3">
                      {/* Bulk actions */}
                      {canEdit && facultyGroups.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (allLoadedGroupsSelected) clearAllGroups();
                              else selectAllLoadedGroups();
                            }}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                              allLoadedGroupsSelected
                                ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-200"
                                : "bg-white/[0.04] border-white/10 text-slate-300 hover:border-cyan-500/30 hover:text-white"
                            }`}
                          >
                            {allLoadedGroupsSelected ? (
                              <CheckSquare className="w-4 h-4" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                            Hammasini tanlash ({facultyGroups.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (allVisibleGroupsSelected) clearVisibleGroups();
                              else selectAllVisibleGroups();
                            }}
                            disabled={!filteredGroups.length}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all disabled:opacity-40 ${
                              allVisibleGroupsSelected
                                ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-300"
                                : someVisibleGroupsSelected
                                ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-300/80"
                                : "bg-white/[0.03] border-white/10 text-slate-400 hover:text-white"
                            }`}
                          >
                            {allVisibleGroupsSelected ? (
                              <CheckSquare className="w-3.5 h-3.5" />
                            ) : someVisibleGroupsSelected ? (
                              <MinusSquare className="w-3.5 h-3.5" />
                            ) : (
                              <Square className="w-3.5 h-3.5" />
                            )}
                            Ko&apos;rinayotganlar ({filteredGroups.length})
                          </button>
                          {settings.group_ids.length > 0 && (
                            <button
                              type="button"
                              onClick={clearAllGroups}
                              className="px-3 py-2 rounded-xl text-xs text-slate-500 hover:text-red-400"
                            >
                              Tozalash
                            </button>
                          )}
                        </div>
                      )}

                      {/* Search + year chips */}
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                          <input
                            value={groupSearch}
                            onChange={(e) => setGroupSearch(e.target.value)}
                            placeholder="Guruh yoki yo'nalish qidirish..."
                            disabled={!canEdit}
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-black/25 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40"
                          />
                        </div>
                        {groupYears.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => setGroupYearFilter("all")}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-colors ${
                                groupYearFilter === "all"
                                  ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-200"
                                  : "border-white/10 text-slate-500 hover:text-slate-300"
                              }`}
                            >
                              Barcha kurs
                            </button>
                            {groupYears.map((y) => (
                              <button
                                key={y}
                                type="button"
                                onClick={() => setGroupYearFilter(String(y))}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-colors ${
                                  groupYearFilter === String(y)
                                    ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-200"
                                    : "border-white/10 text-slate-500 hover:text-slate-300"
                                }`}
                              >
                                {y}-kurs
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="max-h-64 overflow-y-auto space-y-1 rounded-xl border border-white/[0.06] bg-black/20 p-1.5">
                        {groupsLoading && (
                          <p className="text-xs text-slate-500 p-4 flex items-center justify-center gap-2">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Yuklanmoqda...
                          </p>
                        )}
                        {!groupsLoading && filteredGroups.map((g) => {
                          const checked = settings.group_ids.includes(String(g.id));
                          return (
                            <label
                              key={g.id}
                              className={`flex items-start gap-3 text-xs px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                                checked
                                  ? "bg-cyan-500/12 text-cyan-50 border border-cyan-500/30"
                                  : "text-slate-300 hover:bg-white/[0.04] border border-transparent"
                              }`}
                            >
                              <span className={`shrink-0 mt-0.5 ${checked ? "text-cyan-400" : "text-slate-600"}`}>
                                {checked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                              </span>
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={checked}
                                disabled={!canEdit}
                                onChange={() => toggleGroup(String(g.id))}
                              />
                              <span className="flex-1 min-w-0">
                                <span className="font-semibold text-white/95">{g.name}</span>
                                <span className="block text-[10px] text-slate-500 mt-0.5">
                                  {g.study_year != null ? `${g.study_year}-kurs` : "kurs —"}
                                  {g.specialty_name ? ` · ${g.specialty_name}` : ""}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                        {!groupsLoading && facultyGroups.length === 0 && (
                          <p className="text-xs text-slate-600 p-4 text-center">
                            Tanlangan fakultet(lar)da guruh topilmadi.
                          </p>
                        )}
                        {!groupsLoading && facultyGroups.length > 0 && filteredGroups.length === 0 && (
                          <p className="text-xs text-slate-600 p-4 text-center">Filtr bo&apos;yicha guruh yo&apos;q</p>
                        )}
                      </div>

                      {groupMode === "pick" && settings.group_ids.length === 0 && (
                        <p className="text-[11px] text-amber-400/90 px-1 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          Hali guruh tanlanmagan — saqlashda fakultetdagi barcha guruhlar qamrab olinadi. Aniq tanlash uchun guruhlarni belgilang yoki &quot;Hammasini tanlash&quot;ni bosing.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {facultyMode === "pick" && settings.faculty_ids.length === 0 && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-[11px] text-amber-200/90 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Donalab rejimda hech qaysi fakultet tanlanmagan. Fakultet tanlang yoki <strong>Ommaviy (hammasi)</strong> rejimiga o&apos;ting.
                  </span>
                </div>
              )}

              {/* Xulosa kartasi */}
              <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-transparent to-cyan-500/5 p-4">
                <p className="text-[10px] uppercase tracking-wider text-indigo-300/80 font-semibold mb-3">
                  Kim ishtirok etadi?
                </p>
                <div className="grid sm:grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl bg-black/20 border border-white/[0.05] px-3 py-2.5">
                    <p className="text-[10px] text-slate-500 mb-0.5">Auditoriya</p>
                    <p className="text-slate-100 font-medium">
                      {settings.audience === "students" ? "Talabalar" : settings.audience === "staff" ? "Xodimlar" : "Hammasi"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-black/20 border border-white/[0.05] px-3 py-2.5">
                    <p className="text-[10px] text-slate-500 mb-0.5">Kurs</p>
                    <p className="text-slate-100 font-medium">
                      {settings.study_years.trim() || "Barcha kurslar"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-black/20 border border-white/[0.05] px-3 py-2.5 sm:col-span-2">
                    <p className="text-[10px] text-slate-500 mb-0.5">Fakultet</p>
                    <p className="text-slate-100 font-medium">
                      {facultyMode === "all" || !settings.faculty_ids.length
                        ? "Barcha fakultetlar (ommaviy)"
                        : allFacultiesSelected
                        ? `Barcha fakultetlar (${settings.faculty_ids.length})`
                        : facultyList
                            .filter((f) => settings.faculty_ids.includes(String(f.id)))
                            .map((f) => f.name)
                            .join(", ") || `${settings.faculty_ids.length} ta fakultet`}
                    </p>
                  </div>
                  <div className="rounded-xl bg-black/20 border border-white/[0.05] px-3 py-2.5 sm:col-span-2">
                    <p className="text-[10px] text-slate-500 mb-0.5">Guruh</p>
                    <p className="text-slate-100 font-medium">
                      {facultyMode === "all" || !settings.faculty_ids.length
                        ? "Cheklov yo'q"
                        : groupMode === "all" || !settings.group_ids.length
                        ? "Tanlangan fakultet(lar)dagi barcha guruhlar (ommaviy)"
                        : allLoadedGroupsSelected
                        ? `Barcha guruhlar (${settings.group_ids.length})`
                        : `${settings.group_ids.length} ta guruh (donalab)`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Nashr qilingan — targetlash faqat o'qish */}
          {!isDraft && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-xs text-slate-400 space-y-1">
              <p className="text-slate-300 font-medium mb-1">Auditoriya (o&apos;zgarmaydi)</p>
              <p>
                Fakultet:{" "}
                {(survey.faculties || []).length
                  ? (faculties || [])
                      .filter((f) => (survey.faculties || []).map(String).includes(String(f.id)))
                      .map((f) => f.name)
                      .join(", ") || `${survey.faculties.length} ta`
                  : "barcha"}
              </p>
              <p>Guruh: {(survey.groups || []).length ? `${survey.groups.length} ta` : "fakultet bo'yicha / hammasi"}</p>
              {(survey.study_years || []).length > 0 && (
                <p>Kurs: {(survey.study_years || []).join(", ")}</p>
              )}
            </div>
          )}

          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => saveMut.mutate()}
                disabled={saveMut.isPending || !settings.title.trim()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saveMut.isPending ? "Saqlanmoqda..." : "Saqlash"}
              </button>
              {isDraft && (
                <button
                  type="button"
                  onClick={() => setTabNav("questions")}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-sm text-slate-300 hover:text-white hover:bg-white/5"
                >
                  Savollarga o&apos;tish →
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Questions tab */}
      {tab === "questions" && (
        <div className="space-y-4">
          {(survey.questions || []).map((q, idx) => (
            <div
              key={q.id}
              className={`glass rounded-2xl border p-4 ${
                editingQid === q.id ? "border-indigo-500/40" : "border-white/[0.06]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">
                    #{idx + 1} · {Q_TYPES.find((t) => t.value === q.q_type)?.label || q.q_type}
                    {q.required ? " · majburiy" : ""}
                  </p>
                  <p className="text-sm text-white font-medium">{q.text}</p>
                  {q.options?.length > 0 && (
                    <ul className="mt-2 space-y-0.5">
                      {q.options.map((o, i) => (
                        <li key={o.id || i} className="text-xs text-slate-400">• {o.text}</li>
                      ))}
                    </ul>
                  )}
                </div>
                {canEdit && isDraft && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEditQ(q)}
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                      title="Tahrirlash"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Bu savolni o'chirasizmi?")) delQMut.mutate(q.id);
                      }}
                      disabled={delQMut.isPending}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                      title="O'chirish"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {canEdit && isDraft && !qForm && (
            <button
              type="button"
              onClick={() => { setEditingQid(null); setQForm(emptyQuestion()); }}
              className="w-full py-3 rounded-2xl border border-dashed border-white/15 text-sm text-slate-400 hover:text-indigo-300 hover:border-indigo-500/40 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Savol qo&apos;shish
            </button>
          )}

          {qForm && (
            <div
              id="question-form"
              className="glass rounded-2xl border border-indigo-500/30 p-5 space-y-3"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-white">
                  {editingQid ? "Savolni tahrirlash" : "Yangi savol"}
                </h3>
                <button
                  type="button"
                  onClick={() => { setQForm(null); setEditingQid(null); }}
                  className="text-slate-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Tur</label>
                  <select
                    value={qForm.q_type}
                    onChange={(e) => {
                      const q_type = e.target.value as SurveyQType;
                      setQForm((f) => {
                        if (!f) return f;
                        const next = { ...f, q_type };
                        if ((q_type === "single" || q_type === "multiple") && !(f.options?.length)) {
                          next.options = [{ text: "Variant 1" }, { text: "Variant 2" }];
                        }
                        return next;
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300"
                  >
                    {Q_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <label className="flex items-end gap-2 text-xs text-slate-300 pb-2">
                  <input
                    type="checkbox"
                    checked={qForm.required ?? true}
                    onChange={(e) => setQForm((f) => f && ({ ...f, required: e.target.checked }))}
                  />
                  Majburiy
                </label>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Savol matni *</label>
                <textarea
                  value={qForm.text}
                  onChange={(e) => setQForm((f) => f && ({ ...f, text: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white resize-none"
                  placeholder="Savolingizni yozing..."
                />
              </div>
              {needsOptions && (
                <div className="space-y-2">
                  <label className="text-xs text-slate-500 block">Variantlar</label>
                  {(qForm.options || []).map((o, i) => (
                    <div key={o.id || i} className="flex gap-2">
                      <input
                        value={o.text}
                        onChange={(e) => {
                          const options = [...(qForm.options || [])];
                          options[i] = { ...options[i], text: e.target.value };
                          setQForm((f) => f && ({ ...f, options }));
                        }}
                        className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white"
                        placeholder={`Variant ${i + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const options = (qForm.options || []).filter((_, j) => j !== i);
                          setQForm((f) => f && ({ ...f, options }));
                        }}
                        className="p-2 text-slate-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setQForm((f) => f && ({
                        ...f,
                        options: [...(f.options || []), { text: "" }],
                      }))
                    }
                    className="text-xs text-indigo-400 hover:underline"
                  >
                    + variant
                  </button>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={submitQuestion}
                  disabled={qBusy}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {qBusy ? "Saqlanmoqda..." : editingQid ? "Yangilash" : "Qo'shish"}
                </button>
                <button
                  type="button"
                  onClick={() => { setQForm(null); setEditingQid(null); }}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-sm text-slate-400 hover:text-white"
                >
                  Bekor
                </button>
              </div>
            </div>
          )}

          {canEdit && isDraft && (survey.questions?.length ?? 0) > 0 && !qForm && (
            <button
              type="button"
              onClick={() => publishMut.mutate()}
              disabled={publishMut.isPending || settingsDirty}
              className="w-full py-3 rounded-2xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {settingsDirty ? "Avval sozlamalarni saqlang" : "Tayyor — nashr qilish"}
            </button>
          )}

          {!isDraft && (
            <p className="text-xs text-slate-500">Nashrdan keyin savollar o&apos;zgartirilmaydi.</p>
          )}
        </div>
      )}

      {/* Results */}
      {tab === "results" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-400">
              {resultsLoading
                ? "Yuklanmoqda..."
                : results
                ? `${results.response_count} javob · ${results.participation_submitted} topshirgan`
                : "—"}
            </p>
            <button type="button" onClick={() => refetchResults()} className="text-xs text-indigo-400 hover:underline">
              Yangilash
            </button>
          </div>
          {(results?.questions || []).map((q) => (
            <div key={q.question_id} className="glass rounded-2xl border border-white/[0.06] p-4">
              <p className="text-sm font-medium text-white mb-1">{q.text}</p>
              <p className="text-[10px] text-slate-500 mb-3">
                {q.q_type} · n={q.count}
                {q.average != null ? ` · o'rtacha ${q.average}` : ""}
              </p>
              <div className="space-y-1.5">
                {Object.entries(q.distribution || {})
                  .filter(([k]) => !k.startsWith("_"))
                  .map(([key, count]) => {
                    const pct = q.count ? Math.round((count / q.count) * 100) : 0;
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-[11px] text-slate-400 mb-0.5">
                          <span className="truncate max-w-[70%]">{key}</span>
                          <span>{count} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-indigo-500/70"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
          {results && results.response_count === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">Hali javob yo&apos;q</p>
          )}
        </div>
      )}

      {/* People */}
      {tab === "people" && (
        <div className="glass rounded-2xl border border-white/[0.06] overflow-hidden">
          {survey.track_participation === false ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-sm font-medium text-amber-200">
                Ishtirokchilar ro‘yxati yopiq
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Bu so‘rovnomada «kim ishtirok etganini ko‘rsatish» o‘chirilgan.
                Faqat <strong className="text-slate-400">Natijalar</strong> bo‘limidagi
                umumiy statistika mavjud. Sozlamalardan qayta yoqishingiz mumkin.
              </p>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    updateSettings({ track_participation: true });
                    setTabNav("settings");
                  }}
                  className="mt-2 text-xs text-indigo-400 hover:underline"
                >
                  Sozlamalarga o‘tish
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-white/[0.06] text-xs text-slate-500">
                Kim ishtirok etgani (javob matni ko&apos;rsatilmaydi
                {survey.privacy_mode === "anonymous" ? " — anonim rejim" : ""})
              </div>
              {peopleLoading ? (
                <div className="flex justify-center py-10">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04] max-h-96 overflow-y-auto">
                  {(people || []).map((p) => (
                    <div key={p.id} className="px-4 py-3 flex justify-between items-center text-sm">
                      <div>
                        <p className="text-white">{p.user_name || "—"}</p>
                        <p className="text-xs text-slate-500">{p.user_email}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        p.status === "submitted"
                          ? "border-emerald-500/30 text-emerald-300"
                          : "border-amber-500/30 text-amber-300"
                      }`}>
                        {p.status === "submitted" ? "Topshirgan" : "Boshlagan"}
                      </span>
                    </div>
                  ))}
                  {!people?.length && (
                    <p className="text-sm text-slate-500 text-center py-8">Ishtirokchilar yo&apos;q</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function AdminSurveyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <Suspense fallback={<LoadingBlock />}>
      <AdminSurveyDetailInner id={id} />
    </Suspense>
  );
}
