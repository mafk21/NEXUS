import { describe, expect, it } from 'vitest'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { notchBounds, validAction } = require('../electron/notch-service.cjs')
describe('notch IPC and screen bounds', () => {
  it('centers the notch in a display work area and clamps to small screens', () => {
    expect(notchBounds({ x: -1920, y: 40, width: 1920, height: 1040 }, false)).toEqual({ x: -1140, y: 40, width: 360, height: 58 })
    expect(notchBounds({ x: 10, y: 20, width: 300, height: 400 }, true)).toEqual({ x: 10, y: 20, width: 300, height: 400 })
  })
  it('accepts only narrow actions with bounded IDs, not arbitrary desktop commands', () => {
    expect(validAction({ type: 'activate', categoryId: 'work', setupId: 'default-work' })).toBe(true)
    expect(validAction({ type: 'shortcut', categoryId: 'work', setupId: 'default-work', shortcutId: 'id' })).toBe(true)
    expect(validAction({ type: 'media', command: 'next' })).toBe(true)
    expect(validAction({ type: 'media', command: 'run' })).toBe(false)
    expect(validAction({ type: 'accept-suggestion', ruleId: 'id' })).toBe(true)
    for (const action of [null, {}, { type: 'run', command: 'calc.exe' }, { type: 'shortcut', categoryId: 'work', setupId: 'id', shortcutId: '' }, { type: 'activate', categoryId: 'x'.repeat(151), setupId: 'id' }, { type: 'accept-suggestion' }]) expect(validAction(action)).toBe(false)
  })
})
