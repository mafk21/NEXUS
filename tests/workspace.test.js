import { describe, expect, it } from 'vitest'
import { STORAGE_KEY } from '../src/scenes.js'
import { WORKSPACE_KEY, activateSetup, addCategory, addSetup, deleteCategory, deleteSetup, editCategory, editSetup, initialWorkspace, isValidWorkspace, loadWorkspace, saveWorkspace } from '../src/workspace.js'
function storage(initial = {}) { const values = { ...initial }; return { getItem: key => values[key] ?? null, setItem: (key, value) => { values[key] = value }, values } }
const setup = { id: 'new-setup', name: 'My setup', color: '#aabbcc', icon: 'heart' }
describe('workspace data', () => {
  it('starts with five categories, each with one Default setup', () => {
    const ws = initialWorkspace(); expect(ws.categories.map(c => c.name)).toEqual(['Gaming', 'Study', 'Work', 'Chill', 'Custom'])
    expect(ws.categories.every(c => c.setups.length === 1 && c.setups[0].name === 'Default')).toBe(true); expect(isValidWorkspace(ws)).toBe(true)
  })
  it('migrates the previous active category without discarding it', () => {
    expect(loadWorkspace(storage({ [STORAGE_KEY]: 'gaming' })).workspace.active).toEqual({ categoryId: 'gaming', setupId: 'default-gaming' })
  })
  it('creates, edits and persists a category and multiple setups', () => {
    let ws = initialWorkspace(); ws = addCategory(ws, { id: 'new', name: '  Design  ', icon: 'palette' }); ws = addSetup(ws, 'new', setup)
    ws = addSetup(ws, 'new', { ...setup, id: 'second', name: 'Another' }); ws = editCategory(ws, 'new', { name: 'Create', icon: 'star' })
    ws = editSetup(ws, 'new', 'new-setup', { name: 'Edited', icon: 'music', color: '#123456' })
    const s = storage(); expect(saveWorkspace(s, ws)).toBe(true); const result = loadWorkspace(s).workspace.categories.find(c => c.id === 'new')
    expect(result.name).toBe('Create'); expect(result.icon).toBe('star'); expect(result.setups).toHaveLength(3); expect(result.setups[1]).toEqual({ id: 'new-setup', name: 'Edited', icon: 'music', color: '#123456', wallpaper: 'builtin:custom.png', shortcuts: [] })
  })
  it('copies setups independently and clears the active selection on deletion', () => {
    let ws = initialWorkspace(); const original = ws.categories[0].setups[0]
    ws = addSetup(ws, 'gaming', { ...original, id: 'copy', name: 'Mine' }); ws = editSetup(ws, 'gaming', 'copy', { name: 'Changed', icon: 'heart', color: '#123456' })
    expect(ws.categories[0].setups[0]).toEqual(original)
    ws = activateSetup(ws, 'gaming', 'copy'); ws = deleteSetup(ws, 'gaming', 'copy'); expect(ws.active).toBeNull()
    ws = activateSetup(ws, 'gaming', original.id); ws = deleteCategory(ws, 'gaming'); expect(ws.active).toBeNull(); expect(ws.categories.some(c => c.id === 'gaming')).toBe(false)
    expect(isValidWorkspace(ws)).toBe(true)
  })
  it('rejects empty names, duplicate IDs, invalid active targets and invalid data', () => {
    const ws = initialWorkspace(); expect(addCategory(ws, { id: 'new', name: '  ' })).toBe(ws)
    expect(addSetup(ws, 'gaming', { ...setup, id: 'default-gaming' })).toBe(ws)
    expect(activateSetup(ws, 'gaming', 'missing')).toBe(ws)
    expect(isValidWorkspace({ ...ws, active: { categoryId: 'gaming', setupId: 'missing' } })).toBe(false)
  })
  it('preserves unreadable saved data and reports that writes should be blocked', () => {
    const s = storage({ [WORKSPACE_KEY]: '{broken' }); const result = loadWorkspace(s)
    expect(result.readOnly).toBe(true); expect(result.warning).toContain('will not be saved'); expect(s.values[WORKSPACE_KEY]).toBe('{broken')
  })
  it('handles unavailable storage', () => {
    const broken = { getItem() { throw Error() }, setItem() { throw Error() } }
    expect(loadWorkspace(broken).warning).toBeTruthy(); expect(saveWorkspace(broken, initialWorkspace())).toBe(false)
  })
})
