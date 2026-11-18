import { useEffect, useState } from 'react'
import { ArrowUpRight, Download, RefreshCw } from 'lucide-react'
import useDialogKeyboard from './useDialogKeyboard.js'

function InstallConfirm({ version, busy, onCancel, onConfirm }) {
  const ref = useDialogKeyboard(onCancel)
  return <div className="modal-backdrop"><section ref={ref} className="modal" role="dialog" aria-modal="true" aria-labelledby="update-confirm-title">
    <div className="eyebrow subtle">YOUR CHOICE</div><h2 id="update-confirm-title">Install NEXUS {version}?</h2>
    <p className="modal-subtitle">NEXUS will close and launch the installer. The download was checked against GitHub’s release checksum, but the installer is unsigned; this does not verify the publisher. Back up important data and review any Windows warning before proceeding.</p>
    <div className="modal-actions"><button className="secondary-button" onClick={onCancel} disabled={busy} autoFocus>Cancel</button><button className="primary-button" onClick={onConfirm} disabled={busy}>{busy ? 'Opening…' : 'Install & close NEXUS'}</button></div>
  </section></div>
}
export default function UpdatePanel({ desktop }) {
  const [result, setResult] = useState(null), [phase, setPhase] = useState('idle')
  const [progress, setProgress] = useState(null), [error, setError] = useState(''), [confirm, setConfirm] = useState(false)
  const supported = desktop?.platform === 'win32' && ['checkUpdates', 'downloadUpdate', 'installUpdate', 'openUpdateRelease'].every(key => typeof desktop?.[key] === 'function')
  useEffect(() => desktop?.onUpdateProgress?.(value => { if (Number.isFinite(value?.received) && Number.isFinite(value?.total) && value.total > 0) setProgress(Math.min(100, Math.max(0, Math.floor(value.received / value.total * 100)))) }), [desktop])
  async function check() {
    if (!supported || phase !== 'idle') return
    setPhase('checking'); setResult(null); setError(''); setProgress(null)
    try { setResult(await desktop.checkUpdates()) }
    catch { setResult({ status: 'error', message: 'Could not check for updates. Please try again.' }) }
    finally { setPhase('idle') }
  }
  async function download() {
    if (phase !== 'idle' || result?.status !== 'available') return
    setPhase('downloading'); setError(''); setProgress(0)
    try { const response = await desktop.downloadUpdate(); if (response?.success) setResult({ ...result, status: 'ready' }); else setError(response?.error || 'Could not download the update.') }
    catch { setError('Could not download the update.') }
    finally { setPhase('idle') }
  }
  async function install() {
    if (phase !== 'idle' || result?.status !== 'ready') return
    setPhase('installing'); setError('')
    try { const response = await desktop.installUpdate(); if (!response?.success) { setConfirm(false); setError(response?.error || 'Could not open the installer.'); setResult({ ...result, status: 'available' }) } }
    catch { setConfirm(false); setError('Could not open the installer. NEXUS remains open.'); setResult({ ...result, status: 'available' }) }
    finally { setPhase('idle') }
  }
  async function openRelease() {
    if (phase !== 'idle' || !['available', 'ready'].includes(result?.status)) return
    setPhase('opening'); setError('')
    try { const response = await desktop.openUpdateRelease(); if (!response?.success) setError(response?.error || 'Could not open the release page.') }
    catch { setError('Could not open the release page.') }
    finally { setPhase('idle') }
  }
  return <section className="update-card" aria-labelledby="updates-title">
    <div className="update-intro"><span className="update-icon"><Download size={19}/></span><div><div className="eyebrow subtle">A LITTLE SOMETHING NEW</div><h3 id="updates-title">Keep NEXUS up to date.</h3><p>Check and download official Windows updates when you choose. Installation always asks first.</p></div></div>
    <div className="update-actions"><button className="outline-button" onClick={check} disabled={!supported || phase !== 'idle'}><RefreshCw size={14}/> {phase === 'checking' ? 'Checking…' : 'Check for updates'}</button>{result?.status === 'available' && <button className="primary-button update-get" onClick={download} disabled={phase !== 'idle'}>{phase === 'downloading' ? 'Downloading…' : 'Download update'} <Download size={14}/></button>}{result?.status === 'ready' && <button className="primary-button update-get" onClick={() => setConfirm(true)} disabled={phase !== 'idle'}>Install update <ArrowUpRight size={14}/></button>}{['available', 'ready'].includes(result?.status) && <button className="outline-button" onClick={openRelease} disabled={phase !== 'idle'}>View release <ArrowUpRight size={14}/></button>}</div>
    <div className="update-status" role="status" aria-live="polite">
      {!supported && 'Update checks are available in the packaged Windows app.'}
      {phase === 'checking' && 'Checking GitHub for published releases…'}
      {phase === 'downloading' && `Downloading update${progress === null ? '…' : `: ${progress}%`}`}
      {phase !== 'checking' && phase !== 'downloading' && result?.status === 'available' && <>Version {result.version} is available (installed: {result.current}). Download it here, then choose whether to install. Installers may be unsigned.</>}
      {phase !== 'checking' && phase !== 'downloading' && result?.status === 'ready' && <>Version {result.version} is downloaded and its checksum matches GitHub. It has not been installed.</>}
      {phase !== 'checking' && result?.status === 'up-to-date' && <>You’re up to date with the published release channel. Installed version: {result.current}.</>}
      {phase !== 'checking' && ['no-releases', 'no-installer', 'unsupported', 'error'].includes(result?.status) && result.message}
      {error && <span className="update-error">{error}</span>}
    </div>
    {confirm && <InstallConfirm version={result.version} busy={phase === 'installing'} onCancel={() => { if (phase !== 'installing') setConfirm(false) }} onConfirm={install}/>}
  </section>
}
