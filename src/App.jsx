import { useEffect, useRef, useState } from 'react'
import { ArrowDownRight, ArrowRight, BookOpen, BriefcaseBusiness, Check, ChevronRight, CircleHelp, Coffee, Copy, Gamepad2, Heart, Link, Folder, File, AppWindow, ExternalLink, LayoutGrid, Moon, Music, Palette, Pencil, Plus, Settings2, Sparkles, Star, Trash2, WandSparkles, X } from 'lucide-react'
import { readReducedMotion, saveReducedMotion } from './scenes.js'
import { validShortcut, validWebUrl } from './shortcuts.js'
import useDialogKeyboard from './useDialogKeyboard.js'
import Moments from './Moments.jsx'
import Automation from './Automation.jsx'
import ShareDialog, { ImportDialog } from './ShareDialog.jsx'
import { readProfile, saveProfile, parseShare } from './sharing.js'
import { ICONS, COLORS, BROWSER_IMAGE_LIMIT, activateSetup, addCategory, addSetup, cleanName, createId, deleteCategory, deleteSetup, editCategory, editSetup, isWallpaperReference, loadWorkspace, saveWorkspace, setSetupWallpaper, setSetupShortcuts, shortcutsFor, wallpaperFor } from './workspace.js'

const icons = { gamepad: Gamepad2, book: BookOpen, briefcase: BriefcaseBusiness, moon: Moon, sparkles: Sparkles, star: Star, heart: Heart, coffee: Coffee, music: Music, palette: Palette }
const wallpaperUrl = name => `${import.meta.env.BASE_URL}wallpapers/${name}`
function localStorageOrNull() { try { return window.localStorage } catch { return null } }
function hasBrowserImageSignature(dataUrl) {
  try {
    const bytes = atob(dataUrl.split(',')[1].slice(0, 16))
    return dataUrl.startsWith('data:image/png;') ? bytes.slice(0, 8) === '\x89PNG\r\n\x1a\n' : dataUrl.startsWith('data:image/jpeg;') && bytes.charCodeAt(0) === 255 && bytes.charCodeAt(1) === 216 && bytes.charCodeAt(2) === 255
  } catch { return false }
}
function Icon({ name, size = 17 }) { const Component = icons[name] || Sparkles; return <Component size={size} strokeWidth={1.7} aria-hidden="true" /> }

function Editor({ dialog, onCancel, onSubmit }) {
  const editing = dialog.mode === 'edit-category' || dialog.mode === 'edit-setup'
  const categoryForm = dialog.mode.endsWith('category')
  const duplicating = dialog.mode === 'duplicate-setup'
  const initial = dialog.item || {}
  const [name, setName] = useState(editing ? initial.name : '')
  const [icon, setIcon] = useState(initial.icon || 'sparkles')
  const [color, setColor] = useState(initial.color || COLORS[0])
  const [error, setError] = useState('')
  const title = categoryForm ? (editing ? 'Edit category' : 'New category') : (editing ? 'Edit setup' : duplicating ? 'Duplicate setup' : 'New setup')
  const modalRef = useDialogKeyboard(onCancel)
  function submit(event) {
    event.preventDefault()
    if (!cleanName(name)) { setError('Please enter a name.'); return }
    onSubmit({ name: cleanName(name), icon, color })
  }
  return <div className="modal-backdrop"><section ref={modalRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="editor-title">
    <div className="modal-header"><div><div className="eyebrow subtle">MAKE IT YOURS</div><h2 id="editor-title">{title}</h2></div><button className="icon-button" onClick={onCancel} aria-label="Close"><X size={18}/></button></div>
    <p className="modal-subtitle">{categoryForm ? 'A little space for the things you do.' : duplicating ? 'Give your copy its own name. Wallpaper and shortcuts are copied, but automatic opening is switched off.' : 'Give this setup a look that feels like you.'}</p>
    <form onSubmit={submit}>
      <label className="field-label" htmlFor="editor-name">{categoryForm ? 'CATEGORY NAME' : 'SETUP NAME'}</label>
      <input id="editor-name" className="text-input" value={name} onChange={event => { setName(event.target.value); setError('') }} placeholder={categoryForm ? 'Name your category' : 'Name your setup'} maxLength={60} autoFocus />
      {error && <p className="field-error" role="alert">{error}</p>}
      <fieldset className="choice-field"><legend>CHOOSE AN ICON</legend><div className="icon-choices">{ICONS.map(value => <button type="button" key={value} className={`icon-choice ${icon === value ? 'chosen' : ''}`} onClick={() => setIcon(value)} aria-label={`${value} icon`} aria-pressed={icon === value}><Icon name={value} size={18}/></button>)}</div></fieldset>
      {!categoryForm && <fieldset className="choice-field"><legend>ACCENT COLOR</legend><div className="color-choices">{COLORS.map(value => <button type="button" key={value} className={`color-choice ${color === value ? 'chosen' : ''}`} onClick={() => setColor(value)} aria-label={`Color ${value}`} aria-pressed={color === value} style={{ '--swatch': value }}>{color === value && <Check size={13}/>}</button>)}<label className="custom-color" title="Choose a custom color">CUSTOM<input type="color" value={color} onChange={event => setColor(event.target.value)} aria-label="Custom accent color" /></label></div></fieldset>}
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={onCancel}>Cancel</button><button type="submit" className="primary-button">{editing ? 'Save changes' : duplicating ? 'Create copy' : categoryForm ? 'Create category' : 'Create setup'} <ArrowRight size={16}/></button></div>
    </form>
  </section></div>
}
function ShortcutEditor({ dialog, desktop, onCancel, onSubmit }) {
  const editing = dialog.mode === 'edit-shortcut'
  const original = dialog.item || {}
  const [type, setType] = useState(original.type || 'website')
  const [label, setLabel] = useState(original.label || '')
  const [target, setTarget] = useState(original.target || '')
  const [autoOpen, setAutoOpen] = useState(original.autoOpen || false)
  const [error, setError] = useState('')
  const [picking, setPicking] = useState(false)
  const modalRef = useDialogKeyboard(onCancel)
  function changeType(value) { setType(value); setTarget(''); setError('') }
  async function pick() {
    if (!desktop?.chooseShortcut) return
    setPicking(true); setError('')
    try { const result = await desktop.chooseShortcut(type); if (result.error) setError(result.error); else if (!result.canceled) setTarget(result.target) }
    catch { setError('Could not choose a target. Please try again.') }
    finally { setPicking(false) }
  }
  function submit(event) {
    event.preventDefault()
    const item = { id: original.id || createId(), label: label.trim(), type, target: target.trim(), autoOpen }
    if (!validShortcut(item)) { setError(!label.trim() ? 'Please enter a name.' : type === 'website' && !validWebUrl(target.trim()) ? 'Enter a valid http or https address.' : 'Choose a valid target in the desktop app.'); return }
    onSubmit(item)
  }
  return <div className="modal-backdrop"><section ref={modalRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="shortcut-title">
    <div className="modal-header"><div><div className="eyebrow subtle">READY WHEN YOU ARE</div><h2 id="shortcut-title">{editing ? 'Edit shortcut' : 'New shortcut'}</h2></div><button className="icon-button" onClick={onCancel} aria-label="Close"><X size={18}/></button></div>
    <p className="modal-subtitle">Keep the places and things you use close to your setup.</p>
    <form onSubmit={submit}>
      <fieldset className="choice-field shortcut-types"><legend>SHORTCUT TYPE</legend><div>{['website','app','file','folder'].map(value => <button type="button" key={value} className={`type-button ${type === value ? 'chosen' : ''}`} onClick={() => changeType(value)} aria-pressed={type === value}>{value}</button>)}</div></fieldset>
      <label className="field-label" htmlFor="shortcut-label">NAME</label><input className="text-input" id="shortcut-label" value={label} onChange={event => setLabel(event.target.value)} maxLength={60} placeholder="Name this shortcut" autoFocus/>
      {type === 'website' ? <><label className="field-label target-label" htmlFor="shortcut-url">WEBSITE ADDRESS</label><input className="text-input" id="shortcut-url" value={target} onChange={event => setTarget(event.target.value)} placeholder="https://example.com" maxLength={2048}/></> : <div className="target-select"><span>{target ? 'Target selected' : desktop?.platform === 'linux' && type === 'app' ? 'Choose a trusted Linux executable or .desktop launcher; it can run commands' : desktop ? 'Choose an item from your device' : 'Available in the desktop app'}</span><button className="outline-button" type="button" disabled={!desktop?.chooseShortcut || picking} onClick={pick}>{picking ? 'Choosing…' : target ? 'Change' : 'Choose'}</button></div>}
      <label className="auto-check"><input type="checkbox" checked={autoOpen} onChange={event => setAutoOpen(event.target.checked)}/><span><strong>Open when this setup is activated</strong><small>Optional. NEXUS will only open this shortcut when you enable this.</small></span></label>
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="modal-actions"><button className="secondary-button" type="button" onClick={onCancel}>Cancel</button><button className="primary-button" type="submit">{editing ? 'Save changes' : 'Add shortcut'} <ArrowRight size={16}/></button></div>
    </form>
  </section></div>
}
function ConfirmDelete({ dialog, onCancel, onConfirm }) {
  const modalRef = useDialogKeyboard(onCancel)
  const category = dialog.mode === 'delete-category'
  const shortcut = dialog.mode === 'delete-shortcut'
  const type = category ? 'category' : shortcut ? 'shortcut' : 'setup'
  return <div className="modal-backdrop"><section ref={modalRef} className="modal confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-title">
    <div className="modal-header"><span className="delete-icon"><Trash2 size={19}/></span><button className="icon-button" onClick={onCancel} aria-label="Close"><X size={18}/></button></div>
    <h2 id="delete-title">Delete {type}?</h2>
    <p className="modal-subtitle">{category ? <>“{dialog.item.name}” and all {dialog.item.setups.length} {dialog.item.setups.length === 1 ? 'setup' : 'setups'} inside it will be deleted.</> : <>“{shortcut ? dialog.item.label : dialog.item.name}” will be deleted.</>} This can’t be undone.{dialog.isActive && ' The active setup will be cleared so you can choose another.'}</p>
    <div className="modal-actions"><button className="secondary-button" onClick={onCancel} autoFocus>Cancel</button><button className="danger-button" onClick={onConfirm}>Delete {type}</button></div>
  </section></div>
}

export default function App() {
  const [initial] = useState(() => loadWorkspace(localStorageOrNull()))
  const [workspace, setWorkspace] = useState(initial.workspace)
  const workspaceRef = useRef(initial.workspace)
  const fileInput = useRef(null)
  const importInput = useRef(null)
  const [profile, setProfile] = useState(() => readProfile(localStorageOrNull()))
  const [profileDraft, setProfileDraft] = useState(profile)
  const [shareOpen, setShareOpen] = useState(false)
  const [pendingImport, setPendingImport] = useState(null)
  const [suggestion, setSuggestion] = useState(null)
  const suggestionRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const quickActionBusy = useRef(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewError, setPreviewError] = useState('')
  const [startup, setStartup] = useState({ available: false, reason: 'Available in the installed Windows app.' })
  const [startupBusy, setStartupBusy] = useState(false)
  const [notchEnabled, setNotchEnabled] = useState(() => { try { return window.nexusDesktop?.platform === 'win32' && localStorageOrNull()?.getItem('nexus.notch.enabled.v1') !== 'false' } catch { return false } })
  const [notchBusy, setNotchBusy] = useState(false)
  const notchHandler = useRef(() => {})
  const [selectedId, setSelectedId] = useState(() => initial.workspace.active?.categoryId || initial.workspace.categories[0]?.id || null)
  const [selectedSetupId, setSelectedSetupId] = useState(() => initial.workspace.active?.setupId || initial.workspace.categories[0]?.setups[0]?.id || null)
  const [page, setPage] = useState('home')
  const [reducedMotion, setReducedMotion] = useState(() => readReducedMotion(localStorageOrNull()))
  const [notice, setNotice] = useState(initial.warning)
  const [dialog, setDialog] = useState(null)
  const dialogTrigger = useRef(null)
  function openDialog(next) { dialogTrigger.current = document.activeElement; setDialog(next) }
  function closeDialog() { setDialog(null); requestAnimationFrame(() => { if (dialogTrigger.current?.isConnected) dialogTrigger.current.focus() }) }
  const selected = workspace.categories.find(category => category.id === selectedId)
  const selectedSetup = selected?.setups.find(setup => setup.id === selectedSetupId)
  const active = workspace.active
  const isActive = selected?.id === active?.categoryId && selectedSetup?.id === active?.setupId
  const count = workspace.categories.length
  const wallpaper = selected && selectedSetup ? wallpaperFor(selected, selectedSetup) : null
  const desktop = window.nexusDesktop
  const appliesWallpaper = desktop?.platform === 'win32'
  const setupShortcuts = selected && selectedSetup ? shortcutsFor(selected, selectedSetup) : []
  useEffect(() => {
    if (!desktop?.onNotchAction) return
    return desktop.onNotchAction(action => notchHandler.current(action))
  }, [desktop])
  useEffect(() => {
    if (desktop?.platform !== 'win32' || !desktop?.setNotchEnabled) return
    let live = true
    desktop.setNotchEnabled(notchEnabled).then(result => {
      if (live && result?.error) setNotice(`Floating notch: ${result.error}`)
    }).catch(() => { if (live) setNotice('Could not update the floating notch.') })
    return () => { live = false }
  }, [desktop, notchEnabled])
  useEffect(() => {
    if (!desktop?.updateNotch || desktop.platform !== 'win32') return
    const category = workspace.categories.find(c => c.id === workspace.active?.categoryId)
    const item = category?.setups.find(s => s.id === workspace.active?.setupId)
    const suggestedCategory = workspace.categories.find(c => c.id === suggestion?.categoryId)
    const suggestedSetup = suggestedCategory?.setups.find(s => s.id === suggestion?.setupId)
    desktop.updateNotch({
      categories: workspace.categories.map(c => ({ id: c.id, name: c.name, setups: c.setups.map(s => ({ id: s.id, name: s.name })) })),
      active: workspace.active,
      shortcuts: category && item ? shortcutsFor(category, item).map(s => ({ id: s.id, label: s.label, type: s.type })) : [],
      busy, notice,
      suggestion: suggestion && suggestedCategory && suggestedSetup ? { id: suggestion.id, categoryName: suggestedCategory.name, setupName: suggestedSetup.name, reason: suggestion.type === 'schedule' ? `It’s ${suggestion.time}.` : `${suggestion.process} opened.` } : null
    })
  }, [desktop, workspace, suggestion, busy, notice])
  useEffect(() => {
    let mounted = true
    if (desktop?.getStartup) desktop.getStartup().then(result => { if (mounted) setStartup(result) }).catch(() => { if (mounted) setStartup({ available: false, reason: 'Could not read startup setting.' }) })
    return () => { mounted = false }
  }, [desktop])
  useEffect(() => {
    let current = true
    setPreviewError('')
    if (!wallpaper) { setPreviewUrl(''); return () => { current = false } }
    if (wallpaper.startsWith('builtin:')) setPreviewUrl(wallpaperUrl(wallpaper.slice(8)))
    else if (wallpaper.startsWith('data:image/')) setPreviewUrl(wallpaper)
    else if (desktop) {
      setPreviewUrl('')
      desktop.previewWallpaper(wallpaper).then(result => {
        if (!current) return
        if (result.error) setPreviewError(result.error)
        else setPreviewUrl(result.dataUrl)
      }).catch(() => { if (current) setPreviewError('Could not load this wallpaper preview.') })
    } else { setPreviewUrl(''); setPreviewError('This wallpaper is only available in the desktop app.') }
    return () => { current = false }
  }, [wallpaper, desktop])
  function commit(next, success) {
    if (next === workspaceRef.current) return
    workspaceRef.current = next
    setWorkspace(next)
    const saved = !initial.readOnly && saveWorkspace(localStorageOrNull(), next)
    setNotice(saved ? success : `${success} Changes are only in this session; saved data could not be updated.`)
  }
  function selectCategory(id) {
    const category = workspace.categories.find(c => c.id === id)
    if (!category) return
    setSelectedId(id); setSelectedSetupId(active?.categoryId === id ? active.setupId : category.setups[0]?.id || null); setPage('category'); setNotice('')
  }
  async function activate(targetCategory = selected, targetSetup = selectedSetup) {
    if (!targetCategory || !targetSetup || busy || quickActionBusy.current) return
    const categoryId = targetCategory.id, setupId = targetSetup.id, name = targetSetup.name, reference = wallpaperFor(targetCategory, targetSetup)
    const automatic = workspaceRef.current.active?.categoryId === categoryId && workspaceRef.current.active?.setupId === setupId ? [] : shortcutsFor(targetCategory, targetSetup).filter(item => item.autoOpen)
    if (!desktop) {
      commit(activateSetup(workspaceRef.current, categoryId, setupId), `${name} selected in this browser preview. Your Windows wallpaper was not changed.`)
      return
    }
    quickActionBusy.current = true
    setBusy(true)
    try {
      if (appliesWallpaper) {
        const result = await desktop.applyWallpaper(reference)
        if (result.error || !result.success) { setNotice(`Wallpaper was not applied: ${result.error || 'Unknown error.'}`); return }
      }
      const latestCategory = workspaceRef.current.categories.find(c => c.id === categoryId)
      const latestSetup = latestCategory?.setups.find(s => s.id === setupId)
      if (!latestSetup || wallpaperFor(latestCategory, latestSetup) !== reference) { setNotice(appliesWallpaper ? 'Windows wallpaper was applied, but this setup changed while applying. Please choose a setup again.' : 'This setup changed while activating. Please choose a setup again.'); return }
      const failed = []
      for (const item of automatic) {
        const currentCategory = workspaceRef.current.categories.find(c => c.id === categoryId)
        const currentSetup = currentCategory?.setups.find(s => s.id === setupId)
        const currentItem = currentSetup && shortcutsFor(currentCategory, currentSetup).find(s => s.id === item.id)
        if (!currentItem || !currentItem.autoOpen || currentItem.target !== item.target || currentItem.type !== item.type) continue
        try { const opened = await desktop.openShortcut(item.type, item.target); if (!opened.success) failed.push(`${item.label}: ${opened.error || 'could not open'}`) }
        catch { failed.push(`${item.label}: could not open`) }
      }
      const finalCategory = workspaceRef.current.categories.find(c => c.id === categoryId)
      const finalSetup = finalCategory?.setups.find(s => s.id === setupId)
      if (!finalSetup || wallpaperFor(finalCategory, finalSetup) !== reference) { setNotice(appliesWallpaper ? 'Windows wallpaper was applied, but this setup changed while activating. Please choose a setup again.' : 'This setup changed while activating. Please choose a setup again.'); return }
      const message = appliesWallpaper ? `${name} is active and its wallpaper was applied to Windows.` : `${name} is active in NEXUS. The system wallpaper was not changed.`
      commit(activateSetup(workspaceRef.current, categoryId, setupId), failed.length ? `${message} Some shortcuts failed: ${failed.join('; ')}` : message)
    } catch { setNotice(appliesWallpaper ? 'Wallpaper was not applied. The desktop service could not be reached.' : 'Could not activate this setup. The desktop service could not be reached.') }
    finally { quickActionBusy.current = false; setBusy(false) }
  }
  function assignWallpaper(categoryId, setupId, reference) {
    const current = workspaceRef.current
    const next = setSetupWallpaper(current, categoryId, setupId, reference)
    if (next === current) { setNotice('This setup no longer exists or the image could not be used.'); return }
    commit(next, desktop?.platform === 'linux' ? 'Wallpaper saved for preview. Change your system wallpaper in ChromeOS settings.' : 'Wallpaper saved to this setup. Activate the setup to apply it.')
  }
  async function chooseWallpaper() {
    if (!selected || !selectedSetup || busy) return
    if (!desktop) { fileInput.current?.click(); return }
    const categoryId = selected.id, setupId = selectedSetup.id
    setBusy(true)
    try {
      const result = await desktop.chooseWallpaper()
      if (result.error) setNotice(`Could not import wallpaper: ${result.error}`)
      else if (!result.canceled) assignWallpaper(categoryId, setupId, result.reference)
    } catch { setNotice('Could not import the wallpaper. The desktop service could not be reached.') }
    finally { setBusy(false) }
  }
  async function exportWallpaper() {
    if (!wallpaper || !desktop?.exportWallpaper || busy) return
    setBusy(true)
    try {
      const result = await desktop.exportWallpaper(wallpaper)
      if (result.error) setNotice(`Could not save wallpaper: ${result.error}`)
      else if (result.success) setNotice('Image saved. Choose it in ChromeOS wallpaper settings to set your desktop wallpaper.')
    } catch { setNotice('Could not save wallpaper. The desktop service could not be reached.') }
    finally { setBusy(false) }
  }
  function chooseBrowserFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !selected || !selectedSetup) return
    if (!['image/png', 'image/jpeg'].includes(file.type) || file.size === 0 || file.size > BROWSER_IMAGE_LIMIT) { setNotice('In the browser preview, choose a PNG or JPEG under 2 MB.'); return }
    const categoryId = selected.id, setupId = selectedSetup.id
    const reader = new FileReader()
    reader.onload = () => {
      if (!isWallpaperReference(reader.result) || !hasBrowserImageSignature(reader.result)) { setNotice('Could not read that image. Please choose a valid PNG or JPEG.'); return }
      assignWallpaper(categoryId, setupId, reader.result)
    }
    reader.onerror = () => setNotice('Could not read that image. Please choose another file.')
    reader.readAsDataURL(file)
  }
  async function openShortcut(item) {
    if (!desktop?.openShortcut) { setNotice('Shortcuts can be opened from the installed desktop app, not this browser preview.'); return }
    if (busy || quickActionBusy.current) return
    quickActionBusy.current = true
    setBusy(true)
    try { const result = await desktop.openShortcut(item.type, item.target); setNotice(result.success ? `Opened ${item.label}.` : `Could not open ${item.label}: ${result.error || 'Unknown error.'}`) }
    catch { setNotice(`Could not open ${item.label}.`) }
    finally { quickActionBusy.current = false; setBusy(false) }
  }
  async function toggleStartup() {
    if (!startup.available || startupBusy || !desktop?.setStartup) return
    setStartupBusy(true)
    try {
      const result = await desktop.setStartup(!startup.enabled)
      if (result.success) { setStartup({ available: true, enabled: result.enabled }); setNotice(result.enabled ? 'NEXUS will start with Windows.' : 'NEXUS will not start with Windows.') }
      else { if (typeof result.enabled === 'boolean') setStartup({ available: true, enabled: result.enabled }); setNotice(result.error || 'Could not update startup.') }
    } catch { setNotice('Could not update the Windows startup setting.') }
    finally { setStartupBusy(false) }
  }
  function proposeSuggestion(rule) {
    const current = workspaceRef.current
    if (current.active?.categoryId === rule.categoryId && current.active?.setupId === rule.setupId) return true
    if (suggestionRef.current) return false
    suggestionRef.current = rule; setSuggestion(rule); return true
  }
  function dismissSuggestion() { suggestionRef.current = null; setSuggestion(null) }
  async function acceptSuggestion() {
    if (!suggestion || busy) return
    const category = workspaceRef.current.categories.find(c => c.id === suggestion.categoryId)
    const item = category?.setups.find(s => s.id === suggestion.setupId)
    dismissSuggestion()
    if (!category || !item) { setNotice('That suggested setup no longer exists.'); return }
    setSelectedId(category.id); setSelectedSetupId(item.id); setPage('category')
    await activate(category, item)
  }
  function updateProfile(event) {
    event.preventDefault(); const name = cleanName(profileDraft)
    if (saveProfile(localStorageOrNull(), name)) { setProfile(name); setProfileDraft(name); setNotice(name ? 'Local profile saved on this device.' : 'Local profile removed.'); }
    else setNotice('Could not save your local profile.')
  }
  function exportShare(value) {
    try {
      const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'nexus-setup.json'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000)
      setShareOpen(false); setNotice('Setup file created. Review it before sharing.')
    } catch { setNotice('Could not export this setup file.') }
  }
  function readShareFile(event) {
    const file = event.target.files?.[0]; event.target.value = ''
    if (!file || !selected) return
    if (file.size > 256000) { setNotice('This setup file is too large.'); return }
    const categoryId = selected.id, reader = new FileReader()
    reader.onload = () => { try { setPendingImport({ item: parseShare(reader.result), categoryId }) } catch (error) { setNotice(error.message) } }
    reader.onerror = () => setNotice('Could not read this setup file.')
    reader.readAsText(file)
  }
  function confirmImport() {
    if (!pendingImport) return
    const { item, categoryId } = pendingImport
    const category = workspaceRef.current.categories.find(c => c.id === categoryId)
    if (!category) { setNotice('The destination category no longer exists.'); setPendingImport(null); return }
    const id = createId(), shortcuts = item.websites.map(site => ({ id: createId(), label: site.label, type: 'website', target: site.url, autoOpen: false }))
    const next = addSetup(workspaceRef.current, categoryId, { ...item, id, shortcuts })
    if (next === workspaceRef.current) setNotice('Could not import this setup.')
    else { commit(next, 'Setup imported. Website shortcuts will not open automatically.'); setSelectedId(categoryId); setSelectedSetupId(id); setPage('category') }
    setPendingImport(null)
  }
  notchHandler.current = action => {
    if (!action || busy || quickActionBusy.current) return
    if (action.type === 'activate') {
      const category = workspaceRef.current.categories.find(c => c.id === action.categoryId)
      const item = category?.setups.find(s => s.id === action.setupId)
      if (!item) { setNotice('That setup no longer exists.'); return }
      setSelectedId(category.id); setSelectedSetupId(item.id); setPage('category')
      void activate(category, item)
    } else if (action.type === 'shortcut') {
      const current = workspaceRef.current
      if (current.active?.categoryId !== action.categoryId || current.active?.setupId !== action.setupId) { setNotice('The active setup changed. Please try again.'); return }
      const category = current.categories.find(c => c.id === action.categoryId)
      const item = category?.setups.find(s => s.id === action.setupId)
      const shortcut = item && shortcutsFor(category, item).find(s => s.id === action.shortcutId)
      if (shortcut) void openShortcut(shortcut)
      else setNotice('That shortcut no longer exists.')
    } else if (action.type === 'media' && ['previous', 'playPause', 'next'].includes(action.command)) {
      void sendNotchMedia(action.command)
    } else if ((action.type === 'accept-suggestion' || action.type === 'dismiss-suggestion') && suggestionRef.current?.id === action.ruleId) {
      if (action.type === 'accept-suggestion') void acceptSuggestion()
      else dismissSuggestion()
    }
  }
  async function sendNotchMedia(command) {
    if (!desktop?.sendMediaKey || busy || quickActionBusy.current) return
    quickActionBusy.current = true; setBusy(true)
    try { const result = await desktop.sendMediaKey(command); setNotice(result.success ? 'Media key sent to Windows. A compatible player must handle it.' : result.error || 'Could not send the media command.') }
    catch { setNotice('Could not send the media command.') }
    finally { quickActionBusy.current = false; setBusy(false) }
  }
  async function toggleNotch() {
    if (notchBusy || !desktop?.setNotchEnabled) return
    const next = !notchEnabled
    setNotchBusy(true)
    try {
      const result = await desktop.setNotchEnabled(next)
      if (!result?.success) { setNotice(result?.error || 'Could not update the floating notch.'); return }
      setNotchEnabled(next)
      try { localStorageOrNull()?.setItem('nexus.notch.enabled.v1', String(next)) } catch { setNotice('Notch preference could not be saved for next time.') }
    } catch { setNotice('Could not update the floating notch.') }
    finally { setNotchBusy(false) }
  }
  function toggleMotion() { const next = !reducedMotion; setReducedMotion(next); if (!saveReducedMotion(localStorageOrNull(), next)) setNotice('This preference could not be saved on this device.') }
  function submitEditor(values) {
    if (dialog.mode === 'new-category') {
      const id = createId(); commit(addCategory(workspace, { ...values, id }), 'Category created.')
      setSelectedId(id); setSelectedSetupId(`default-${id}`); setPage('category')
    } else if (dialog.mode === 'edit-category') commit(editCategory(workspace, selected.id, values), 'Category updated.')
    else if (dialog.mode === 'new-setup' || dialog.mode === 'duplicate-setup') {
      const id = createId(); commit(addSetup(workspace, selected.id, { ...values, id, wallpaper: dialog.mode === 'duplicate-setup' ? wallpaperFor(selected, dialog.item) : undefined, shortcuts: dialog.mode === 'duplicate-setup' ? shortcutsFor(selected, dialog.item).map(item => ({ ...item, autoOpen: false })) : [] }), dialog.mode === 'duplicate-setup' ? 'Setup duplicated.' : 'Setup created.')
      setSelectedSetupId(id)
    } else if (dialog.mode === 'edit-setup') commit(editSetup(workspace, selected.id, dialog.item.id, values), 'Setup updated.')
    closeDialog()
  }
  function submitShortcut(item) {
    const category = workspaceRef.current.categories.find(c => c.id === dialog.categoryId)
    const setup = category?.setups.find(s => s.id === dialog.setupId)
    if (!setup) { setNotice('This setup no longer exists.'); closeDialog(); return }
    const current = shortcutsFor(category, setup)
    const next = dialog.mode === 'edit-shortcut' ? current.map(value => value.id === item.id ? item : value) : [...current, item]
    const changed = setSetupShortcuts(workspaceRef.current, category.id, setup.id, next)
    if (changed === workspaceRef.current) setNotice('Could not save this shortcut. A setup can have up to 100 shortcuts.')
    else commit(changed, dialog.mode === 'edit-shortcut' ? 'Shortcut updated.' : 'Shortcut added.')
    closeDialog()
  }
  function confirmDelete() {
    if (dialog.mode === 'delete-category') {
      const next = deleteCategory(workspace, dialog.item.id); commit(next, 'Category deleted.')
      const nextCategory = next.categories[0]; setSelectedId(nextCategory?.id || null); setSelectedSetupId(nextCategory?.setups[0]?.id || null); setPage(nextCategory ? 'category' : 'home')
    } else if (dialog.mode === 'delete-shortcut') {
      const category = workspaceRef.current.categories.find(c => c.id === dialog.categoryId)
      const setup = category?.setups.find(s => s.id === dialog.setupId)
      if (setup) commit(setSetupShortcuts(workspaceRef.current, category.id, setup.id, shortcutsFor(category, setup).filter(item => item.id !== dialog.item.id)), 'Shortcut deleted.')
    } else {
      const next = deleteSetup(workspace, selected.id, dialog.item.id); commit(next, 'Setup deleted.')
      if (selectedSetupId === dialog.item.id) setSelectedSetupId(next.categories.find(c => c.id === selected.id)?.setups[0]?.id || null)
    }
    closeDialog()
  }
  return <div className={`app-shell ${reducedMotion ? 'reduce-motion' : ''}`}>
    <aside className="sidebar" aria-label="Main navigation">
      <button className="brand" onClick={() => { setPage('home'); setNotice('') }} aria-label="NEXUS home"><span className="brand-mark"><span></span><span></span><span></span></span><span className="brand-name">NEXUS<span className="brand-dot">.</span></span></button>
      <div className="sidebar-caption">YOUR WORKSPACE <span>✦</span></div>
      <nav className="navigation">
        <button className={`nav-item ${page === 'home' ? 'selected' : ''}`} onClick={() => { setPage('home'); setNotice('') }} aria-label="Overview"><LayoutGrid size={17}/><span>Overview</span><span className="nav-indicator" /></button>
        <div className="section-title">YOUR CATEGORIES <span>{String(count).padStart(2, '0')}</span></div>
        <div className="category-nav-list">{workspace.categories.map(category => <button key={category.id} className={`nav-item category-nav ${page === 'category' && selectedId === category.id ? 'selected' : ''}`} onClick={() => selectCategory(category.id)} aria-label={`Open ${category.name} category`}><Icon name={category.icon}/><span>{category.name}</span>{active?.categoryId === category.id && <span className="active-dot" title="Active setup" />}</button>)}</div>
        <button className="add-category" onClick={() => openDialog({ mode: 'new-category' })} aria-label="Add category"><Plus size={15}/> <span className="add-category-label">Add category</span></button>
      </nav>
      <div className="sidebar-bottom"><div className="sidebar-rule"/><button className={`nav-item ${page === 'settings' ? 'selected' : ''}`} onClick={() => { setPage('settings'); setNotice('') }} aria-label="Settings"><Settings2 size={17}/><span>Settings</span></button><button className={`nav-item ${page === 'about' ? 'selected' : ''}`} onClick={() => { setPage('about'); setNotice('') }} aria-label="About NEXUS"><CircleHelp size={17}/><span>About NEXUS</span></button><div className="version"><span className="version-mark"><Sparkles size={13}/></span><span><strong>Made for your moments.</strong><small>RELEASE CANDIDATE · V1.0</small></span></div></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><div className="breadcrumb"><span>NEXUS</span><ChevronRight size={13}/><strong>{page === 'home' ? 'Overview' : page === 'category' ? selected?.name : page === 'settings' ? 'Settings' : 'About'}</strong></div><div className="topbar-right"><span className="build-badge"><span/> EARLY PREVIEW</span><div className="avatar" aria-label="Your workspace"><Sparkles size={16}/></div></div></header>
      {suggestion && <div className="content suggestion-prompt-wrap">
        {suggestion && <div className="suggestion-prompt" role="region" aria-live="polite" aria-label="Suggested setup change"><div><strong>Ready for a different space?</strong><p>{suggestion.type === 'schedule' ? `It’s ${suggestion.time}.` : `${suggestion.process} opened.`} Switch to {workspace.categories.find(c => c.id === suggestion.categoryId)?.name || 'your category'} / {workspace.categories.find(c => c.id === suggestion.categoryId)?.setups.find(s => s.id === suggestion.setupId)?.name || 'your setup'}? Shortcuts you opted to open on activation may also open.</p></div><div><button className="secondary-button" onClick={dismissSuggestion}>Not now</button><button className="primary-button" onClick={acceptSuggestion} disabled={busy}>Switch setup</button></div></div>}
      </div>}
      {(page === 'home' || page === 'category') && <div className="content">
        <div className="heading-row"><div><div className="eyebrow"><span className="eyebrow-spark">✳</span> A LITTLE SPACE FOR YOU</div><h1>{page === 'home' ? <>Make space for <em>you.</em></> : <>{selected?.name}, <em>your way.</em></>}</h1><p className="intro">{page === 'home' ? 'A different mood for every moment. Find your space and make it yours.' : 'One category, a world of possibility. Make this space your own.'}</p></div>{page === 'category' && selected ? <div className="heading-actions"><button className="outline-button" onClick={() => openDialog({ mode: 'edit-category', item: selected })}><Pencil size={14}/> Edit category</button><button className="icon-button delete-category" onClick={() => openDialog({ mode: 'delete-category', item: selected, isActive: active?.categoryId === selected.id })} aria-label={`Delete ${selected.name} category`}><Trash2 size={16}/></button></div> : <div className="heading-side"><span>YOUR SPACE</span><strong>YOUR RULES <ArrowDownRight size={15}/></strong></div>}</div>

        {notice && <div className="notice" role="status"><Sparkles size={15}/>{notice}<button onClick={() => setNotice('')} aria-label="Dismiss message"><X size={15}/></button></div>}
        {selected && selectedSetup ? <section className="hero" aria-label={`${selected.name} ${selectedSetup.name} setup`} key={`${selected.id}-${selectedSetup.id}-${isActive}`} style={{ '--hero-image': previewUrl ? `url("${previewUrl}")` : 'none', '--scene-accent': selectedSetup.color }}>
          <div className="hero-top"><span className="hero-label"><span className="label-dot"/> FEATURED SETUP</span><span className="hero-index">{String(workspace.categories.findIndex(c => c.id === selected.id) + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}</span></div>
          <div className="hero-content"><div className="hero-category"><Icon name={selectedSetup.icon} size={15}/>{selected.name.toUpperCase()} <span>/</span> {selected.mood || 'YOUR KIND OF SPACE'}</div><h2>Find your<br/><em>{selected.id === 'chill' ? 'slow.' : selected.id === 'gaming' ? 'flow.' : selected.id === 'study' ? 'focus.' : selected.id === 'work' ? 'rhythm.' : 'spark.'}</em></h2><p>{selected.longDescription || 'A space to make entirely your own.'}</p><div className="hero-actions"><button className={`primary-button ${isActive ? 'is-active' : ''}`} onClick={() => activate()} disabled={busy || (isActive && !appliesWallpaper)}>{busy ? 'Applying…' : isActive ? <><Check size={16}/> {appliesWallpaper ? 'Apply wallpaper' : 'Active in NEXUS'}</> : <>Activate setup <ArrowRight size={17}/></>}</button><span className="setup-caption"><span>{selectedSetup.name}</span><small>{isActive ? 'Your current selection' : 'Ready when you are'}</small></span></div></div><div className="hero-bottom"><span>DESIGNED FOR YOUR DAY</span><span className="hero-progress"><i/><i/><i/></span><span>YOUR SPACE</span></div>
        </section> : <div className="empty-hero"><span className="empty-icon"><Sparkles size={22}/></span><h2>{selected ? 'A blank canvas, just for you.' : 'Your space starts here.'}</h2><p>{selected ? 'There are no setups in this category yet. Create one to get started.' : 'There are no categories yet. Create one and make it your own.'}</p><button className="primary-button" onClick={() => openDialog({ mode: selected ? 'new-setup' : 'new-category' })}><Plus size={16}/> {selected ? 'Create setup' : 'Create category'}</button></div>}
        {selected && selectedSetup && <section className="wallpaper-panel" aria-label="Wallpaper"><div className="wallpaper-details"><span className="wallpaper-panel-icon"><Sparkles size={17}/></span><div><strong>Make it your backdrop.</strong><p>{previewError ? previewError : 'Choose a wallpaper for this setup. It stays saved with your scene.'}</p></div></div><div className="wallpaper-actions"><button className="outline-button" onClick={chooseWallpaper} disabled={busy}>Choose wallpaper</button>{desktop?.platform === 'linux' && <button className="outline-button" onClick={exportWallpaper} disabled={busy || !desktop?.exportWallpaper}>Save image</button>}<button className="text-button" onClick={() => assignWallpaper(selected.id, selectedSetup.id, `builtin:${selected.image}`)} disabled={busy}>RESET</button></div><input ref={fileInput} type="file" accept="image/png,image/jpeg" hidden onChange={chooseBrowserFile}/></section>}
        <div className="disclaimer"><span className="disclaimer-icon"><Sparkles size={14}/></span><p><strong>A little heads-up.</strong> {!desktop ? 'This is a browser preview: it cannot change your wallpaper or open desktop shortcuts.' : appliesWallpaper ? 'Activating a setup applies its wallpaper and opens only shortcuts you choose to open automatically.' : 'On Linux and Chromebook, wallpaper is preview-only. Change your system wallpaper in ChromeOS settings. Only opted-in shortcuts open on activation.'}</p></div>
        {selected && selectedSetup && <section className="shortcuts-section" aria-label="Shortcuts"><div className="section-heading"><div><div className="eyebrow subtle">THE THINGS YOU NEED, CLOSE BY</div><h3>Your shortcuts <span>✳</span></h3></div><button className="outline-button" onClick={() => openDialog({ mode: 'new-shortcut', categoryId: selected.id, setupId: selectedSetup.id })}><Plus size={15}/> Add shortcut</button></div>
          {setupShortcuts.length === 0 ? <div className="empty-setups">No shortcuts yet. Add an app, file, folder, or website.</div> : <div className="shortcuts-list">{setupShortcuts.map(item => <div className="shortcut-row" key={item.id}><button className="shortcut-open" onClick={() => openShortcut(item)} disabled={busy} aria-label={`Open ${item.label} shortcut`}><span className="shortcut-icon">{item.type === 'website' ? <Link size={17}/> : item.type === 'app' ? <AppWindow size={17}/> : item.type === 'folder' ? <Folder size={17}/> : <File size={17}/>}</span><span className="shortcut-info"><strong>{item.label}</strong><small>{item.type.toUpperCase()}{item.autoOpen ? ' · OPENS ON ACTIVATION' : ''}</small></span><ExternalLink size={14}/></button><div className="setup-actions"><button className="icon-button" onClick={() => openDialog({ mode: 'edit-shortcut', item, categoryId: selected.id, setupId: selectedSetup.id })} aria-label={`Edit ${item.label} shortcut`}><Pencil size={15}/></button><button className="icon-button" onClick={() => openDialog({ mode: 'delete-shortcut', item, categoryId: selected.id, setupId: selectedSetup.id })} aria-label={`Delete ${item.label} shortcut`}><Trash2 size={15}/></button></div></div>)}</div>}
        </section>}
        {page === 'category' && selected && <section className="setups-section" aria-label="Setups"><div className="section-heading"><div><div className="eyebrow subtle">YOUR SPACE, YOUR RULES</div><h3>Your setups <span>✳</span></h3></div><div className="setup-toolbar"><button className="outline-button" onClick={() => importInput.current?.click()}>Import setup</button><button className="outline-button" onClick={() => setShareOpen(true)} disabled={!selectedSetup}>Share setup</button><button className="outline-button add-setup-button" onClick={() => openDialog({ mode: 'new-setup' })}><Plus size={15}/> Add setup</button></div><input ref={importInput} type="file" accept=".json,application/json" hidden onChange={readShareFile}/></div>
          {selected.setups.length === 0 ? <div className="empty-setups">No setups yet. Add one to make this category yours.</div> : <div className="setup-list">{selected.setups.map(setup => <div className={`setup-row ${setup.id === selectedSetupId ? 'setup-selected' : ''}`} key={setup.id}>
            <button className="setup-select" onClick={() => setSelectedSetupId(setup.id)} aria-label={`View ${setup.name} setup`} aria-pressed={setup.id === selectedSetupId}><span className="setup-icon" style={{ '--setup-color': setup.color }}><Icon name={setup.icon} size={18}/></span><span className="setup-info"><strong>{setup.name}</strong><small>{active?.categoryId === selected.id && active?.setupId === setup.id ? 'ACTIVE SETUP' : 'PERSONAL SETUP'}</small></span>{setup.id === selectedSetupId && <span className="viewing-tag">VIEWING</span>}</button>
            <div className="setup-actions"><button className="icon-button" onClick={() => openDialog({ mode: 'edit-setup', item: setup })} aria-label={`Edit ${setup.name} setup`} title="Edit"><Pencil size={15}/></button><button className="icon-button" onClick={() => openDialog({ mode: 'duplicate-setup', item: setup })} aria-label={`Duplicate ${setup.name} setup`} title="Duplicate"><Copy size={15}/></button><button className="icon-button" onClick={() => openDialog({ mode: 'delete-setup', item: setup, isActive: active?.categoryId === selected.id && active?.setupId === setup.id })} aria-label={`Delete ${setup.name} setup`} title="Delete"><Trash2 size={15}/></button></div>
          </div>)}</div>}
        </section>}
        <Moments activeCategory={workspace.categories.find(c => c.id === active?.categoryId)} activeSetup={workspace.categories.find(c => c.id === active?.categoryId)?.setups.find(s => s.id === active?.setupId)} desktop={desktop} onNotice={setNotice}/>
        <div className="section-heading"><div><div className="eyebrow subtle">A SPACE FOR EVERY SIDE OF YOU</div><h3>Explore your categories <span>✳</span></h3></div><span className="section-count">{String(count).padStart(2, '0')} {count === 1 ? 'CATEGORY' : 'CATEGORIES'} <ArrowRight size={14}/></span></div>
        <div className="category-grid">{workspace.categories.map((category, index) => <button className={`category-card ${selectedId === category.id ? 'card-selected' : ''}`} key={category.id} onClick={() => selectCategory(category.id)} aria-label={`Explore ${category.name} category`} aria-pressed={page === 'category' && selectedId === category.id}><div className="card-art" style={{ backgroundImage: `linear-gradient(180deg, transparent 30%, rgba(14,15,23,.75)), url("${wallpaperUrl(category.image)}")` }}><span className="card-number">{String(index + 1).padStart(2, '0')}</span>{active?.categoryId === category.id && <span className="card-active"><span/> ACTIVE</span>}<span className="card-icon"><Icon name={category.icon} size={18}/></span></div><div className="card-copy"><div className="card-title"><strong>{category.name}</strong><ArrowDownRight size={16}/></div><p>{category.description || 'Your space, your way.'}</p><span className="setup-count">{category.setups.length} {category.setups.length === 1 ? 'SETUP' : 'SETUPS'}</span></div></button>)}</div>
        <div className="lower-note"><div><span className="lower-icon"><WandSparkles size={17}/></span><div><strong>It’s all yours.</strong><p>Create a category or open one to make your own setups.</p></div></div><button className="text-button" onClick={() => openDialog({ mode: 'new-category' })}>NEW CATEGORY <ArrowRight size={14}/></button></div>
      </div>}
      {(page === 'settings' || page === 'about') && <div className="content secondary-page"><div className="eyebrow"><span className="eyebrow-spark">✳</span> {page === 'settings' ? 'MAKE IT COMFORTABLE' : 'A LITTLE INTRODUCTION'}</div><h1>{page === 'settings' ? <>A little more <em>you.</em></> : <>Meet <em>NEXUS.</em></>}</h1>{page === 'settings' ? <><p className="intro">The little details matter. Make NEXUS feel right for you.</p><section className="settings-card"><div><span className="setting-icon"><Sparkles size={19}/></span><div><h3>Reduce motion</h3><p>Keep transitions subtle throughout the app.</p></div></div><button className={`toggle ${reducedMotion ? 'on' : ''}`} role="switch" aria-checked={reducedMotion} aria-label="Reduce motion" onClick={toggleMotion}><span/></button></section><section className="settings-card"><div><span className="setting-icon"><LayoutGrid size={19}/></span><div><h3>Floating notch</h3><p>{desktop?.platform === 'win32' ? 'Quick access while NEXUS is running. Minimize the main window to keep it on screen; closing NEXUS exits both.' : 'Available in the Windows desktop app.'}</p></div></div><button className={`toggle ${notchEnabled ? 'on' : ''}`} role="switch" aria-checked={notchEnabled} aria-label="Floating notch" disabled={desktop?.platform !== 'win32' || !desktop?.setNotchEnabled || notchBusy} onClick={toggleNotch}><span/></button></section><section className="settings-card startup-card"><div><span className="setting-icon"><AppWindow size={19}/></span><div><h3>Start with Windows</h3><p>{startup.available ? 'Open NEXUS when you sign in.' : startup.reason}</p></div></div><button className={`toggle ${startup.enabled ? 'on' : ''}`} role="switch" aria-checked={!!startup.enabled} aria-label="Start with Windows" disabled={!startup.available || startupBusy} onClick={toggleStartup}><span/></button></section><section className="profile-card"><div className="eyebrow subtle">JUST FOR THIS DEVICE</div><h3>Your local profile</h3><p>Optional. No account or sign-in. Your name stays here unless you choose to include it in a shared setup.</p><form onSubmit={updateProfile}><label htmlFor="profile-name">DISPLAY NAME</label><div><input id="profile-name" className="text-input" value={profileDraft} maxLength={60} onChange={e => setProfileDraft(e.target.value)} placeholder="Add a name, if you like"/><button className="outline-button" type="submit">Save</button></div></form></section><p className="settings-hint">More personalization will arrive as NEXUS grows.</p>{notice && <div className="notice" role="status">{notice}</div>}</> : <><p className="intro">Your space. Your mode. Your way.</p><section className="about-card"><span className="about-symbol">✳</span><div className="eyebrow subtle">BUILT FOR THE MOMENTS IN BETWEEN</div><h2>A little space for <em>everything you do.</em></h2><p>NEXUS brings your different worlds together in one considered space. Create categories and setups that feel like you.</p><div className="about-meta"><span>VERSION 1.0 RC</span><span>WINDOWS FIRST</span><span>MADE FOR YOU</span></div></section></>}</div>}
      <div className="content suggestions-wrap" hidden={page !== 'home' && page !== 'category'}><Automation selected={selected} setup={selectedSetup} workspace={workspace} desktop={desktop} onSuggestion={proposeSuggestion}/><footer><span>YOUR SPACE. YOUR MODE. YOUR WAY.</span><span>MADE WITH INTENTION <span>✳</span></span></footer></div>
    </main>
    {shareOpen && selected && selectedSetup && <ShareDialog category={selected} setup={selectedSetup} shortcuts={setupShortcuts} profile={profile} onCancel={() => setShareOpen(false)} onExport={exportShare}/>}
    {pendingImport && workspace.categories.find(c => c.id === pendingImport.categoryId) && <ImportDialog item={pendingImport.item} category={workspace.categories.find(c => c.id === pendingImport.categoryId)} onCancel={() => setPendingImport(null)} onImport={confirmImport}/>}
    {dialog && (dialog.mode.startsWith('delete-') ? <ConfirmDelete dialog={dialog} onCancel={closeDialog} onConfirm={confirmDelete}/> : dialog.mode.endsWith('-shortcut') ? <ShortcutEditor key={`${dialog.mode}-${dialog.item?.id || 'new'}`} dialog={dialog} desktop={desktop} onCancel={closeDialog} onSubmit={submitShortcut}/> : <Editor key={`${dialog.mode}-${dialog.item?.id || 'new'}`} dialog={dialog} onCancel={closeDialog} onSubmit={submitEditor}/>)}
  </div>
}
