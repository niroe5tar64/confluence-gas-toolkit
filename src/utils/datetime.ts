const formatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDateJST(dateString?: string | Date) {
  if (!dateString) {
    return formatter.format(new Date());
  }
  return formatter.format(new Date(dateString));
}
