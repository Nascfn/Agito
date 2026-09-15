// Formatting helpers. Date math uses YYYY-MM-DD keys in UTC so a date-only
// due date never shifts across time zones.

const MS_PER_DAY = 86_400_000;

const shortDateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const weekdayFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  timeZone: "UTC",
});

/** The viewer's local calendar date as YYYY-MM-DD. */
export function localDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function keyToUtc(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** "30m", "2h", "1h 30m" */
export function formatEstimate(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

/** "3pm", "9:30am" */
export function formatTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const suffix = hours < 12 ? "am" : "pm";
  const hour12 = hours % 12 || 12;
  return minutes ? `${hour12}:${String(minutes).padStart(2, "0")}${suffix}` : `${hour12}${suffix}`;
}

/**
 * A short due label like "Today", "Tomorrow 3pm", "Fri", or "Oct 3".
 * Pass `today` as null before the viewer's date is known (server render).
 */
export function formatDue(dueDate: string, dueTime: string | null, today: string | null) {
  const due = keyToUtc(dueDate);
  const time = dueTime ? ` ${formatTime(dueTime)}` : "";

  if (!today) {
    return { label: `${shortDateFormat.format(due)}${time}`, overdue: false };
  }

  const diff = Math.round((due - keyToUtc(today)) / MS_PER_DAY);
  let day: string;
  if (diff === 0) day = "Today";
  else if (diff === 1) day = "Tomorrow";
  else if (diff === -1) day = "Yesterday";
  else if (diff > 1 && diff < 7) day = weekdayFormat.format(due);
  else day = shortDateFormat.format(due);

  return { label: `${day}${time}`, overdue: diff < 0 };
}
