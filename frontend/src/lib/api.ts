import axios from "axios";
import { useAuthStore } from "@/stores/authStore";

/**
 * baseURL relative — /api/v1/* → Next proxy → Django.
 * withCredentials: httpOnly cookie (bildir_access / bildir_refresh).
 * Access token localStorage da SAQLANMAYDI (XSS himoya).
 */
const API_BASE = "/api/v1";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  // Memory dagi access (ixtiyoriy); asosiy manba — httpOnly cookie
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  try {
    const loc =
      (typeof window !== "undefined" &&
        window.localStorage.getItem("bildir_locale")) ||
      "uz";
    config.headers["X-Locale"] = loc;
    config.params = { ...(config.params || {}), lang: loc };
  } catch {
    /* ignore */
  }
  return config;
});

const isRefreshRequest = (url?: string) =>
  !!url && url.includes("/auth/token/refresh/");

let refreshPromise: Promise<string | null> | null = null;

async function silentRefresh(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        // Body bo'sh — backend cookie dagi refresh ni o'qiydi
        const res = await api.post("/auth/token/refresh/", {});
        const newAccess =
          res.data?.access || res.data?.data?.access || null;
        if (newAccess) {
          useAuthStore.getState().setAccessToken(newAccess);
          return newAccess as string;
        }
        // Tokenlar faqat httpOnly cookie da. 200 — cookie yangilangan.
        if (res.data?.success || res.status === 200) {
          useAuthStore.getState().setAccessToken(null);
          return "cookie";
        }
        return null;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !isRefreshRequest(original?.url)
    ) {
      original._retry = true;
      const newAccess = await silentRefresh();
      if (newAccess) {
        original.headers = original.headers || {};
        if (newAccess === "cookie") {
          delete original.headers.Authorization;
        } else {
          original.headers.Authorization = `Bearer ${newAccess}`;
        }
        return api(original);
      }
      useAuthStore.getState().logout();
      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        const publicPaths = ["/", "/news", "/privacy", "/s/", "/auth/"];
        const isPublic = publicPaths.some((p) => path === p || path.startsWith(p));
        if (!path.startsWith("/login") && !isPublic) {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ── Auth ─────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login/", { email, password }),

  loginHemisStudent: (login: string, password: string) =>
    api.post("/auth/login/hemis/", { login, password }),

  loginHemisTutor: (login: string, password: string) =>
    api.post("/auth/login/hemis/tutor/", { login, password }),

  oauthInit: (portal?: "student" | "employee") =>
    api.get("/auth/oauth/hemis/", portal ? { params: { portal } } : undefined),

  /** Cookie + access denylist; body ixtiyoriy */
  logout: () => {
    const access = useAuthStore.getState().accessToken;
    return api.post("/auth/logout/", access ? { access } : {});
  },

  me: () => api.get("/auth/me/"),

  updateMe: (data: Record<string, unknown>) => api.patch("/auth/me/", data),

  changePassword: (old_password: string, new_password: string) =>
    api.post("/auth/me/password/", { old_password, new_password }),
};

// ── Password Reset ────────────────────────────────────────────
export const passwordResetApi = {
  forgot: (email: string) =>
    api.post("/auth/forgot-password/", { email }),

  reset: (token: string, new_password: string) =>
    api.post("/auth/reset-password/", { token, new_password }),
};

// ── Admin (Foydalanuvchilar boshqaruvi) ──────────────────────
export const adminApi = {
  users: (params?: Record<string, string>) =>
    api.get("/auth/users/", { params }),

  userDetail: (id: string) =>
    api.get(`/auth/users/${id}/`),

  createUser: (data: Record<string, unknown>) =>
    api.post("/auth/users/", data),

  updateUser: (id: string, data: Record<string, unknown>) =>
    api.patch(`/auth/users/${id}/`, data),

  deleteUser: (id: string) =>
    api.delete(`/auth/users/${id}/`),

  stats: () =>
    api.get("/auth/stats/"),
};

// ── Catalog ──────────────────────────────────────────────────
export const catalogApi = {
  universities: () => api.get("/catalog/universities/"),

  faculties: (universityId?: string) =>
    api.get("/catalog/faculties/", {
      params: universityId ? { university_id: universityId } : {},
    }),

  specialties: (facultyId?: string) =>
    api.get("/catalog/specialties/", {
      params: { ...(facultyId ? { faculty_id: facultyId } : {}), compact: "true" },
    }),

  groups: (specialtyId?: string, facultyId?: string, facultyIds?: string[]) =>
    api.get("/catalog/groups/", {
      params: {
        ...(specialtyId ? { specialty_id: specialtyId } : {}),
        ...(facultyIds?.length
          ? { faculty_ids: facultyIds.join(",") }
          : facultyId
          ? { faculty_id: facultyId }
          : {}),
        compact: "true",
      },
    }),

  subjects: (facultyId?: string) =>
    api.get("/catalog/subjects/", {
      params: { ...(facultyId ? { faculty_id: facultyId } : {}), compact: "true" },
    }),

  subjectsPaged: (params?: Record<string, string>) =>
    api.get("/catalog/subjects/", { params }),
};

// ── Catalog Admin (CRUD) ─────────────────────────────────────
export const catalogAdminApi = {
  createUniversity: (data: Record<string, unknown>) =>
    api.post("/catalog/universities/", data),
  updateUniversity: (id: string, data: Record<string, unknown>) =>
    api.patch(`/catalog/universities/${id}/`, data),
  deleteUniversity: (id: string) =>
    api.delete(`/catalog/universities/${id}/`),

  createFaculty: (data: Record<string, unknown>) =>
    api.post("/catalog/faculties/", data),
  updateFaculty: (id: string, data: Record<string, unknown>) =>
    api.patch(`/catalog/faculties/${id}/`, data),
  deleteFaculty: (id: string) =>
    api.delete(`/catalog/faculties/${id}/`),

  createSpecialty: (data: Record<string, unknown>) =>
    api.post("/catalog/specialties/", data),
  updateSpecialty: (id: string, data: Record<string, unknown>) =>
    api.patch(`/catalog/specialties/${id}/`, data),
  deleteSpecialty: (id: string) =>
    api.delete(`/catalog/specialties/${id}/`),

  createSubject: (data: Record<string, unknown>) =>
    api.post("/catalog/subjects/", data),
  updateSubject: (id: number, data: Record<string, unknown>) =>
    api.patch(`/catalog/subjects/${id}/`, data),
  deleteSubject: (id: number) =>
    api.delete(`/catalog/subjects/${id}/`),
};

// ── Audit Loglar ─────────────────────────────────────────────
export const auditApi = {
  list: (params?: Record<string, string>) =>
    api.get("/auth/audit/", { params }),
};

// ── Surveys ──────────────────────────────────────────────────
export const surveysApi = {
  list: (params?: Record<string, string>) =>
    api.get("/surveys/", { params }),

  detail: (id: string) =>
    api.get(`/surveys/${id}/`),

  create: (data: Record<string, unknown>) =>
    api.post("/surveys/", data),

  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/surveys/${id}/`, data),

  remove: (id: string) =>
    api.delete(`/surveys/${id}/`),

  addQuestion: (surveyId: string, data: Record<string, unknown>) =>
    api.post(`/surveys/${surveyId}/questions/`, data),

  updateQuestion: (surveyId: string, qid: string, data: Record<string, unknown>) =>
    api.patch(`/surveys/${surveyId}/questions/${qid}/`, data),

  deleteQuestion: (surveyId: string, qid: string) =>
    api.delete(`/surveys/${surveyId}/questions/${qid}/`),

  publish: (id: string) =>
    api.post(`/surveys/${id}/publish/`, {}, { timeout: 15000 }),

  close: (id: string) =>
    api.post(`/surveys/${id}/close/`),

  qr: (id: string) =>
    api.get(`/surveys/${id}/qr/`),

  results: (id: string) =>
    api.get(`/surveys/${id}/results/`),

  resultsExport: (id: string) =>
    api.get(`/surveys/${id}/results/export/`, {
      responseType: "blob",
      timeout: 120_000,
    }),

  resultsExportVerify: (id: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post(`/surveys/${id}/results/export/verify/`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60_000,
    });
  },

  participations: (id: string) =>
    api.get(`/surveys/${id}/participations/`),

  openResponses: (id: string) =>
    api.get(`/surveys/${id}/responses/`),

  // User
  available: () =>
    api.get("/surveys/available/"),

  take: (id: string) =>
    api.get(`/surveys/${id}/take/`),

  start: (id: string) =>
    api.post(`/surveys/${id}/start/`),

  submit: (id: string, data: { token: string; answers: Record<string, unknown>[] }) =>
    api.post(`/surveys/${id}/submit/`, data, { timeout: 15000 }),
};

// ── Office: rahbariyat + murojaatlar ─────────────────────────
export const officeApi = {
  persons: (params?: Record<string, string>) =>
    api.get("/office/persons/", { params }),

  createPerson: (form: FormData) =>
    api.post("/office/persons/", form, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60_000,
    }),

  updatePerson: (id: string, form: FormData) =>
    api.patch(`/office/persons/${id}/`, form, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60_000,
    }),

  deletePerson: (id: string) =>
    api.delete(`/office/persons/${id}/`),

  myAppeals: () =>
    api.get("/office/appeals/"),

  createAppeal: (form: FormData) =>
    api.post("/office/appeals/", form, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120_000,
    }),

  myAppeal: (id: string) =>
    api.get(`/office/appeals/${id}/`),

  adminAppeals: (params?: Record<string, string>) =>
    api.get("/office/admin/appeals/", { params }),

  adminAppeal: (id: string) =>
    api.get(`/office/admin/appeals/${id}/`),

  answerAppeal: (
    id: string,
    data: { answer_text: string; admin_note?: string } | FormData
  ) => {
    if (data instanceof FormData) {
      return api.post(`/office/admin/appeals/${id}/answer/`, data, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120_000,
      });
    }
    return api.post(`/office/admin/appeals/${id}/answer/`, data);
  },

  setAppealStatus: (id: string, status: string) =>
    api.post(`/office/admin/appeals/${id}/status/`, { status }),
};

// ── Yangiliklar ──────────────────────────────────────────────
export const newsApi = {
  list: (params?: Record<string, string>) =>
    api.get("/news/", { params }),

  categories: () =>
    api.get("/news/categories/"),

  detail: (key: string) =>
    api.get(`/news/${key}/`),

  create: (form: FormData) =>
    api.post("/news/", form, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60_000,
    }),

  update: (key: string, form: FormData) =>
    api.patch(`/news/${key}/`, form, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60_000,
    }),

  remove: (key: string) =>
    api.delete(`/news/${key}/`),

  /** Rich-text ichiga rasm/fayl yuklash */
  uploadMedia: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post("/news/media/upload/", fd, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120_000,
    });
  },
};

// ── Komplayens: risk + anonim xabar + KPI ────────────────────
export const complianceApi = {
  kpi: () => api.get("/compliance/kpi/"),
  risks: (params?: Record<string, string>) =>
    api.get("/compliance/risks/", { params }),
  createRisk: (data: Record<string, unknown>) =>
    api.post("/compliance/risks/", data),
  updateRisk: (id: string, data: Record<string, unknown>) =>
    api.patch(`/compliance/risks/${id}/`, data),
  deleteRisk: (id: string) => api.delete(`/compliance/risks/${id}/`),
  whistleList: (params?: Record<string, string>) =>
    api.get("/compliance/whistle/", { params }),
  whistleCreate: (data: { message: string; context?: string }) =>
    api.post("/compliance/whistle/", data),
  whistleUpdate: (id: string, data: Record<string, unknown>) =>
    api.patch(`/compliance/whistle/${id}/`, data),
};

// ── Catalog Sync (HEMIS) ─────────────────────────────────────
export const catalogSyncApi = {
  stats: () =>
    api.get("/catalog/sync/"),

  start: (config: Record<string, unknown>) =>
    api.post("/catalog/sync/", config),

  status: (syncId: string) =>
    api.get("/catalog/sync/status/", { params: { sync_id: syncId } }),

  history: () =>
    api.get("/catalog/sync/history/"),

  syncUsers: (data: { role?: string; limit?: number }) =>
    api.post("/catalog/sync/users/", data),
};
