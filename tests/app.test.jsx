// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../src/App.jsx'
import { WORKSPACE_KEY } from '../src/workspace.js'
import { AUTOMATION_KEY } from '../src/automation.js'
import '../src/styles.css'

afterEach(() => { cleanup(); localStorage.clear(); delete window.nexusDesktop; vi.restoreAllMocks() })
describe('NEXUS interface', () => {
  it('browses and activates a setup, then restores it on restart', async () => {
    const user = userEvent.setup(); const view = render(<App />)
    expect(screen.getByText('Explore your categories')).toBeTruthy()
    expect(screen.getByText(/browser preview: it cannot change your wallpaper/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Explore Gaming category' }))
    await user.click(screen.getByRole('button', { name: /Activate setup/ }))
    expect(JSON.parse(localStorage.getItem(WORKSPACE_KEY)).active.categoryId).toBe('gaming')
    expect(screen.getByRole('status').textContent).toContain('Your Windows wallpaper was not changed')
    view.unmount(); render(<App />)
    expect(screen.getByRole('button', { name: /Active in NEXUS/ })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Gaming Default setup' })).toBeTruthy()
  })
  it('creates, edits, duplicates and deletes setups with confirmation, including persistence', async () => {
    const user = userEvent.setup(); const view = render(<App />)
    await user.click(screen.getByRole('button', { name: 'Explore Gaming category' }))
    await user.click(screen.getByRole('button', { name: /Add setup/ }))
    let dialog = screen.getByRole('dialog'); await user.type(within(dialog).getByLabelText('SETUP NAME'), 'Evening')
    await user.click(within(dialog).getByRole('button', { name: 'heart icon' })); await user.click(within(dialog).getByRole('button', { name: 'Create setup' }))
    await user.click(screen.getByRole('button', { name: 'Edit Evening setup' }))
    dialog = screen.getByRole('dialog'); const name = within(dialog).getByLabelText('SETUP NAME'); await user.clear(name); await user.type(name, 'Late night'); await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    await user.click(screen.getByRole('button', { name: 'Duplicate Late night setup' }))
    dialog = screen.getByRole('dialog'); expect(within(dialog).getByLabelText('SETUP NAME').value).toBe(''); await user.type(within(dialog).getByLabelText('SETUP NAME'), 'Copy'); await user.click(within(dialog).getByRole('button', { name: 'Create copy' }))
    view.unmount(); render(<App />); await user.click(screen.getByRole('button', { name: 'Explore Gaming category' }))
    expect(screen.getByRole('button', { name: 'View Late night setup' })).toBeTruthy(); expect(screen.getByRole('button', { name: 'View Copy setup' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Delete Copy setup' })); dialog = screen.getByRole('dialog'); await user.click(within(dialog).getByRole('button', { name: 'Cancel' })); expect(screen.getByRole('button', { name: 'View Copy setup' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Delete Copy setup' })); dialog = screen.getByRole('dialog'); await user.click(within(dialog).getByRole('button', { name: 'Delete setup' })); expect(screen.queryByRole('button', { name: 'View Copy setup' })).toBeNull()
  })
  it('creates, edits and deletes a category without activating its setups', async () => {
    const user = userEvent.setup(); render(<App />)
    await user.click(screen.getByRole('button', { name: 'Add category' }))
    let dialog = screen.getByRole('dialog'); await user.type(within(dialog).getByLabelText('CATEGORY NAME'), 'Art'); await user.click(within(dialog).getByRole('button', { name: 'Create category' }))
    expect(screen.getByRole('button', { name: 'View Default setup' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Edit category' })); dialog = screen.getByRole('dialog'); const field = within(dialog).getByLabelText('CATEGORY NAME'); await user.clear(field); await user.type(field, 'Design'); await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    await user.click(screen.getByRole('button', { name: 'Delete Design category' })); dialog = screen.getByRole('dialog'); expect(dialog.textContent).toContain('1 setup'); await user.click(within(dialog).getByRole('button', { name: 'Delete category' }))
    expect(screen.queryByRole('button', { name: 'Explore Design category' })).toBeNull()
  })
  it('clears the active selection after confirming deletion of its category', async () => {
    const user = userEvent.setup(); const view = render(<App />)
    await user.click(screen.getByRole('button', { name: 'Explore Chill category' }))
    await user.click(screen.getByRole('button', { name: 'Delete Chill category' }))
    const dialog = screen.getByRole('dialog'); expect(dialog.textContent).toContain('active setup will be cleared')
    await user.click(within(dialog).getByRole('button', { name: 'Delete category' }))
    expect(JSON.parse(localStorage.getItem(WORKSPACE_KEY)).active).toBeNull()
    view.unmount(); render(<App />)
    expect(screen.queryByRole('button', { name: /Active in NEXUS/ })).toBeNull()
  })
  it('imports a browser preview image, persists it, and copies it on duplication', async () => {
    const user = userEvent.setup(); const view = render(<App />)
    await user.click(screen.getByRole('button', { name: 'Explore Gaming category' }))
    const input = document.querySelector('input[type=file]')
    const png = new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3])], 'my.png', { type: 'image/png' })
    await user.upload(input, png)
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Wallpaper saved'))
    const saved = JSON.parse(localStorage.getItem(WORKSPACE_KEY)); const original = saved.categories.find(c => c.id === 'gaming').setups[0]
    expect(original.wallpaper).toMatch(/^data:image\/png;base64,/)
    await user.click(screen.getByRole('button', { name: 'Duplicate Default setup' }))
    const dialog = screen.getByRole('dialog'); await user.type(within(dialog).getByLabelText('SETUP NAME'), 'Another'); await user.click(within(dialog).getByRole('button', { name: 'Create copy' }))
    expect(JSON.parse(localStorage.getItem(WORKSPACE_KEY)).categories.find(c => c.id === 'gaming').setups[1].wallpaper).toBe(original.wallpaper)
    view.unmount(); render(<App />); await user.click(screen.getByRole('button', { name: 'Explore Gaming category' })); await user.click(screen.getByRole('button', { name: 'View Another setup' }))
    await user.click(screen.getByRole('button', { name: 'RESET' }))
    expect(JSON.parse(localStorage.getItem(WORKSPACE_KEY)).categories.find(c => c.id === 'gaming').setups[1].wallpaper).toBe('builtin:gaming.png')
  })
  it('does not mark a Windows setup active if applying the wallpaper fails', async () => {
    window.nexusDesktop = { platform: 'win32', applyWallpaper: vi.fn().mockResolvedValue({ error: 'Wallpaper file not found.' }), chooseWallpaper: vi.fn(), previewWallpaper: vi.fn() }
    const user = userEvent.setup(); render(<App />)
    await user.click(screen.getByRole('button', { name: 'Explore Gaming category' }))
    await user.click(screen.getByRole('button', { name: /Activate setup/ }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Wallpaper was not applied'))
    expect(window.nexusDesktop.applyWallpaper).toHaveBeenCalledWith('builtin:gaming.png')
    expect(localStorage.getItem(WORKSPACE_KEY)).toBeNull()
  })
  it('sets the active setup only after the Windows wallpaper service succeeds', async () => {
    window.nexusDesktop = { platform: 'win32', applyWallpaper: vi.fn().mockResolvedValue({ success: true }), chooseWallpaper: vi.fn(), previewWallpaper: vi.fn() }
    const user = userEvent.setup(); render(<App />)
    await user.click(screen.getByRole('button', { name: 'Explore Study category' }))
    await user.click(screen.getByRole('button', { name: /Activate setup/ }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('wallpaper was applied to Windows'))
    expect(JSON.parse(localStorage.getItem(WORKSPACE_KEY)).active.categoryId).toBe('study')
  })
  it('adds, edits and deletes a website shortcut while keeping automatic opening opt-in', async () => {
    const user = userEvent.setup(); const view = render(<App />)
    await user.click(screen.getByRole('button', { name: 'Explore Gaming category' }))
    await user.click(screen.getByRole('button', { name: 'Add shortcut' }))
    let dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('NAME'), 'Reference')
    await user.type(within(dialog).getByLabelText('WEBSITE ADDRESS'), 'https://example.com/')
    await user.click(within(dialog).getByRole('button', { name: 'Add shortcut' }))
    let item = JSON.parse(localStorage.getItem(WORKSPACE_KEY)).categories.find(c => c.id === 'gaming').setups[0].shortcuts.find(s => s.label === 'Reference')
    expect(item.autoOpen).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Edit Reference shortcut' })); dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('checkbox', { name: /Open when this setup is activated/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    view.unmount(); render(<App />); await user.click(screen.getByRole('button', { name: 'Explore Gaming category' }))
    expect(screen.getByText('WEBSITE · OPENS ON ACTIVATION')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Delete Reference shortcut' })); dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Delete shortcut' }))
    expect(screen.queryByRole('button', { name: 'Open Reference shortcut' })).toBeNull()
  })
  it('opens only opted-in shortcuts after wallpaper succeeds, and never reopens them on reapply', async () => {
    window.nexusDesktop = { platform: 'win32', applyWallpaper: vi.fn().mockResolvedValue({ success: true }), openShortcut: vi.fn().mockResolvedValue({ success: true }) }
    const user = userEvent.setup(); render(<App />)
    await user.click(screen.getByRole('button', { name: 'Explore Gaming category' }))
    await user.click(screen.getByRole('button', { name: 'Add shortcut' })); const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('NAME'), 'Auto')
    await user.type(within(dialog).getByLabelText('WEBSITE ADDRESS'), 'https://example.com/')
    await user.click(within(dialog).getByRole('checkbox', { name: /Open when this setup is activated/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Add shortcut' }))
    await user.click(screen.getByRole('button', { name: /Activate setup/ }))
    await waitFor(() => expect(window.nexusDesktop.openShortcut).toHaveBeenCalledTimes(1))
    expect(window.nexusDesktop.openShortcut).toHaveBeenCalledWith('website', 'https://example.com/')
    await user.click(screen.getByRole('button', { name: 'Apply wallpaper' }))
    await waitFor(() => expect(window.nexusDesktop.applyWallpaper).toHaveBeenCalledTimes(2))
    expect(window.nexusDesktop.openShortcut).toHaveBeenCalledTimes(1)
  })
  it('disables automatic opening on duplicated setups', async () => {
    const user = userEvent.setup(); render(<App />); await user.click(screen.getByRole('button', { name: 'Explore Gaming category' }))
    await user.click(screen.getByRole('button', { name: 'Edit Steam shortcut' })); let dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('checkbox', { name: /Open when this setup is activated/ })); await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    await user.click(screen.getByRole('button', { name: 'Duplicate Default setup' })); dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('SETUP NAME'), 'Copy'); await user.click(within(dialog).getByRole('button', { name: 'Create copy' }))
    const setups = JSON.parse(localStorage.getItem(WORKSPACE_KEY)).categories.find(c => c.id === 'gaming').setups
    expect(setups[0].shortcuts[0].autoOpen).toBe(true); expect(setups[1].shortcuts[0].autoOpen).toBe(false)
  })
  it('does not launch automatic shortcuts if applying the wallpaper fails', async () => {
    window.nexusDesktop = { platform: 'win32', applyWallpaper: vi.fn().mockResolvedValue({ error: 'Not available' }), openShortcut: vi.fn() }
    const user = userEvent.setup(); render(<App />); await user.click(screen.getByRole('button', { name: 'Explore Gaming category' }))
    await user.click(screen.getByRole('button', { name: 'Edit Steam shortcut' })); const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('checkbox', { name: /Open when this setup is activated/ })); await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    await user.click(screen.getByRole('button', { name: /Activate setup/ }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/Wallpaper was not applied/))
    expect(window.nexusDesktop.openShortcut).not.toHaveBeenCalled()
  })
  it('traps keyboard focus in a dialog and restores it after Escape', async () => {
    const user = userEvent.setup(); render(<App />)
    const trigger = screen.getByRole('button', { name: 'Add category' }); await user.click(trigger)
    const dialog = screen.getByRole('dialog'); await user.tab({ shift: true })
    expect(dialog.contains(document.activeElement)).toBe(true)
    await user.keyboard('{Escape}')
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })
  it('activates Linux setups without applying the system wallpaper and opens only opted-in shortcuts', async () => {
    window.nexusDesktop = { platform: 'linux', applyWallpaper: vi.fn(), openShortcut: vi.fn().mockResolvedValue({ success: true }) }
    const user = userEvent.setup(); const view = render(<App />)
    expect(screen.getByText(/wallpaper is preview-only/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Explore Gaming category' }))
    await user.click(screen.getByRole('button', { name: 'Edit Steam shortcut' })); const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('checkbox', { name: /Open when this setup is activated/ })); await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    await user.click(screen.getByRole('button', { name: /Activate setup/ }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('system wallpaper was not changed'))
    expect(window.nexusDesktop.applyWallpaper).not.toHaveBeenCalled(); expect(window.nexusDesktop.openShortcut).toHaveBeenCalledTimes(1)
    expect(JSON.parse(localStorage.getItem(WORKSPACE_KEY)).active.categoryId).toBe('gaming')
    view.unmount(); render(<App />); expect(screen.getByRole('button', { name: 'Active in NEXUS' }).disabled).toBe(true)
  })
  it('lets Linux users save their preview image for manual wallpaper selection', async () => {
    window.nexusDesktop = { platform: 'linux', exportWallpaper: vi.fn().mockResolvedValue({ success: true }) }
    const user = userEvent.setup(); render(<App />)
    await user.click(screen.getByRole('button', { name: 'Save image' }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('ChromeOS wallpaper settings'))
    expect(window.nexusDesktop.exportWallpaper).toHaveBeenCalledWith('builtin:dusk.png')
  })
  it('reports Linux shortcut failures without falsely claiming wallpaper changed', async () => {
    window.nexusDesktop = { platform: 'linux', openShortcut: vi.fn().mockResolvedValue({ error: 'Not found' }) }
    const user = userEvent.setup(); render(<App />); await user.click(screen.getByRole('button', { name: 'Explore Gaming category' }))
    await user.click(screen.getByRole('button', { name: 'Edit Steam shortcut' })); const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('checkbox', { name: /Open when this setup is activated/ })); await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    await user.click(screen.getByRole('button', { name: /Activate setup/ }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Some shortcuts failed'))
    expect(screen.getByRole('status').textContent).toContain('system wallpaper was not changed')
    expect(JSON.parse(localStorage.getItem(WORKSPACE_KEY)).active.categoryId).toBe('gaming')
  })
  it('asks before a scheduled suggestion can change a Windows setup', async () => {
    window.nexusDesktop = { platform: 'win32', applyWallpaper: vi.fn().mockResolvedValue({ success: true }) }
    const user = userEvent.setup(); render(<App />); await user.click(screen.getByRole('button', { name: 'Explore Gaming category' }))
    const date = new Date(); const current = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    const card = screen.getByRole('region', { name: 'Setup suggestions' }); await user.clear(within(card).getByLabelText('TIME')); await user.type(within(card).getByLabelText('TIME'), current)
    await user.click(within(card).getByRole('button', { name: 'Add suggestion' }))
    const prompt = await screen.findByRole('region', { name: 'Suggested setup change' })
    expect(window.nexusDesktop.applyWallpaper).not.toHaveBeenCalled(); expect(localStorage.getItem(WORKSPACE_KEY)).toBeNull()
    await user.click(within(prompt).getByRole('button', { name: 'Switch setup' }))
    await waitFor(() => expect(window.nexusDesktop.applyWallpaper).toHaveBeenCalledWith('builtin:gaming.png'))
    await waitFor(() => expect(JSON.parse(localStorage.getItem(WORKSPACE_KEY)).active.categoryId).toBe('gaming'))
  })
  it('dismisses a suggestion without changing the setup or calling Windows', async () => {
    window.nexusDesktop = { platform: 'win32', applyWallpaper: vi.fn().mockResolvedValue({ success: true }) }
    const user = userEvent.setup(); render(<App />); await user.click(screen.getByRole('button', { name: 'Explore Gaming category' }))
    const date = new Date(), current = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    const card = screen.getByRole('region', { name: 'Setup suggestions' }); await user.clear(within(card).getByLabelText('TIME')); await user.type(within(card).getByLabelText('TIME'), current)
    await user.click(within(card).getByRole('button', { name: 'Add suggestion' }))
    const prompt = await screen.findByRole('region', { name: 'Suggested setup change' }); await user.click(within(prompt).getByRole('button', { name: 'Not now' }))
    expect(screen.queryByRole('region', { name: 'Suggested setup change' })).toBeNull(); expect(window.nexusDesktop.applyWallpaper).not.toHaveBeenCalled(); expect(localStorage.getItem(WORKSPACE_KEY)).toBeNull()
  })
  it('keeps a profile local and imports shared sites with auto-open disabled', async () => {
    const user = userEvent.setup(); render(<App />); await user.click(screen.getByRole('button', { name: 'Settings' }))
    await user.type(screen.getByLabelText('DISPLAY NAME'), 'M'); await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('status').textContent).toContain('Local profile saved')
    await user.click(screen.getByRole('button', { name: 'Open Gaming category' }))
    await user.click(screen.getByRole('button', { name: 'Share setup' })); let dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('checkbox', { name: /Include my local profile name/ }).checked).toBe(false)
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    const data = { format: 'nexus-setup', version: 1, setup: { name: 'Shared', icon: 'star', color: '#aabbcc', wallpaper: 'builtin:work.png', websites: [{ label: 'Example', url: 'https://example.com/' }] } }
    const file = new File([JSON.stringify(data)], 'setup.json', { type: 'application/json' })
    const input = document.querySelector('input[accept=".json,application/json"]'); await user.upload(input, file)
    dialog = await screen.findByRole('dialog'); expect(dialog.textContent).toContain('Import this setup?')
    await user.click(within(dialog).getByRole('button', { name: 'Import setup' }))
    const item = JSON.parse(localStorage.getItem(WORKSPACE_KEY)).categories.find(c => c.id === 'gaming').setups.find(s => s.name === 'Shared')
    expect(item.shortcuts[0].autoOpen).toBe(false); expect(item.shortcuts[0].target).toBe('https://example.com/')
  })
  it('uses Windows media buttons without pretending a media command changes setup', async () => {
    window.nexusDesktop = { platform: 'win32', sendMediaKey: vi.fn().mockResolvedValue({ success: true }) }
    const user = userEvent.setup(); render(<App />); await user.click(screen.getByRole('button', { name: 'Play or pause' }))
    expect(window.nexusDesktop.sendMediaKey).toHaveBeenCalledWith('playPause'); expect(localStorage.getItem(WORKSPACE_KEY)).toBeNull()
  })
  it('handles notch actions against the current active workspace and persists the notch setting', async () => {
    let handler
    window.nexusDesktop = { platform: 'win32', setNotchEnabled: vi.fn().mockResolvedValue({ success: true }), updateNotch: vi.fn(), onNotchAction: vi.fn(callback => { handler = callback; return () => {} }), applyWallpaper: vi.fn().mockResolvedValue({ success: true }), openShortcut: vi.fn().mockResolvedValue({ success: true }) }
    const user = userEvent.setup(); render(<App />)
    await waitFor(() => expect(window.nexusDesktop.setNotchEnabled).toHaveBeenCalledWith(true))
    const snapshot = window.nexusDesktop.updateNotch.mock.lastCall[0]
    expect(snapshot.categories).toHaveLength(5); expect(JSON.stringify(snapshot)).not.toContain('target')
    await act(async () => handler({ type: 'shortcut', categoryId: 'gaming', setupId: 'default-gaming', shortcutId: 'starter-gaming' }))
    expect(window.nexusDesktop.openShortcut).not.toHaveBeenCalled()
    await act(async () => handler({ type: 'activate', categoryId: 'gaming', setupId: 'default-gaming' }))
    await waitFor(() => expect(JSON.parse(localStorage.getItem(WORKSPACE_KEY)).active.categoryId).toBe('gaming'))
    expect(window.nexusDesktop.applyWallpaper).toHaveBeenCalledWith('builtin:gaming.png')
    await act(async () => handler({ type: 'shortcut', categoryId: 'gaming', setupId: 'default-gaming', shortcutId: 'starter-gaming' }))
    await waitFor(() => expect(window.nexusDesktop.openShortcut).toHaveBeenCalledWith('website', 'https://store.steampowered.com/'))
    await user.click(screen.getByRole('button', { name: 'Settings' })); await user.click(screen.getByRole('switch', { name: 'Floating notch' }))
    expect(localStorage.getItem('nexus.notch.enabled.v1')).toBe('false'); expect(window.nexusDesktop.setNotchEnabled).toHaveBeenCalledWith(false)
  })
  it('does not switch for a suggestion until the notch confirms the current rule', async () => {
    const now = new Date(), time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    localStorage.setItem(AUTOMATION_KEY, JSON.stringify([{ id: 'rule', categoryId: 'gaming', setupId: 'default-gaming', enabled: true, type: 'schedule', time }]))
    let handler
    window.nexusDesktop = { platform: 'win32', updateNotch: vi.fn(), onNotchAction: vi.fn(callback => { handler = callback; return () => {} }), applyWallpaper: vi.fn().mockResolvedValue({ success: true }) }
    render(<App />)
    await waitFor(() => expect(window.nexusDesktop.updateNotch.mock.calls.some(([state]) => state.suggestion?.id === 'rule')).toBe(true))
    expect(window.nexusDesktop.applyWallpaper).not.toHaveBeenCalled()
    await act(async () => handler({ type: 'accept-suggestion', ruleId: 'old' }))
    expect(window.nexusDesktop.applyWallpaper).not.toHaveBeenCalled()
    await act(async () => handler({ type: 'accept-suggestion', ruleId: 'rule' }))
    await waitFor(() => expect(window.nexusDesktop.applyWallpaper).toHaveBeenCalledWith('builtin:gaming.png'))
  })
  it('does not allow a stale notch suggestion to activate a setup', async () => {
    let handler
    window.nexusDesktop = { platform: 'win32', onNotchAction: vi.fn(callback => { handler = callback; return () => {} }), applyWallpaper: vi.fn() }
    render(<App />); await act(async () => handler({ type: 'accept-suggestion', ruleId: 'not-current' }))
    expect(window.nexusDesktop.applyWallpaper).not.toHaveBeenCalled(); expect(localStorage.getItem(WORKSPACE_KEY)).toBeNull()
  })
  it('updates Windows startup only after the user changes the setting', async () => {
    window.nexusDesktop = { platform: 'win32', getStartup: vi.fn().mockResolvedValue({ available: true, enabled: false }), setStartup: vi.fn().mockResolvedValue({ success: true, enabled: true }) }
    const user = userEvent.setup(); render(<App />); await user.click(screen.getByRole('button', { name: 'Settings' }))
    const toggle = screen.getByRole('switch', { name: 'Start with Windows' }); await waitFor(() => expect(toggle.disabled).toBe(false))
    expect(window.nexusDesktop.setStartup).not.toHaveBeenCalled(); await user.click(toggle)
    await waitFor(() => expect(toggle.getAttribute('aria-checked')).toBe('true')); expect(window.nexusDesktop.setStartup).toHaveBeenCalledWith(true)
  })
  it('persists the reduced-motion setting', async () => {
    const user = userEvent.setup(); const view = render(<App />); await user.click(screen.getByRole('button', { name: 'Settings' }))
    const toggle = screen.getByRole('switch', { name: 'Reduce motion' }); await user.click(toggle); expect(toggle.getAttribute('aria-checked')).toBe('true')
    view.unmount(); render(<App />); await user.click(screen.getByRole('button', { name: 'Settings' })); expect(screen.getByRole('switch', { name: 'Reduce motion' }).getAttribute('aria-checked')).toBe('true')
  })
})
