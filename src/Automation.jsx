import { useEffect, useRef, useState } from 'react'
import { BellRing, Plus, Trash2 } from 'lucide-react'
import { createId } from './workspace.js'
import { isValidRule, matchingSuggestions, readRules, saveRules } from './automation.js'

function storage() { try { return window.localStorage } catch { return null } }
export default function Automation({ selected, setup, workspace, desktop, onSuggestion }) {
  const [loaded] = useState(() => readRules(storage()))
  const [rules, setRules] = useState(loaded.rules)
  const [type, setType] = useState('schedule'), [time, setTime] = useState('09:00'), [process, setProcess] = useState('')
  const [error, setError] = useState(loaded.readOnly ? 'Saved suggestions could not be read; changes are disabled to protect your data.' : '')
  const callbacks = useRef({ workspace, onSuggestion }); callbacks.current = { workspace, onSuggestion }
  const state = useRef({ seen: new Set(), day: '', previous: null, polling: false, lastPoll: 0 })
  function update(next) {
    if (loaded.readOnly || !saveRules(storage(), next)) { setError('Could not save suggestions on this device.'); return false }
    setRules(next); setError(''); return true
  }
  function add(event) {
    event.preventDefault(); if (!selected || !setup) return
    const rule = { id: createId(), categoryId: selected.id, setupId: setup.id, enabled: true, type, ...(type === 'schedule' ? { time } : { process: process.trim() }) }
    if (!isValidRule(rule)) { setError(type === 'app' ? 'Enter an executable name such as app.exe, not a path.' : 'Choose a valid time.'); return }
    if (rules.length >= 50) { setError('You can have up to 50 suggestions.'); return }
    if (update([...rules, rule])) setProcess('')
  }
  useEffect(() => {
    let live = true
    async function tick() {
      const now = new Date(), tracker = state.current, day = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`
      if (tracker.day !== day) { tracker.day = day; tracker.seen.clear() }
      const valid = rules.filter(r => r.enabled && callbacks.current.workspace.categories.find(c => c.id === r.categoryId)?.setups.some(s => s.id === r.setupId))
      const due = matchingSuggestions(valid.filter(r => r.type === 'schedule'), now, [], [], tracker.seen)
      for (const rule of due) if (callbacks.current.onSuggestion(rule)) { tracker.seen.add(`${rule.id}:${day}`); break }
      if (!valid.some(r => r.type === 'app')) { tracker.previous = null; return }
      if (desktop?.platform !== 'win32' || !desktop?.listRunningApps || tracker.polling || Date.now() - tracker.lastPoll < 15000) return
      tracker.polling = true; tracker.lastPoll = Date.now()
      try {
        const result = await desktop.listRunningApps(); if (!live) return
        if (!Array.isArray(result.names)) { setError(result.error || 'Could not read running app names.'); return }
        if (tracker.previous !== null) {
          const matches = matchingSuggestions(valid.filter(r => r.type === 'app'), now, result.names, tracker.previous, tracker.seen)
          for (const rule of matches) if (callbacks.current.onSuggestion(rule)) break
        }
        tracker.previous = result.names
      } catch { /* Detection failure never activates a setup. */ }
      finally { tracker.polling = false }
    }
    void tick(); const timer = setInterval(tick, 5000)
    return () => { live = false; clearInterval(timer) }
  }, [rules, desktop])
  return <section className="suggestion-card" aria-label="Setup suggestions">
    <div className="suggestion-heading"><span className="suggestion-icon"><BellRing size={17}/></span><div><div className="eyebrow subtle">YOUR DAY, YOUR DECISION</div><h3>Thoughtful suggestions.</h3><p>NEXUS can suggest a setup. It will always ask before switching.</p></div></div>
    {selected && setup ? <form className="suggestion-form" onSubmit={add}>
      <label><span>WHEN</span><select value={type} onChange={e => setType(e.target.value)}><option value="schedule">Every day at a time</option><option value="app" disabled={desktop?.platform !== 'win32' || !desktop?.listRunningApps}>When a Windows app opens</option></select></label>
      {type === 'schedule' ? <label><span>TIME</span><input type="time" value={time} onChange={e => setTime(e.target.value)}/></label> : <label><span>APP PROCESS</span><input value={process} maxLength={83} onChange={e => setProcess(e.target.value)} placeholder="example.exe"/></label>}
      <button className="outline-button" type="submit" disabled={loaded.readOnly}><Plus size={14}/> Add suggestion</button>
      <small>For {selected.name} / {setup.name}. Suggestions work while NEXUS is open{type === 'app' ? '; detection begins after an initial scan' : ''}.</small>
    </form> : <p className="suggestion-empty">Select a setup to add a suggestion.</p>}
    {error && <p role="alert" className="field-error">{error}</p>}
    {rules.length > 0 && <div className="suggestion-list">{rules.map(rule => { const category = workspace.categories.find(c => c.id === rule.categoryId), item = category?.setups.find(s => s.id === rule.setupId); return <div key={rule.id} className="suggestion-row"><div><strong>{rule.type === 'schedule' ? `Every day at ${rule.time}` : `When ${rule.process} opens`}</strong><small>{category && item ? `${category.name} / ${item.name}` : 'Setup no longer exists'}</small></div><button className="icon-button" aria-label={`Remove suggestion ${rule.type === 'schedule' ? rule.time : rule.process}`} onClick={() => update(rules.filter(r => r.id !== rule.id))} disabled={loaded.readOnly}><Trash2 size={15}/></button></div> })}</div>}
  </section>
}
