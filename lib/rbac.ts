/**
 * Role-Based Access Control (RBAC) helpers for IT Project Management.
 * Roles: ADMIN (full access), MANAGER (project-level), MEMBER (own tasks only).
 */

export type Role = "ADMIN" | "MANAGER" | "MEMBER";

/** ADMIN has full system access (god mode) */
export function isAdmin(role: string): role is "ADMIN" {
  return role === "ADMIN";
}

/** User is the manager of this project (or ADMIN) */
export function canManageProject(role: string, projectManagerId: string, userId: string): boolean {
  return role === "ADMIN" || (role === "MANAGER" && projectManagerId === userId);
}

/** User can create/edit/delete tasks in this project (ADMIN or project manager) */
export function canManageTasksInProject(role: string, projectManagerId: string, userId: string): boolean {
  return role === "ADMIN" || (role === "MANAGER" && projectManagerId === userId);
}

/** User can create a task in this project */
export function canCreateTask(role: string, projectManagerId: string, userId: string): boolean {
  return canManageTasksInProject(role, projectManagerId, userId);
}

/** User can delete a task (ADMIN or project manager only) */
export function canDeleteTask(role: string, projectManagerId: string, userId: string): boolean {
  return canManageTasksInProject(role, projectManagerId, userId);
}

/** User can assign/reassign assignee (ADMIN or project manager only) */
export function canAssignTask(role: string, projectManagerId: string, userId: string): boolean {
  return canManageTasksInProject(role, projectManagerId, userId);
}

/** User can edit this task: ADMIN/manager can edit any; MEMBER only own (assigneeId === userId) */
export function canEditTask(
  role: string,
  projectManagerId: string,
  userId: string,
  taskAssigneeId: string | null
): boolean {
  if (!userId) return false;
  if (canManageTasksInProject(role, projectManagerId, userId)) return true;
  return role === "MEMBER" && !!taskAssigneeId && taskAssigneeId === userId;
}

/** User can move (drag) this task: ADMIN/manager any; MEMBER only own */
export function canMoveTask(
  role: string,
  projectManagerId: string,
  userId: string,
  taskAssigneeId: string | null
): boolean {
  return canEditTask(role, projectManagerId, userId, taskAssigneeId);
}

/** User has at least read access to this project (ADMIN, or manager, or member) */
export function canAccessProject(
  role: string,
  projectManagerId: string,
  userId: string,
  isMember: boolean
): boolean {
  return role === "ADMIN" || projectManagerId === userId || isMember;
}
