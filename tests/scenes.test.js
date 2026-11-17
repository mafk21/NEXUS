import { describe, it, expect } from 'vitest'
import { categories, DEFAULT_CATEGORY, STORAGE_KEY, findCategory, readActive, saveActive, readReducedMotion, saveReducedMotion } from '../src/scenes.js'
function storage(initial = {}) { const values = { ...initial }; return { getItem: key => values[key] ?? null, setItem: (key, value) => { values[key] = value } } }
describe('built-in setups', () => {
  it('has five uniquely identified categories with preview art', () => {
    expect(categories.map(c => c.name)).toEqual(['Gaming', 'Study', 'Work', 'Chill', 'Custom'])
    expect(new Set(categories.map(c => c.id)).size).toBe(5)
    for (const item of categories) { expect(item.image).toBeTruthy(); expect(findCategory(item.id)).toEqual(item) }
  })
  it('restores a valid active setup and falls back for missing or invalid values', () => {
    expect(readActive(storage())).toBe(DEFAULT_CATEGORY)
    expect(readActive(storage({ [STORAGE_KEY]: 'gaming' }))).toBe('gaming')
    expect(readActive(storage({ [STORAGE_KEY]: 'not-a-category' }))).toBe(DEFAULT_CATEGORY)
  })
  it('persists a valid selection and does not persist an invalid one', () => {
    const s = storage(); expect(saveActive(s, 'study')).toBe(true); expect(readActive(s)).toBe('study')
    expect(saveActive(s, 'nope')).toBe(false); expect(readActive(s)).toBe('study')
  })
  it('handles storage failures without crashing or claiming success', () => {
    const broken = { getItem() { throw Error('unavailable') }, setItem() { throw Error('unavailable') } }
    expect(readActive(broken)).toBe(DEFAULT_CATEGORY); expect(saveActive(broken, 'work')).toBe(false)
    expect(readReducedMotion(broken)).toBe(false); expect(saveReducedMotion(broken, true)).toBe(false)
  })
  it('saves the reduce-motion preference', () => {
    const s = storage(); expect(readReducedMotion(s)).toBe(false); expect(saveReducedMotion(s, true)).toBe(true); expect(readReducedMotion(s)).toBe(true)
  })
})
