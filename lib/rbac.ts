/**
 * Role-Based Access Control (RBAC) helpers for IT Project Management.
 * Roles: ADMIN (full access), MANAGER (project-level), MEMBER (own tasks only).
 */

export type Role = "ADMIN" | "MANAGER" | "MEMBER";
export type ProjectRole = "PROJECT_MANAGER" | "MEMBER";

export const ROLES: Role[] = ["ADMIN", "MANAGER", "MEMBER"];
export const PROJECT_ROLES: ProjectRole[] = ["PROJECT_MANAGER", "MEMBER"];

export function isRole(value: unknown): value is Role {
  return value === "ADMIN" || value === "MANAGER" || value === "MEMBER";
}

export function isInviteRole(value: unknown): value is Exclude<Role, "ADMIN"> {
  return value === "MANAGER" || value === "MEMBER";
}

export function isProjectRole(value: unknown): value is ProjectRole {
  return value === "PROJECT_MANAGER" || value === "MEMBER";
}

function hasProjectManagerPower(projectRole?: string | null): boolean {
  return projectRole === "PROJECT_MANAGER";
}

/** ADMIN can create and manage their own firm/project space. */
export function isAdmin(role: string): role is "ADMIN" {
  return role === "ADMIN";
}

/** Only ADMIN can manage users in the firm (invite, change role, delete). */
export function canManageUsers(role: string): boolean {
  return role === "ADMIN";
}

/** User can manage this project when they own it or have project-manager membership. */
export function canManageProject(
  role: string,
  projectManagerId: string,
  userId: string,
  projectRole?: string | null
): boolean {
  return (
    ((role === "ADMIN" || role === "MANAGER") && projectManagerId === userId) ||
    hasProjectManagerPower(projectRole)
  );
}

/** User can create/edit/delete tasks in this project (ADMIN or project manager) */
export function canManageTasksInProject(
  role: string,
  projectManagerId: string,
  userId: string,
  projectRole?: string | null
): boolean {
  return canManageProject(role, projectManagerId, userId, projectRole);
}

/** User can create a task in this project */
export function canCreateTask(
  role: string,
  projectManagerId: string,
  userId: string,
  projectRole?: string | null
): boolean {
  return canManageTasksInProject(role, projectManagerId, userId, projectRole);
}

/** User can delete a task (ADMIN or project manager only) */
export function canDeleteTask(
  role: string,
  projectManagerId: string,
  userId: string,
  projectRole?: string | null
): boolean {
  return canManageTasksInProject(role, projectManagerId, userId, projectRole);
}

/** User can assign/reassign assignee (ADMIN or project manager only) */
export function canAssignTask(
  role: string,
  projectManagerId: string,
  userId: string,
  projectRole?: string | null
): boolean {
  return canManageTasksInProject(role, projectManagerId, userId, projectRole);
}

/** User can edit this task: ADMIN/manager can edit any; MEMBER only own (assigneeId === userId) */
export function canEditTask(
  role: string,
  projectManagerId: string,
  userId: string,
  taskAssigneeId: string | null,
  projectRole?: string | null
): boolean {
  if (!userId) return false;
  if (canManageTasksInProject(role, projectManagerId, userId, projectRole)) return true;
  return role === "MEMBER" && !!taskAssigneeId && taskAssigneeId === userId;
}

/** User can move (drag) this task: ADMIN/manager any; MEMBER only own */
export function canMoveTask(
  role: string,
  projectManagerId: string,
  userId: string,
  taskAssigneeId: string | null,
  projectRole?: string | null
): boolean {
  return canEditTask(role, projectManagerId, userId, taskAssigneeId, projectRole);
}

/** User has at least read access to this project as owner or member. */
export function canAccessProject(
  role: string,
  projectManagerId: string,
  userId: string,
  isMember: boolean
): boolean {
  return projectManagerId === userId || isMember;
}
