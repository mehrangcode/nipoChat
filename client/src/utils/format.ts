// Persian-locale (fa-IR) time/date helpers.

const timeFmt = new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' });
const dateFmt = new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long' });

export function formatTime(ts: number): string {
  return timeFmt.format(ts);
}

export function formatDay(ts: number): string {
  return dateFmt.format(ts);
}

/** "online" / relative last-seen text. */
export function lastSeenText(online: boolean, lastSeenAt?: number): string {
  if (online) return 'آنلاین';
  if (!lastSeenAt) return 'آفلاین';
  const diff = Date.now() - lastSeenAt;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'همین الان آنلاین بود';
  if (min < 60) return `${toFa(min)} دقیقه پیش`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${toFa(hr)} ساعت پیش`;
  return `آخرین بازدید ${formatDay(lastSeenAt)}`;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function toFa(n: number): string {
  return n.toLocaleString('fa-IR');
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? '؟').toUpperCase();
}
