import { UserRole } from "@/types";

export type RoleGroup = "student" | "teacher" | "staff";

export const ROLE_GROUP: Record<UserRole, RoleGroup> = {
  student:         "student",
  teacher:         "teacher",
  methodist:       "staff",
  department_head: "staff",
  proctor:         "staff",
  admin:           "staff",
  superadmin:      "staff",
  audit_inspector: "staff",
};

export const ROLE_HOME: Record<RoleGroup, string> = {
  student: "/home",
  teacher: "/home",
  staff:   "/admin",
};

export function getRoleGroup(role: UserRole): RoleGroup {
  return ROLE_GROUP[role] ?? "student";
}

export function getRoleHome(role: UserRole): string {
  return ROLE_HOME[getRoleGroup(role)];
}

export const ROLE_LABELS: Record<UserRole, string> = {
  student:         "Talaba",
  teacher:         "O'qituvchi",
  methodist:       "Metodist",
  department_head: "Kafedra mudiri",
  proctor:         "Proktor",
  admin:           "Admin",
  superadmin:      "Superadmin",
  audit_inspector: "Audit inspektor",
};

export const ROLE_COLORS: Record<UserRole, string> = {
  student:         "#6366f1",   // indigo
  teacher:         "#a78bfa",   // violet
  methodist:       "#22d3ee",   // cyan
  department_head: "#f59e0b",   // amber
  proctor:         "#ef4444",   // red
  admin:           "#10b981",   // emerald
  superadmin:      "#f43f5e",   // rose
  audit_inspector: "#06b6d4",   // cyan
};