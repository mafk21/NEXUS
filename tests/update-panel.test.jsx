// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UpdatePanel from '../src/UpdatePanel.jsx'
afterEach(() => cleanup())
function bridge(overrides = {}) { return { platform: 'win32', checkUpdates: vi.fn().mockResolvedValue({ status: 'available', current: '1.0.0-rc.1', version: '1.0.0' }), downloadUpdate: vi.fn().mockResolvedValue({ success: true }), installUpdate: vi.fn().mockResolvedValue({ success: true }), openUpdateRelease: vi.fn().mockResolvedValue({ success: true }), ...overrides } }
describe('update settings', () => {
  it('requires separate user actions to check, download and confirm installation', async () => {
    const desktop = bridge(), user = userEvent.setup(); render(<UpdatePanel desktop={desktop}/>)
    expect(desktop.checkUpdates).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Check for updates' }))
    expect(screen.getByRole('status').textContent).toContain('Version 1.0.0 is available'); expect(desktop.downloadUpdate).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Download update' })); expect(desktop.downloadUpdate).toHaveBeenCalledOnce(); expect(desktop.installUpdate).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Install update' })); const dialog = screen.getByRole('dialog')
    expect(dialog.textContent).toContain('unsigned'); expect(desktop.installUpdate).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' })); expect(desktop.installUpdate).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Install update' })); await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Install & close NEXUS' }))
    expect(desktop.installUpdate).toHaveBeenCalledOnce()
  })
  it('reports no releases and errors without claiming the user is up to date', async () => {
    const desktop = bridge({ checkUpdates: vi.fn().mockResolvedValueOnce({ status: 'no-releases', message: 'No releases yet.' }).mockRejectedValueOnce(Error()) })
    const user = userEvent.setup(); render(<UpdatePanel desktop={desktop}/>)
    await user.click(screen.getByRole('button', { name: 'Check for updates' })); expect(screen.getByRole('status').textContent).toContain('No releases yet.')
    await user.click(screen.getByRole('button', { name: 'Check for updates' })); await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Could not check'))
    expect(screen.queryByRole('button', { name: 'Download update' })).toBeNull()
  })
  it('disables checking in a browser or on Linux', () => {
    render(<UpdatePanel desktop={{ platform: 'linux' }}/>)
    expect(screen.getByRole('button', { name: 'Check for updates' }).disabled).toBe(true)
    expect(screen.getByRole('status').textContent).toContain('packaged Windows app')
  })
})
