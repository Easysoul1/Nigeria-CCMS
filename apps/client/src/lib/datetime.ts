const LAGOS = "Africa/Lagos";

/**
 * The API stores and returns UTC. Staff-facing timestamps are presented in
 * West Africa Time (Africa/Lagos throughout the year) so a hearing entered as
 * 09:00 does not appear as 08:00.
 */
export function formatLagosDateTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: LAGOS,
  }).format(date);
}

export function formatLagosDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeZone: LAGOS,
  }).format(date);
}
