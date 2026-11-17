export const categories = [
  { id: 'gaming', name: 'Gaming', description: 'Enter your element.', longDescription: 'A little more energy, a little less distraction. Make space for the games you love.', image: 'gaming.png', accent: '#a688ff', mood: 'READY TO PLAY', tint: 'violet' },
  { id: 'study', name: 'Study', description: 'Find your focus.', longDescription: 'Clear the noise and settle into a calmer place to learn, think, and make progress.', image: 'study.png', accent: '#a2c5d1', mood: 'TIME TO FOCUS', tint: 'blue' },
  { id: 'work', name: 'Work', description: 'Get in the zone.', longDescription: 'A considered space for getting things done, one good idea at a time.', image: 'work.png', accent: '#d3ba9b', mood: 'READY TO CREATE', tint: 'sand' },
  { id: 'chill', name: 'Chill', description: 'Take it easy.', longDescription: 'Slow things down and settle in. This space is all about taking a moment for yourself.', image: 'dusk.png', accent: '#d7a4c1', mood: 'TAKE A BREATH', tint: 'rose' },
  { id: 'custom', name: 'Custom', description: 'Make it yours.', longDescription: 'A little room for everything else. Your space, with possibilities all your own.', image: 'custom.png', accent: '#a5a5ff', mood: 'YOUR KIND OF SPACE', tint: 'indigo' }
]

export const STORAGE_KEY = 'nexus.active-category.v1'
export const MOTION_KEY = 'nexus.reduce-motion.v1'
export const DEFAULT_CATEGORY = 'chill'
export function findCategory(id) { return categories.find(category => category.id === id) }
export function readActive(storage) {
  try { return findCategory(storage.getItem(STORAGE_KEY))?.id ?? DEFAULT_CATEGORY }
  catch { return DEFAULT_CATEGORY }
}
export function saveActive(storage, id) {
  if (!findCategory(id)) return false
  try { storage.setItem(STORAGE_KEY, id); return true } catch { return false }
}
export function readReducedMotion(storage) {
  try { return storage.getItem(MOTION_KEY) === 'true' } catch { return false }
}
export function saveReducedMotion(storage, value) {
  try { storage.setItem(MOTION_KEY, String(value)); return true } catch { return false }
}
