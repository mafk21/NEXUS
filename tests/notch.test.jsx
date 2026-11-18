// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Notch from '../src/Notch.jsx'

afterEach(() => cleanup())
const data = {
  categories: [
    { id: 'work', name: 'Work', setups: [{ id: 'default-work', name: 'Default' }] },
    { id: 'gaming', name: 'Gaming', setups: [{ id: 'default-gaming', name: 'Default' }, { id: 'own', name: 'Mine' }] }
  ],
  active: { categoryId: 'work', setupId: 'default-work' },
  shortcuts: [{ id: 'calendar', label: 'Calendar', type: 'website' }],
  busy: false, notice: '', suggestion: null
}
function fakeBridge(initial = data) {
  return { onState: vi.fn(callback => { callback(initial); return vi.fn() }), setExpanded: vi.fn(), action: vi.fn(), openApp: vi.fn(), quit: vi.fn() }
}
describe('floating notch', () => {
  it('opens and closes, changes setup only when explicitly activated, and opens active shortcuts', async () => {
    const bridge = fakeBridge(), user = userEvent.setup(); render(<Notch bridge={bridge}/>)
    expect(screen.getByRole('button', { name: 'Expand NEXUS notch' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Expand NEXUS notch' }))
    expect(bridge.setExpanded).toHaveBeenCalledWith(true)
    await user.selectOptions(screen.getByLabelText('CATEGORY'), 'gaming')
    await user.selectOptions(screen.getByLabelText('SETUP'), 'own')
    expect(bridge.action).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Activate setup' }))
    expect(bridge.action).toHaveBeenCalledWith({ type: 'activate', categoryId: 'gaming', setupId: 'own' })
    await user.click(screen.getByRole('button', { name: 'Play or pause' }))
    expect(bridge.action).toHaveBeenCalledWith({ type: 'media', command: 'playPause' })
    await user.click(screen.getByRole('button', { name: /Calendar/ }))
    expect(bridge.action).toHaveBeenCalledWith({ type: 'shortcut', categoryId: 'work', setupId: 'default-work', shortcutId: 'calendar' })
    await user.click(screen.getAllByRole('button', { name: 'Open NEXUS' })[0])
    expect(bridge.openApp).toHaveBeenCalledOnce()
    await user.click(screen.getAllByRole('button', { name: 'Collapse NEXUS notch' })[0]); expect(bridge.setExpanded).toHaveBeenLastCalledWith(false)
  })
  it('only accepts or dismisses a suggestion after an explicit click', async () => {
    const suggestion = { id: 'rule-1', reason: 'It’s 09:30.', categoryName: 'Gaming', setupName: 'Default' }
    const bridge = fakeBridge({ ...data, suggestion }), user = userEvent.setup(); render(<Notch bridge={bridge}/>)
    expect(screen.getByText('A suggestion for you')).toBeTruthy(); expect(bridge.action).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Expand NEXUS notch' }))
    const prompt = screen.getByRole('region', { name: 'Suggested setup change' }); expect(prompt.textContent).toContain('Opted-in shortcuts may open')
    expect(bridge.action).not.toHaveBeenCalled()
    await user.click(within(prompt).getByRole('button', { name: 'Not now' })); expect(bridge.action).toHaveBeenCalledWith({ type: 'dismiss-suggestion', ruleId: 'rule-1' })
    await user.click(within(prompt).getByRole('button', { name: 'Switch setup' })); expect(bridge.action).toHaveBeenCalledWith({ type: 'accept-suggestion', ruleId: 'rule-1' })
  })
})
