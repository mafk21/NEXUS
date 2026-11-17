export const SHORTCUT_TYPES = ['website', 'app', 'file', 'folder']
const PICK_TOKEN = /^pick:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function validWebUrl(value) {
  if (typeof value !== 'string' || value.length > 2048 || value !== value.trim()) return false
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !!url.hostname && !url.username && !url.password } catch { return false }
}
export function validShortcut(item) {
  if (!item || typeof item.id !== 'string' || !item.id || typeof item.label !== 'string' || !item.label.trim() || item.label !== item.label.trim() || item.label.length > 60 || !SHORTCUT_TYPES.includes(item.type) || typeof item.autoOpen !== 'boolean') return false
  return item.type === 'website' ? validWebUrl(item.target) : typeof item.target === 'string' && PICK_TOKEN.test(item.target)
}
const defaultLinks = {
  gaming: { label: 'Steam', target: 'https://store.steampowered.com/' },
  study: { label: 'Wikipedia', target: 'https://www.wikipedia.org/' },
  work: { label: 'Google Calendar', target: 'https://calendar.google.com/' },
  chill: { label: 'YouTube', target: 'https://www.youtube.com/' },
  custom: { label: 'Search', target: 'https://www.google.com/' }
}
export function shortcutsFor(category, setup) {
  if (Array.isArray(setup?.shortcuts)) return setup.shortcuts
  const preset = category && setup?.id === `default-${category.id}` && defaultLinks[category.id]
  return preset ? [{ id: `starter-${category.id}`, ...preset, type: 'website', autoOpen: false }] : []
}
