/** Simple validation helpers for forms */

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function getPriorityFromDeadline(deadline: Date | null): "LOW" | "MEDIUM" | "HIGH" {
  if (!deadline) return "LOW";
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 3) return "HIGH";
  if (diffDays < 7) return "MEDIUM";
  return "LOW";
}
