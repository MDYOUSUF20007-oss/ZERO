import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

try {
  const migrated = localStorage.getItem('zero_classic_default_migrated_v1') === '1';
  const savedStyle = localStorage.getItem('zero_interface_style_v1');
  document.documentElement.setAttribute(
    'data-zero-style',
    migrated && (savedStyle === 'bespoke' || savedStyle === 'liquid_glass')
      ? savedStyle
      : 'classic'
  );
} catch {
  document.documentElement.setAttribute('data-zero-style', 'classic');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
