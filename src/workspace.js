import { categories as presets, STORAGE_KEY, DEFAULT_CATEGORY } from './scenes.js'
import { shortcutsFor, validShortcut } from './shortcuts.js'

export const WORKSPACE_KEY = 'nexus.workspace.v2'
export const ICONS = ['sparkles', 'gamepad', 'book', 'briefcase', 'moon', 'star', 'heart', 'coffee', 'music', 'palette']
export const COLORS = ['#a688ff', '#a2c5d1', '#d3ba9b', '#d7a4c1', '#a5a5ff', '#8fd8b5', '#efb088', '#ef9ba7']
export const BROWSER_IMAGE_LIMIT = 2 * 1024 * 1024
export function isWallpaperReference(value) {
  if (typeof value !== 'string') return false
  if (presets.some(p => value === `builtin:${p.image}`)) return true
  if (/^user:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg)$/i.test(value)) return true
  return value.length <= Math.ceil(BROWSER_IMAGE_LIMIT * 4 / 3) + 64 && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)
}
export function wallpaperFor(category, setup) { return setup?.wallpaper || `builtin:${category.image}` }
const builtInIcons = { gaming: 'gamepad', study: 'book', work: 'briefcase', chill: 'moon', custom: 'sparkles' }
const MAX_NAME = 60
export const cleanName = value => typeof value === 'string' ? value.trim().slice(0, MAX_NAME) : ''
const isColor = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
const safeIcon = icon => ICONS.includes(icon) ? icon : 'sparkles'
const safeColor = color => isColor(color) ? color : COLORS[0]
export const createId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

export function initialWorkspace(activeCategory = DEFAULT_CATEGORY) {
  const categories = presets.map(preset => ({ ...preset, icon: builtInIcons[preset.id], setups: [{ id: `default-${preset.id}`, name: 'Default', icon: builtInIcons[preset.id], color: preset.accent, wallpaper: `builtin:${preset.image}` }] }))
  const category = categories.find(item => item.id === activeCategory) ?? categories.find(item => item.id === DEFAULT_CATEGORY)
  return { version: 2, categories, active: { categoryId: category.id, setupId: category.setups[0].id } }
}

// Reject damaged data rather than silently converting it into valid-looking user data.
export function isValidWorkspace(value) {
  if (!value || value.version !== 2 || !Array.isArray(value.categories)) return false
  const categoryIds = new Set(), setupIds = new Set()
  for (const category of value.categories) {
    if (!category || typeof category.id !== 'string' || !category.id || categoryIds.has(category.id) || !cleanName(category.name) || category.name !== cleanName(category.name) || category.name.length > MAX_NAME || !ICONS.includes(category.icon) || !Array.isArray(category.setups)) return false
    categoryIds.add(category.id)
    if (!presets.some(p => p.image === category.image)) return false
    if (['description', 'longDescription', 'mood'].some(key => category[key] !== undefined && typeof category[key] !== 'string')) return false
    for (const setup of category.setups) {
      if (!setup || typeof setup.id !== 'string' || !setup.id || setupIds.has(setup.id) || !cleanName(setup.name) || setup.name !== cleanName(setup.name) || setup.name.length > MAX_NAME || !ICONS.includes(setup.icon) || !isColor(setup.color) || (setup.wallpaper !== undefined && !isWallpaperReference(setup.wallpaper))) return false
      if (setup.shortcuts !== undefined && (!Array.isArray(setup.shortcuts) || setup.shortcuts.length > 100 || setup.shortcuts.some(item => !validShortcut(item)) || new Set(setup.shortcuts.map(item => item.id)).size !== setup.shortcuts.length)) return false
      setupIds.add(setup.id)
    }
  }
  if (value.active === null) return true
  if (!value.active || typeof value.active.categoryId !== 'string' || typeof value.active.setupId !== 'string') return false
  const activeCategory = value.categories.find(c => c.id === value.active.categoryId)
  return !!activeCategory?.setups.some(s => s.id === value.active.setupId)
}

export function loadWorkspace(storage) {
  try {
    const saved = storage.getItem(WORKSPACE_KEY)
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved)
        if (!isValidWorkspace(parsed)) throw new Error('Invalid workspace')
        return { workspace: parsed, warning: '', readOnly: false }
      } catch {
        return { workspace: initialWorkspace(), warning: 'Saved workspace data is invalid. Changes will not be saved, to avoid overwriting it.', readOnly: true }
      }
    }
    return { workspace: initialWorkspace(storage.getItem(STORAGE_KEY)), warning: '', readOnly: false }
  } catch {
    return { workspace: initialWorkspace(), warning: 'Saved workspace could not be read. Changes may not be saved on this device.', readOnly: false }
  }
}
export function saveWorkspace(storage, workspace) {
  if (!isValidWorkspace(workspace)) return false
  try { storage.setItem(WORKSPACE_KEY, JSON.stringify(workspace)); return true } catch { return false }
}

export function addCategory(state, { id, name, icon }) {
  name = cleanName(name)
  const defaultId = `default-${id}`
  if (!id || !name || state.categories.some(c => c.id === id || c.setups.some(s => s.id === defaultId))) return state
  return { ...state, categories: [...state.categories, { id, name, icon: safeIcon(icon), image: 'custom.png', description: 'Your space, your way.', longDescription: 'A space to make entirely your own.', mood: 'YOUR KIND OF SPACE', setups: [{ id: defaultId, name: 'Default', icon: safeIcon(icon), color: COLORS[0], wallpaper: 'builtin:custom.png' }] }] }
}
export function editCategory(state, id, { name, icon }) {
  name = cleanName(name)
  if (!name || !state.categories.some(c => c.id === id)) return state
  return { ...state, categories: state.categories.map(c => c.id === id ? { ...c, name, icon: safeIcon(icon) } : c) }
}
export function deleteCategory(state, id) {
  if (!state.categories.some(c => c.id === id)) return state
  return { ...state, categories: state.categories.filter(c => c.id !== id), active: state.active?.categoryId === id ? null : state.active }
}
export function addSetup(state, categoryId, { id, name, icon, color, wallpaper, shortcuts }) {
  name = cleanName(name)
  if (!id || !name || state.categories.some(c => c.setups.some(s => s.id === id)) || !state.categories.some(c => c.id === categoryId)) return state
  return { ...state, categories: state.categories.map(c => c.id === categoryId ? { ...c, setups: [...c.setups, { id, name, icon: safeIcon(icon), color: safeColor(color), wallpaper: isWallpaperReference(wallpaper) ? wallpaper : `builtin:${c.image}`, shortcuts: Array.isArray(shortcuts) && shortcuts.every(validShortcut) && shortcuts.length <= 100 ? shortcuts.map(s => ({ ...s })) : [] }] } : c) }
}
export function editSetup(state, categoryId, setupId, { name, icon, color }) {
  name = cleanName(name)
  if (!name || !state.categories.find(c => c.id === categoryId)?.setups.some(s => s.id === setupId)) return state
  return { ...state, categories: state.categories.map(c => c.id === categoryId ? { ...c, setups: c.setups.map(s => s.id === setupId ? { ...s, name, icon: safeIcon(icon), color: safeColor(color) } : s) } : c) }
}
export function deleteSetup(state, categoryId, setupId) {
  if (!state.categories.find(c => c.id === categoryId)?.setups.some(s => s.id === setupId)) return state
  return { ...state, categories: state.categories.map(c => c.id === categoryId ? { ...c, setups: c.setups.filter(s => s.id !== setupId) } : c), active: state.active?.categoryId === categoryId && state.active?.setupId === setupId ? null : state.active }
}
export function activateSetup(state, categoryId, setupId) {
  if (!state.categories.find(c => c.id === categoryId)?.setups.some(s => s.id === setupId)) return state
  return { ...state, active: { categoryId, setupId } }
}

export function setSetupWallpaper(state, categoryId, setupId, wallpaper) {
  if (!isWallpaperReference(wallpaper) || !state.categories.find(c => c.id === categoryId)?.setups.some(s => s.id === setupId)) return state
  return { ...state, categories: state.categories.map(c => c.id === categoryId ? { ...c, setups: c.setups.map(s => s.id === setupId ? { ...s, wallpaper } : s) } : c) }
}

export function setSetupShortcuts(state, categoryId, setupId, shortcuts) {
  const category = state.categories.find(c => c.id === categoryId)
  if (!category?.setups.some(s => s.id === setupId) || !Array.isArray(shortcuts) || shortcuts.length > 100 || shortcuts.some(s => !validShortcut(s)) || new Set(shortcuts.map(s => s.id)).size !== shortcuts.length) return state
  return { ...state, categories: state.categories.map(c => c.id === categoryId ? { ...c, setups: c.setups.map(s => s.id === setupId ? { ...s, shortcuts: shortcuts.map(item => ({ ...item })) } : s) } : c) }
}
export { shortcutsFor }
