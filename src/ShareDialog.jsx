import { useState } from 'react'
import { X } from 'lucide-react'
import { createShare } from './sharing.js'
import useDialogKeyboard from './useDialogKeyboard.js'
export default function ShareDialog({ category, setup, shortcuts, profile, onCancel, onExport }) {
  const [includeProfile, setIncludeProfile] = useState(false)
  const modalRef = useDialogKeyboard(onCancel)
  return <div className="modal-backdrop"><section ref={modalRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="share-title">
    <div className="modal-header"><div><div className="eyebrow subtle">A LITTLE SOMETHING TO SHARE</div><h2 id="share-title">Share this setup.</h2></div><button className="icon-button" onClick={onCancel} aria-label="Close"><X size={18}/></button></div>
    <p className="modal-subtitle">Export a file you can share yourself. It includes the setup name, icon, color, a built-in wallpaper and website shortcuts. Imported wallpaper images and local app, file and folder paths stay on this device. Website addresses can be private—review them before sharing. Automatic opening is always off in the imported copy.</p>
    {profile && <label className="auto-check"><input type="checkbox" checked={includeProfile} onChange={e => setIncludeProfile(e.target.checked)}/><span><strong>Include my local profile name</strong><small>{profile}</small></span></label>}
    <div className="modal-actions"><button className="secondary-button" onClick={onCancel} autoFocus>Cancel</button><button className="primary-button" onClick={() => onExport(createShare(category, setup, shortcuts, includeProfile ? profile : ''))}>Export file</button></div>
  </section></div>
}
export function ImportDialog({ item, category, onCancel, onImport }) {
  const modalRef = useDialogKeyboard(onCancel)
  return <div className="modal-backdrop"><section ref={modalRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="import-title">
    <div className="modal-header"><div><div className="eyebrow subtle">A NEW SPACE AWAITS</div><h2 id="import-title">Import this setup?</h2></div><button className="icon-button" onClick={onCancel} aria-label="Close"><X size={18}/></button></div>
    <p className="modal-subtitle">“{item.name}” {item.author && <>by {item.author} </>}will be added to {category.name}. It contains {item.websites.length} website {item.websites.length === 1 ? 'shortcut' : 'shortcuts'}. Check links before opening them. Nothing opens automatically.</p>
    <div className="modal-actions"><button className="secondary-button" onClick={onCancel} autoFocus>Cancel</button><button className="primary-button" onClick={onImport}>Import setup</button></div>
  </section></div>
}
