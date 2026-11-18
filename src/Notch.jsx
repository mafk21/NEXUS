import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, ChevronDown, ExternalLink, LayoutGrid, Power, Sparkles, SkipBack, Play, SkipForward, Music2, X } from 'lucide-react'
import { categories as presets } from './scenes.js'
import './notch.css'

export default function Notch({ bridge = window.nexusNotch }) {
  const [expanded, setExpanded] = useState(false)
  const [state, setState] = useState(null)
  const [categoryId, setCategoryId] = useState('')
  const [setupId, setSetupId] = useState('')
  const barRef = useRef(null)
  useEffect(() => bridge?.onState(setState), [bridge])
  useEffect(() => {
    if (!state) return
    const category = state.categories.find(c => c.id === categoryId) || state.categories.find(c => c.id === state.active?.categoryId) || state.categories[0]
    if (!category) { setCategoryId(''); setSetupId(''); return }
    const setup = category.setups.find(s => s.id === setupId) || (category.id === state.active?.categoryId && category.setups.find(s => s.id === state.active.setupId)) || category.setups[0]
    setCategoryId(category.id); setSetupId(setup?.id || '')
  }, [state, categoryId, setupId])
  useEffect(() => {
    if (!expanded) return
    const onKey = event => { if (event.key === 'Escape') { setExpanded(false); bridge?.setExpanded(false); barRef.current?.focus() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded, bridge])
  function toggle() { const next = !expanded; setExpanded(next); bridge?.setExpanded(next); if (!next) barRef.current?.focus() }
  function send(type, fields = {}) { bridge?.action({ type, ...fields }) }
  const category = state?.categories.find(c => c.id === categoryId)
  const activeCategory = state?.categories.find(c => c.id === state.active?.categoryId)
  const activeSetup = activeCategory?.setups.find(s => s.id === state.active?.setupId)
  const isActive = categoryId === state?.active?.categoryId && setupId === state?.active?.setupId
  const image = presets.find(p => p.image === activeCategory?.image)?.image
  const accent = /^#[0-9a-f]{6}$/i.test(activeSetup?.color || '') ? activeSetup.color : '#c5aaff'
  return <main className={`notch-shell ${expanded ? 'notch-open' : ''} ${state?.reducedMotion ? 'notch-reduce-motion' : ''}`} style={{ '--notch-accent': accent }} aria-label="NEXUS floating notch">
    <button ref={barRef} className="notch-bar" onClick={toggle} aria-expanded={expanded} aria-controls="notch-panel" aria-label={expanded ? 'Collapse NEXUS notch' : 'Expand NEXUS notch'}>
      <span className="notch-mark"><Sparkles size={15}/></span><span className="notch-word">NEXUS<span>.</span></span><span className="notch-divider"/><span className="notch-current">{state?.suggestion ? 'A suggestion for you' : activeCategory ? activeCategory.name : 'Your space, close by'}</span><span className={`notch-indicator ${state?.suggestion ? 'has-suggestion' : ''}`} aria-hidden="true"/><span className="notch-chevron"><ChevronDown size={14}/></span>
    </button>
    {expanded && <div id="notch-panel" className="notch-panel">
      <div className="notch-head"><div><div className="notch-eyebrow"><span className="notch-live-dot"/> YOUR SPACE, CLOSE BY</div><h1>Your moment<span>.</span></h1><p>Everything you need, right here.</p></div><button className="notch-icon-button" title="Open NEXUS" aria-label="Open NEXUS" onClick={() => bridge?.openApp()}><ArrowUpRight size={17}/></button></div>
      <div className="notch-scroll">
        {state?.suggestion && <section className="notch-suggestion" aria-label="Suggested setup change"><div className="notch-eyebrow"><Sparkles size={12}/> A LITTLE SUGGESTION</div><strong>{state.suggestion.reason}</strong><p>Switch to {state.suggestion.categoryName} / {state.suggestion.setupName}? Opted-in shortcuts may open.</p><div><button onClick={() => send('dismiss-suggestion', { ruleId: state.suggestion.id })}>Not now</button><button className="notch-primary" disabled={state.busy} onClick={() => send('accept-suggestion', { ruleId: state.suggestion.id })}>Switch setup</button></div></section>}
        <div className="notch-active-card" style={image ? { '--notch-image': `url("${import.meta.env.BASE_URL}wallpapers/${image}")` } : undefined}>
          <div className="notch-active-copy"><span className="notch-active-label"><span/> {activeSetup ? 'ACTIVE SPACE' : 'YOUR SPACE'}</span><strong>{activeCategory?.name || 'Make space for you'}</strong><small>{activeSetup?.name || 'Choose a setup below'}</small></div><span className="notch-active-symbol" aria-hidden="true"><Sparkles size={19}/></span>
        </div>
        <section className="notch-section"><div className="notch-section-label"><LayoutGrid size={13}/> SWITCH YOUR SETUP <span>MAKE IT YOURS</span></div>
          <div className="notch-selects"><label><span>CATEGORY</span><select value={categoryId} onChange={e => { setCategoryId(e.target.value); setSetupId('') }} disabled={!state?.categories.length || state.busy}>{!state?.categories.length && <option value="">No categories</option>}{state?.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label><span>SETUP</span><select value={setupId} onChange={e => setSetupId(e.target.value)} disabled={!category?.setups.length || state?.busy}>{!category?.setups.length && <option value="">No setups</option>}{category?.setups.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label></div>
          <button className="notch-apply" disabled={!setupId || !state || state.busy || isActive} onClick={() => send('activate', { categoryId, setupId })}>{isActive ? 'Currently active' : state?.busy ? 'Just a moment…' : 'Activate setup'} <ArrowUpRight size={14}/></button><p className="notch-hint">Activation may open shortcuts you opted in to.</p>
        </section>
        <section className="notch-section"><div className="notch-section-label"><Sparkles size={13}/> ACTIVE SHORTCUTS <span>{activeSetup ? `${activeCategory.name} / ${activeSetup.name}` : 'NO ACTIVE SETUP'}</span></div>
          {state?.shortcuts?.length ? <div className="notch-shortcuts">{state.shortcuts.map(item => <button key={item.id} disabled={state.busy} onClick={() => send('shortcut', { categoryId: state.active.categoryId, setupId: state.active.setupId, shortcutId: item.id })}><span className="notch-shortcut-icon" aria-hidden="true"><ExternalLink size={13}/></span><span className="notch-shortcut-copy">{item.label}<small>{item.type}</small></span><ArrowUpRight size={14}/></button>)}</div> : <p className="notch-empty">{state ? 'No shortcuts in this setup yet.' : 'Connecting to your space…'}</p>}
        </section>
        <section className="notch-section notch-media-section"><div><div className="notch-section-label"><Music2 size={13}/> MEDIA KEYS</div><p className="notch-hint">For compatible players</p></div><div className="notch-media"><button disabled={state?.busy} onClick={() => send('media', { command: 'previous' })} aria-label="Previous track"><SkipBack size={15}/></button><button disabled={state?.busy} onClick={() => send('media', { command: 'playPause' })} aria-label="Play or pause"><Play size={15}/></button><button disabled={state?.busy} onClick={() => send('media', { command: 'next' })} aria-label="Next track"><SkipForward size={15}/></button></div></section>
        {state?.notice && <p className="notch-notice" role="status">{state.notice}</p>}
      </div>
      <div className="notch-footer"><button onClick={() => bridge?.openApp()}>Open NEXUS <ArrowUpRight size={13}/></button><button onClick={() => bridge?.quit()}><Power size={13}/> Quit NEXUS</button><button aria-label="Collapse NEXUS notch" onClick={toggle}><X size={14}/></button></div>
    </div>}
  </main>
}
