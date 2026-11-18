import { ICONS, cleanName, isWallpaperReference } from './workspace.js'
import { validWebUrl } from './shortcuts.js'
export const PROFILE_KEY = 'nexus.local-profile.v1'
export function readProfile(storage) { try { const value = JSON.parse(storage?.getItem(PROFILE_KEY) || 'null'); return typeof value?.name === 'string' && value.name === cleanName(value.name) ? value.name : '' } catch { return '' } }
export function saveProfile(storage, name) { try { if (!storage) return false; const value = cleanName(name); if (value) storage.setItem(PROFILE_KEY, JSON.stringify({ name: value })); else storage.removeItem(PROFILE_KEY); return true } catch { return false } }
// Share only portable data. Local targets, imported wallpapers, and auto-open settings stay private.
export function createShare(category, setup, shortcuts, profile) {
  return { format: 'nexus-setup', version: 1, setup: { name: setup.name, icon: setup.icon, color: setup.color, wallpaper: setup.wallpaper?.startsWith('builtin:') && isWallpaperReference(setup.wallpaper) ? setup.wallpaper : `builtin:${category.image}`, websites: shortcuts.filter(s => s.type === 'website').map(s => ({ label: s.label, url: s.target })) }, ...(profile ? { author: cleanName(profile) } : {}) }
}
export function parseShare(text) {
  if (typeof text !== 'string' || text.length > 256000) throw Error('This file is too large or invalid.')
  let data; try { data = JSON.parse(text) } catch { throw Error('This is not a valid NEXUS setup file.') }
  const s = data?.setup
  if (data?.format !== 'nexus-setup' || data.version !== 1 || !s || typeof s.name !== 'string' || s.name !== cleanName(s.name) || !s.name || !ICONS.includes(s.icon) || typeof s.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(s.color) || !s.wallpaper?.startsWith('builtin:') || !isWallpaperReference(s.wallpaper) || !Array.isArray(s.websites) || s.websites.length > 100 || s.websites.some(w => typeof w?.label !== 'string' || w.label !== cleanName(w.label) || !w.label || !validWebUrl(w.url))) throw Error('This setup file is invalid or uses an unsupported version.')
  if (data.author !== undefined && (typeof data.author !== 'string' || data.author !== cleanName(data.author))) throw Error('This setup file contains an invalid profile name.')
  return { name: s.name, icon: s.icon, color: s.color, wallpaper: s.wallpaper, websites: s.websites.map(w => ({ label: w.label, url: w.url })), author: data.author || '' }
}
