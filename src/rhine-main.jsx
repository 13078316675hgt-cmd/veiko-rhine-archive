import React from 'react'
import { createRoot } from 'react-dom/client'
import './rhine-archive-prototype.css'
import { RhineArchivePrototype } from './components/RhineArchivePrototype.jsx'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RhineArchivePrototype />
  </React.StrictMode>,
)
