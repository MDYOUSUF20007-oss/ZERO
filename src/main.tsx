import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

try {
  const migrated = localStorage.getItem('zero_classic_default_migrated_v1') === '1';
  const savedStyle = localStorage.getItem('zero_interface_style_v1');
  // Normalise legacy 'liquid_glass' → 'fluent_glass' on first read
  const resolvedStyle = savedStyle === 'liquid_glass' ? 'fluent_glass' : savedStyle;
  document.documentElement.setAttribute(
    'data-zero-style',
    migrated && (resolvedStyle === 'bespoke' || resolvedStyle === 'fluent_glass')
      ? resolvedStyle
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
