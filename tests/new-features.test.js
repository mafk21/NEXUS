import { describe, expect, it, vi } from 'vitest'
import { createRequire } from 'node:module'
import { AUTOMATION_KEY, isValidRule, matchingSuggestions, readRules, saveRules } from '../src/automation.js'
import { createShare, parseShare, readProfile, saveProfile } from '../src/sharing.js'
import { initialWorkspace } from '../src/workspace.js'
const require = createRequire(import.meta.url)
const { createProcessService } = require('../electron/process-service.cjs')
const { createMediaService } = require('../electron/media-service.cjs')
function storage(initial = {}) { const data = { ...initial }; return { getItem: k => data[k] ?? null, setItem: (k, v) => { data[k] = v }, removeItem: k => { delete data[k] }, data } }
const schedule = { id: 'r1', categoryId: 'gaming', setupId: 'default-gaming', enabled: true, type: 'schedule', time: '09:30' }
const app = { id: 'r2', categoryId: 'work', setupId: 'default-work', enabled: true, type: 'app', process: 'Code.exe' }
describe('confirmation-only suggestions', () => {
  it('matches only the scheduled minute and new running processes', () => {
    const now = new Date(2026, 0, 2, 9, 30)
    expect(matchingSuggestions([schedule, app], now, ['code.EXE'], [])).toEqual([schedule, app])
    expect(matchingSuggestions([schedule, app], now, ['code.exe'], ['CODE.EXE'], new Set(['r1:2026-1-2']))).toEqual([])
    expect(matchingSuggestions([schedule], new Date(2026, 0, 2, 9, 31))).toEqual([])
    expect(matchingSuggestions([{ ...schedule, enabled: false }], now)).toEqual([])
  })
  it('rejects unsafe process names and protects corrupt saved rules', () => {
    for (const process of ['cmd.exe & calc.exe', '../evil.exe', 'C:\\foo.exe', '', 'foo']) expect(isValidRule({ ...app, process })).toBe(false)
    const s = storage({ [AUTOMATION_KEY]: '{broken' }); expect(readRules(s).readOnly).toBe(true); expect(s.data[AUTOMATION_KEY]).toBe('{broken')
    expect(saveRules(s, [schedule, app])).toBe(true); expect(readRules(s).rules).toEqual([schedule, app])
    expect(saveRules(s, [schedule, schedule])).toBe(false)
  })
  it('uses a fixed Windows tasklist command and parses executable names without sending paths', async () => {
    const execute = vi.fn().mockResolvedValue({ stdout: '"Code.exe","123","Console","1","30,000 K"\r\n"CODE.exe","555","Console","1","5 K"\r\nINFO: empty\r\n' })
    const service = createProcessService({ platform: 'win32', execute })
    const result = await service.list(); expect(result.names).toEqual(['Code.exe', 'CODE.exe'])
    expect(execute.mock.calls[0][0]).toMatch(/System32\\tasklist\.exe$/i); expect(execute.mock.calls[0][1]).toEqual(['/FO', 'CSV', '/NH'])
    execute.mockRejectedValueOnce(Error('failed')); expect((await service.list()).error).toBeTruthy()
    expect((await createProcessService({ platform: 'linux', execute }).list()).error).toBeTruthy()
  })
})
describe('local profile and portable setup files', () => {
  it('keeps profiles optional and stored locally', () => {
    const s = storage(); expect(readProfile(s)).toBe(''); expect(saveProfile(s, '  Name  ')).toBe(true); expect(readProfile(s)).toBe('Name'); expect(saveProfile(s, '')).toBe(true); expect(readProfile(s)).toBe('')
  })
  it('shares only safe portable data and never includes local paths or automatic opening', () => {
    const category = initialWorkspace().categories[0], setup = { ...category.setups[0], wallpaper: 'user:12345678-1234-1234-1234-123456789abc.png' }
    const links = [{ type: 'file', label: 'private', target: 'pick:12345678-1234-1234-1234-123456789abc', autoOpen: true }, { type: 'website', label: 'Site', target: 'https://example.com', autoOpen: true }]
    const share = createShare(category, setup, links, ''); const json = JSON.stringify(share)
    expect(json).not.toContain('private'); expect(json).not.toContain('pick:'); expect(json).not.toContain('user:'); expect(json).not.toContain('autoOpen'); expect(share.author).toBeUndefined()
    expect(parseShare(json)).toMatchObject({ name: 'Default', wallpaper: 'builtin:gaming.png', websites: [{ label: 'Site', url: 'https://example.com' }] })
    expect(createShare(category, setup, links, 'Name').author).toBe('Name')
  })
  it('rejects malicious, oversized, unsupported or malformed share files', () => {
    const share = createShare(initialWorkspace().categories[0], initialWorkspace().categories[0].setups[0], [], '')
    for (const value of ['broken', 'x'.repeat(256001), JSON.stringify({ ...share, version: 9 }), JSON.stringify({ ...share, setup: { ...share.setup, wallpaper: 'user:../../secret' } }), JSON.stringify({ ...share, setup: { ...share.setup, websites: [{ label: 'Danger', url: 'javascript:alert(1)' }] } })]) expect(() => parseShare(value)).toThrow()
  })
})
describe('system media keys', () => {
  it('sends only allowlisted Windows keys and reports unsupported/error states', async () => {
    const execute = vi.fn().mockResolvedValue({}); const service = createMediaService({ platform: 'win32', execute })
    expect(await service.send('playPause')).toEqual({ success: true })
    const args = execute.mock.calls[0][1], script = Buffer.from(args[3], 'base64').toString('utf16le')
    expect(script).toContain('keybd_event(179'); expect((await service.send('playPause;evil')).error).toBeTruthy(); expect(execute).toHaveBeenCalledTimes(1)
    execute.mockRejectedValueOnce(Error()); expect((await service.send('next')).error).toBeTruthy()
    expect((await createMediaService({ platform: 'linux', execute }).send('next')).error).toBeTruthy()
  })
})
