// update.cjs — Flexible Persistent Feature Patch
const fs = require('fs');
const path = require('path');

// --- ⚙️ CONFIGURE YOUR APP NAME HERE ---
const APP_NAME = 'ZERO'; // <-- Change this to your actual app name!
// ---------------------------------------

const storageKey = APP_NAME.toLowerCase().replace(/[^a-z0-9]/g, '_');
const appPath = path.join(__dirname, 'src', 'App.jsx');
const cssPath = path.join(__dirname, 'src', 'index.css');

if (!fs.existsSync(appPath)) {
  console.error('❌ Could not find src/App.jsx! Run your initial setup first.');
  process.exit(1);
}

let appCode = fs.readFileSync(appPath, 'utf8');

// Automatically detect React hook style
const hookPrefix = appCode.includes('__BlockitReact.')
  ? '__BlockitReact.'
  : appCode.includes('useState(')
  ? ''
  : 'React.';

if (hookPrefix === '' && !appCode.includes('useEffect')) {
  appCode = appCode.replace(/\{\s*useState\s*\}/, '{ useState, useEffect }');
}

// Clean up any previous patch versions if upgrading
if (appCode.includes(`/* --- ${APP_NAME.toUpperCase()} UNIFIED STATE --- */`) || appCode.includes('blockit_presets_v1')) {
  appCode = appCode.replace(/\/\* --- .*? UNIFIED STATE --- \*\/[\s\S]*?const formatTime = \(totalSecs\) => \{[\s\S]*?\};\n/, '');
  appCode = appCode.replace(/\{\/\* --- .*? UNIFIED UI --- \*\/\}[\s\S]*?<\/button>\s*<\/div>/, '');
  console.log('♻️ Cleaned up previous patch version for upgrade.');
}

// 1. Inject Persistent State & Logic
if (!appCode.includes(`${storageKey}_presets_v1`)) {
  const needsTimerState = !appCode.includes('setRemainingSeconds');

  const stateInjection = `
  /* --- ${APP_NAME.toUpperCase()} UNIFIED STATE (PERSISTENT) --- */
  const defaultPresets = {
    Study: { name: 'Study Mode', icon: '📖', color: 'border-purple-500/50 text-purple-300', allowed: ['Notion', 'Kindle', 'Dictionary'] },
    Outing: { name: 'Going Out', icon: '🧭', color: 'border-blue-500/50 text-blue-300', allowed: ['Maps', 'Camera', 'Transit'] },
    Sports: { name: 'Sports & Gym', icon: '⚡', color: 'border-yellow-500/50 text-yellow-300', allowed: ['Spotify', 'Fitness', 'Workout'] }
  };

  const [activePreset, setActivePreset] = ${hookPrefix}useState(() => {
    try {
      return localStorage.getItem('${storageKey}_active_preset_v1') || 'Study';
    } catch {
      return 'Study';
    }
  });

  const [presets, setPresets] = ${hookPrefix}useState(() => {
    try {
      const saved = localStorage.getItem('${storageKey}_presets_v1');
      return saved ? JSON.parse(saved) : defaultPresets;
    } catch {
      return defaultPresets;
    }
  });

  const [customMinutesInput, setCustomMinutesInput] = ${hookPrefix}useState(() => {
    try {
      return localStorage.getItem('${storageKey}_custom_mins_v1') || '45';
    } catch {
      return '45';
    }
  });

  const [bagAppInput, setBagAppInput] = ${hookPrefix}useState('');
  const [isEngaged, setIsEngaged] = ${hookPrefix}useState(false);
  ${
    needsTimerState
      ? `const [remainingSeconds, setRemainingSeconds] = ${hookPrefix}useState(() => {
    try {
      const savedMins = parseInt(localStorage.getItem('${storageKey}_custom_mins_v1') || '45', 10);
      return (!isNaN(savedMins) && savedMins > 0 ? savedMins : 45) * 60;
    } catch {
      return 45 * 60;
    }
  });`
      : ''
  }

  const compulsoryWhitelist = ['Phone', 'Messages', 'WhatsApp', 'Telegram', 'Dialer', 'Contacts'];

  ${hookPrefix}useEffect(() => {
    try {
      localStorage.setItem('${storageKey}_presets_v1', JSON.stringify(presets));
      localStorage.setItem('${storageKey}_active_preset_v1', activePreset);
    } catch (err) {
      console.warn('Could not save presets to localStorage:', err);
    }
  }, [presets, activePreset]);

  ${hookPrefix}useEffect(() => {
    if (!isEngaged) return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setIsEngaged(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isEngaged]);

  const handleCustomTimerSet = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isEngaged) return;
    const mins = parseInt(customMinutesInput, 10);
    if (!isNaN(mins) && mins > 0 && mins <= 720) {
      setRemainingSeconds(mins * 60);
      try {
        localStorage.setItem('${storageKey}_custom_mins_v1', String(mins));
      } catch {}
    }
  };

  const addAppToActiveBag = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const appName = bagAppInput.trim();
    if (!appName || isEngaged) return;
    setPresets((prev) => {
      const currentBag = prev[activePreset];
      if (!currentBag || currentBag.allowed.some((a) => a.toLowerCase() === appName.toLowerCase())) {
        return prev;
      }
      return {
        ...prev,
        [activePreset]: {
          ...currentBag,
          allowed: [...currentBag.allowed, appName]
        }
      };
    });
    setBagAppInput('');
  };

  const removeAppFromActiveBag = (appName) => {
    if (isEngaged) return;
    setPresets((prev) => {
      const currentBag = prev[activePreset];
      if (!currentBag) return prev;
      return {
        ...prev,
        [activePreset]: {
          ...currentBag,
          allowed: currentBag.allowed.filter((a) => a !== appName)
        }
      };
    });
  };

  const resetBagsToDefault = () => {
    if (isEngaged) return;
    setPresets(defaultPresets);
    setActivePreset('Study');
    setCustomMinutesInput('45');
    setRemainingSeconds(45 * 60);
    try {
      localStorage.removeItem('${storageKey}_presets_v1');
      localStorage.removeItem('${storageKey}_active_preset_v1');
      localStorage.removeItem('${storageKey}_custom_mins_v1');
    } catch {}
  };

  const formatTime = (totalSecs) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return \`\${String(mins).padStart(2, '0')}:\${String(secs).padStart(2, '0')}\`;
  };
  `;

  if (/const\s+\[appState/.test(appCode)) {
    appCode = appCode.replace(/const\s+\[appState/, `${stateInjection}\n  const [appState`);
  } else {
    appCode = appCode.replace(
      /(function\s+App\s*\([^)]*\)\s*\{|const\s+App\s*=\s*\([^)]*\)\s*=>\s*\{)/,
      `$1\n${stateInjection}`
    );
  }
  console.log(`✅ Injected persistent state for ${APP_NAME}.`);
}

// 2. Inject UI Dashboard Card
if (!appCode.includes(`/* --- ${APP_NAME.toUpperCase()} UNIFIED UI --- */`)) {
  const uiInjection = `
      {/* --- ${APP_NAME.toUpperCase()} UNIFIED UI --- */}
      <div className="amoled-card rounded-2xl p-5 my-4 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-wide text-purple-200">${APP_NAME}</h2>
            {!isEngaged && (
              <button
                type="button"
                onClick={resetBagsToDefault}
                className="text-[11px] text-purple-400/60 hover:text-purple-300 underline cursor-pointer"
                title="Restore default preset bags and timer"
              >
                Reset
              </button>
            )}
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-purple-950/80 border border-purple-500/30 text-purple-300">
            {isEngaged ? '🔒 Engaged' : '🔓 Standby'}
          </span>
        </div>

        <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/10">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-purple-400/80 block">Session Timer</span>
            <span className="text-3xl font-mono font-bold text-purple-100">
              {formatTime(remainingSeconds)}
            </span>
          </div>
          {!isEngaged && (
            <form onSubmit={handleCustomTimerSet} className="flex items-center gap-1.5">
              <input
                type="number"
                min="1"
                max="720"
                value={customMinutesInput}
                onChange={(e) => setCustomMinutesInput(e.target.value)}
                className="w-16 bg-black/60 border border-purple-500/30 rounded-lg px-2.5 py-1.5 text-sm text-center text-purple-100 focus:outline-none focus:border-purple-400"
                placeholder="Min"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-purple-600/30 border border-purple-500/40 text-purple-200 text-xs font-medium hover:bg-purple-600/50 cursor-pointer"
              >
                Save Mins
              </button>
            </form>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {Object.entries(presets).map(([key, preset]) => (
            <button
              key={key}
              type="button"
              onClick={() => !isEngaged && setActivePreset(key)}
              disabled={isEngaged}
              className={\`p-2.5 rounded-xl border text-center transition-all \${
                activePreset === key
                  ? preset.color + ' bg-purple-950/50 scale-[1.02]'
                  : 'border-white/10 text-gray-400 opacity-60 hover:opacity-100'
              } \${isEngaged ? 'cursor-not-allowed' : 'cursor-pointer'}\`}
            >
              <div className="text-xl mb-1">{preset.icon}</div>
              <div className="text-xs font-medium">{preset.name}</div>
            </button>
          ))}
        </div>

        <div className="mb-4">
          <p className="text-xs uppercase tracking-wider text-purple-400/80 mb-2">
            Allowed in {presets[activePreset].name}
          </p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {presets[activePreset].allowed.map((app) => (
              <span
                key={app}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-white/5 border border-white/10 text-purple-100"
              >
                {app}
                {!isEngaged && (
                  <button
                    type="button"
                    onClick={() => removeAppFromActiveBag(app)}
                    className="text-purple-400 hover:text-pink-400 font-bold leading-none cursor-pointer"
                    title={\`Remove \${app}\`}
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>

          {!isEngaged && (
            <form onSubmit={addAppToActiveBag} className="flex gap-2">
              <input
                type="text"
                value={bagAppInput}
                onChange={(e) => setBagAppInput(e.target.value)}
                placeholder="Add app to active bag..."
                className="flex-1 bg-black/50 border border-purple-500/30 rounded-xl px-3 py-1.5 text-sm text-purple-100 placeholder-purple-400/40 focus:outline-none focus:border-purple-400"
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-xl bg-purple-600/30 border border-purple-500/40 text-purple-200 text-xs font-medium hover:bg-purple-600/50 cursor-pointer"
              >
                + Add
              </button>
            </form>
          )}
        </div>

        <div className="pt-3 border-t border-white/10 mb-5">
          <p className="text-[11px] text-gray-400 mb-1.5">⚡ Always Permitted (Emergency & Comms)</p>
          <div className="flex flex-wrap gap-1">
            {compulsoryWhitelist.map((item) => (
              <span
                key={item}
                className="px-2 py-0.5 text-[11px] rounded bg-emerald-950/40 border border-emerald-500/20 text-emerald-300/80"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsEngaged(!isEngaged)}
          className="btn-engage w-full py-3 rounded-xl text-sm uppercase tracking-wider transition-transform active:scale-95 cursor-pointer"
        >
          {isEngaged ? \`Disengage \${APP_NAME}\` : \`Engage \${presets[activePreset].name}\`}
        </button>
      </div>
  `;

  const lastClosingTagIndex = appCode.lastIndexOf('</');
  if (lastClosingTagIndex !== -1) {
    appCode = appCode.slice(0, lastClosingTagIndex) + uiInjection + '\n    ' + appCode.slice(lastClosingTagIndex);
    console.log(`✅ Injected UI component for ${APP_NAME}.`);
  }
}

// 3. Ensure AMOLED CSS exists
let existingCss = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '@import "tailwindcss";\n';
if (!existingCss.includes('.amoled-card')) {
  existingCss += `
/* --- AMOLED THEME PATCH --- */
body {
  background: radial-gradient(circle at 50% 0%, #16062c 0%, #000000 75%);
  color: #f3e8ff;
  margin: 0;
  user-select: none;
  -webkit-user-select: none;
  font-family: system-ui, -apple-system, sans-serif;
}
.amoled-card {
  background: rgba(20, 10, 35, 0.6);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(168, 85, 247, 0.2);
}
.btn-engage {
  background: linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #eab308 100%);
  color: #000;
  font-weight: 700;
  box-shadow: 0 0 20px rgba(168, 85, 247, 0.4);
}
`;
  fs.writeFileSync(cssPath, existingCss);
  console.log('✅ Applied AMOLED theme styles.');
}

fs.writeFileSync(appPath, appCode);
console.log(`🚀 Successfully patched project for "${APP_NAME}"!`);
