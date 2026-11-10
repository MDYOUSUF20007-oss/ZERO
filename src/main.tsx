import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

try {
  const savedStyle = localStorage.getItem('zero_interface_style_v1');
  document.documentElement.setAttribute(
    'data-zero-style',
    savedStyle === 'classic' ? 'classic' : 'bespoke'
  );
} catch {
  document.documentElement.setAttribute('data-zero-style', 'bespoke');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
