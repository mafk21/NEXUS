import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import Notch from './Notch.jsx'
import './styles.css'

if (window.location.hash === '#notch' && window.nexusNotch) document.documentElement.classList.add('notch-document')

createRoot(document.getElementById('root')).render(<React.StrictMode>{window.location.hash === '#notch' && window.nexusNotch ? <Notch /> : <App />}</React.StrictMode>)
