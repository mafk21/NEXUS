import { useEffect, useState } from 'react'
import { ArrowUpRight, Clock3, Sparkles, SkipBack, Play, SkipForward, Music2 } from 'lucide-react'

export default function Moments({ activeCategory, activeSetup, desktop, onNotice }) {
  const [sending, setSending] = useState(false)
  async function send(command) {
    if (!desktop?.sendMediaKey || sending) return
    setSending(true)
    try { const result = await desktop.sendMediaKey(command); if (!result.success) onNotice(result.error || 'Could not send media command.') }
    catch { onNotice('Could not send media command.') }
    finally { setSending(false) }
  }
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 10000); return () => clearInterval(timer) }, [])
  return <section className="moments" aria-label="Your moment">
    <div className="moment-clock"><div className="moment-label"><Clock3 size={13}/> YOUR TIME <span>✳</span></div><strong>{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong><small>{now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</small></div>
    <div className="moment-active"><div className="moment-label"><Sparkles size={13}/> YOUR CURRENT SPACE <ArrowUpRight size={13}/></div><strong>{activeCategory?.name || 'No setup active'}</strong><small>{activeSetup?.name || 'Choose a setup when you’re ready'}</small><span className="moment-orb" aria-hidden="true"/></div>
    <div className="moment-media"><div className="moment-label"><Music2 size={13}/> A LITTLE SOUND <span>✳</span></div><strong>In the moment.</strong><small>{desktop?.platform === 'win32' && desktop?.sendMediaKey ? 'Control a player that supports Windows media keys.' : 'System media controls are available on Windows.'}</small><div className="media-actions"><button aria-label="Previous track" onClick={() => send('previous')} disabled={sending || desktop?.platform !== 'win32' || !desktop?.sendMediaKey}><SkipBack size={15}/></button><button aria-label="Play or pause" onClick={() => send('playPause')} disabled={sending || desktop?.platform !== 'win32' || !desktop?.sendMediaKey}><Play size={16}/></button><button aria-label="Next track" onClick={() => send('next')} disabled={sending || desktop?.platform !== 'win32' || !desktop?.sendMediaKey}><SkipForward size={15}/></button></div></div>
  </section>
}
