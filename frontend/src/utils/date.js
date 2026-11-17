// "Tuesday, 11/17/2026" for the date row above a preview
export function formatLongDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}
