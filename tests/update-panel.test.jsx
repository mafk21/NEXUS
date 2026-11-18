// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UpdatePanel from '../src/UpdatePanel.jsx'
afterEach(() => cleanup())
describe('update settings', () => {
  it('only checks on click and only opens the release after the user chooses Get update', async () => {
    const desktop = { platform: 'win32', checkUpdates: vi.fn().mockResolvedValue({ status: 'available', current: '1.0.0-rc.1', version: '1.0.0' }), openUpdateRelease: vi.fn().mockResolvedValue({ success: true }) }
    const user = userEvent.setup(); render(<UpdatePanel desktop={desktop}/>)
    expect(desktop.checkUpdates).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Check for updates' }))
    expect(screen.getByRole('status').textContent).toContain('Version 1.0.0 is available')
    expect(screen.getByRole('status').textContent).toContain('unsigned')
    expect(desktop.openUpdateRelease).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Get update' })); expect(desktop.openUpdateRelease).toHaveBeenCalledOnce()
  })
  it('reports no releases and errors without claiming the user is up to date', async () => {
    const desktop = { platform: 'win32', checkUpdates: vi.fn().mockResolvedValueOnce({ status: 'no-releases', message: 'No releases yet.' }).mockRejectedValueOnce(Error()), openUpdateRelease: vi.fn() }
    const user = userEvent.setup(); render(<UpdatePanel desktop={desktop}/>)
    await user.click(screen.getByRole('button', { name: 'Check for updates' })); expect(screen.getByRole('status').textContent).toContain('No releases yet.')
    await user.click(screen.getByRole('button', { name: 'Check for updates' })); await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Could not check'))
    expect(screen.queryByRole('button', { name: 'Get update' })).toBeNull()
  })
  it('disables checking in a browser or on Linux', () => {
    render(<UpdatePanel desktop={{ platform: 'linux' }}/>)
    expect(screen.getByRole('button', { name: 'Check for updates' }).disabled).toBe(true)
    expect(screen.getByRole('status').textContent).toContain('packaged Windows app')
  })
})
