// Pure helpers keep the exposed notch actions and window geometry predictable.
const ACTIONS = new Set(['activate', 'shortcut', 'accept-suggestion', 'dismiss-suggestion', 'media'])
function validId(value) { return typeof value === 'string' && value.length > 0 && value.length <= 150 }
function validAction(action) {
  if (!action || typeof action !== 'object' || !ACTIONS.has(action.type)) return false
  if (action.type === 'media') return ['previous', 'playPause', 'next'].includes(action.command)
  if (action.type === 'activate') return validId(action.categoryId) && validId(action.setupId)
  if (action.type === 'shortcut') return validId(action.categoryId) && validId(action.setupId) && validId(action.shortcutId)
  return validId(action.ruleId)
}
function notchBounds(workArea, expanded) {
  const width = Math.min(360, workArea.width)
  const height = Math.min(expanded ? 526 : 58, workArea.height)
  return { x: Math.round(workArea.x + (workArea.width - width) / 2), y: workArea.y, width, height }
}
module.exports = { validAction, notchBounds }
