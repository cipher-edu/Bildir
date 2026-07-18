import axios from "axios";
import { useAuthStore } from "@/stores/authStore";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
  timeout: 5000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const isRefreshRequest = (url?: string) => !!url && url.includes("/auth/token/refresh/");

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status === 401 &&
      !original._retry &&
      !isRefreshRequest(original?.url)
    ) {
      original._retry = true;
      const refresh = useAuthStore.getState().refreshToken;
      if (refresh) {
        try {
          const res = await api.post("/auth/token/refresh/", { refresh });
          const newAccess = res.data?.access || res.data?.data?.access;
          if (newAccess) {
            useAuthStore.getState().setAccessToken(newAccess);
            original.headers.Authorization = `Bearer ${newAccess}`;
            return api(original);
          }
        } catch {
          /* refresh failed */
        }
      }
      useAuthStore.getState().logout();
      window.location.href = "/login";
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

  logout: (refresh?: string) => {
    const token = refresh || useAuthStore.getState().refreshToken;
    return api.post("/auth/logout/", token ? { refresh: token } : {});
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

  groups: (specialtyId?: string, facultyId?: string) =>
    api.get("/catalog/groups/", {
      params: {
        ...(specialtyId
          ? { specialty_id: specialtyId }
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
