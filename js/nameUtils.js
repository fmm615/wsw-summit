/**
 * Small helpers derived from a single "full name" field — the form only
 * collects one name input (matching the artwork's single "SPEAKER NAME"
 * slot), so anything that needs a first name or initials derives it here
 * rather than requiring separate first/last inputs.
 */

export function firstNameOf(fullName) {
  const trimmed = (fullName || "").trim();
  return trimmed ? trimmed.split(/\s+/)[0] : "";
}

export function initialsOf(fullName) {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}
