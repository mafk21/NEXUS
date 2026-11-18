export const AUTOMATION_KEY = 'nexus.suggestions.v1'
const EXE = /^[a-z0-9][a-z0-9 _().-]{0,78}\.exe$/i
export function isValidRule(rule) {
  if (!rule || typeof rule.id !== 'string' || !rule.id || typeof rule.categoryId !== 'string' || !rule.categoryId || typeof rule.setupId !== 'string' || !rule.setupId || typeof rule.enabled !== 'boolean') return false
  if (rule.type === 'schedule') return typeof rule.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(rule.time)
  if (rule.type === 'app') return typeof rule.process === 'string' && EXE.test(rule.process)
  return false
}
export function readRules(storage) {
  try { const value = storage?.getItem(AUTOMATION_KEY); if (!value) return { rules: [], readOnly: false }; const rules = JSON.parse(value); if (!Array.isArray(rules) || rules.length > 50 || rules.some(rule => !isValidRule(rule)) || new Set(rules.map(r => r.id)).size !== rules.length) throw Error(); return { rules, readOnly: false } }
  catch { return { rules: [], readOnly: true } }
}
export function saveRules(storage, rules) {
  if (!storage || rules.length > 50 || rules.some(rule => !isValidRule(rule)) || new Set(rules.map(r => r.id)).size !== rules.length) return false
  try { storage.setItem(AUTOMATION_KEY, JSON.stringify(rules)); return true } catch { return false }
}
// Pure matching: callers present a suggestion and never activate a setup automatically.
export function matchingSuggestions(rules, date, names = [], previousNames = [], seen = new Set()) {
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  const day = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`
  const current = new Set(names.map(n => n.toLowerCase())), previous = new Set(previousNames.map(n => n.toLowerCase()))
  return rules.filter(rule => rule.enabled && (rule.type === 'schedule' ? rule.time === time && !seen.has(`${rule.id}:${day}`) : current.has(rule.process.toLowerCase()) && !previous.has(rule.process.toLowerCase())))
}
