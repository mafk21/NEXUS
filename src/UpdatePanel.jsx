import { useState } from 'react'
import { ArrowUpRight, Download, RefreshCw } from 'lucide-react'

export default function UpdatePanel({ desktop }) {
  const [result, setResult] = useState(null)
  const [checking, setChecking] = useState(false)
  const [opening, setOpening] = useState(false)
  const [openError, setOpenError] = useState('')
  const supported = desktop?.platform === 'win32' && typeof desktop?.checkUpdates === 'function' && typeof desktop?.openUpdateRelease === 'function'
  async function check() {
    if (!supported || checking) return
    setChecking(true); setResult(null); setOpenError('')
    try { setResult(await desktop.checkUpdates()) }
    catch { setResult({ status: 'error', message: 'Could not check for updates. Please try again.' }) }
    finally { setChecking(false) }
  }
  async function openRelease() {
    if (opening || result?.status !== 'available') return
    setOpening(true); setOpenError('')
    try { const response = await desktop.openUpdateRelease(); if (!response?.success) setOpenError(response?.error || 'Could not open the release page.') }
    catch { setOpenError('Could not open the release page.') }
    finally { setOpening(false) }
  }
  return <section className="update-card" aria-labelledby="updates-title">
    <div className="update-intro"><span className="update-icon"><Download size={19}/></span><div><div className="eyebrow subtle">A LITTLE SOMETHING NEW</div><h3 id="updates-title">Keep NEXUS up to date.</h3><p>Check for official Windows releases when you want. Nothing downloads or installs automatically.</p></div></div>
    <div className="update-actions"><button className="outline-button" onClick={check} disabled={!supported || checking || opening}><RefreshCw size={14}/> {checking ? 'Checking…' : 'Check for updates'}</button>{result?.status === 'available' && <button className="primary-button update-get" onClick={openRelease} disabled={opening}>{opening ? 'Opening…' : 'Get update'} <ArrowUpRight size={14}/></button>}</div>
    <div className="update-status" role="status" aria-live="polite">
      {!supported && 'Update checks are available in the packaged Windows app.'}
      {checking && 'Checking GitHub for published releases…'}
      {!checking && result?.status === 'available' && <>Version {result.version} is available (installed: {result.current}). “Get update” opens the official release page. Download the Windows installer there, close NEXUS, then run it yourself. Installers may be unsigned; review Windows’ warning before deciding whether to run one.</>}
      {!checking && result?.status === 'up-to-date' && <>You’re up to date with the published release channel. Installed version: {result.current}.</>}
      {!checking && ['no-releases', 'no-installer', 'unsupported', 'error'].includes(result?.status) && result.message}
      {openError && <span className="update-error">{openError}</span>}
    </div>
  </section>
}
