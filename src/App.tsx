import { useEffect, useState } from 'react';
import './App.css';

interface ExtensionState {
  supported: boolean;
  wideEnabled: boolean;
  darkEnabled: boolean;
  autoRefreshEnabled: boolean;
  autoRefreshInterval?: number;
  isDev?: boolean; // For dev mode without chrome API
}

function App() {
  const [state, setState] = useState<ExtensionState>({
    supported: false,
    wideEnabled: false,
    darkEnabled: false,
    autoRefreshEnabled: false,
    autoRefreshInterval: 5,
    isDev: !chrome?.tabs, // check if we are in true chrome extension env
  });

  const [isExperimentalOpen, setIsExperimentalOpen] = useState(false);

  useEffect(() => {
    // Check state from content script via Chrome messaging
    if (chrome?.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_STATE' }, (res) => {
            if (res) {
              setState((s) => ({ ...s, ...res, isDev: false }));
            }
          });
        }
      });
    } else {
      // Dev fallback for viewing in browser
      setState((s) => ({ ...s, supported: true, isDev: true }));
    }
  }, []);

  const toggleFeature = (feature: keyof ExtensionState) => {
    const newValue = !state[feature];
    setState((s) => ({ ...s, [feature]: newValue }));

    if (chrome?.tabs) {
      // Persist state
      chrome.storage.sync.set({ [feature]: newValue });

      // Notify content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'SET_FEATURE',
            feature,
            value: newValue,
          });
        }
      });
    }
  };

  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseInt(e.target.value, 10);
    if (Number.isNaN(val)) val = 0;
    if (val < 0) val = 0;
    if (val > 60) val = 60;

    setState((s) => ({ ...s, autoRefreshInterval: val }));

    if (chrome?.tabs) {
      chrome.storage.sync.set({ autoRefreshInterval: val });
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'SET_FEATURE',
            feature: 'autoRefreshInterval',
            value: val,
          });
        }
      });
    }
  };

  return (
    <div className='popup-container'>
      <header className='popup-header'>
        <div className='header-content'>
          <img src='coral128.png' alt='Coral Loader' className='header-icon' />
          <h1>Coral Loader</h1>
        </div>
      </header>

      <div className='status-section'>
        {state.supported ? (
          <span className='status supported'>● Supported page</span>
        ) : (
          <span className='status unsupported'>
            ○ This page is not supported.
          </span>
        )}
      </div>

      {state.supported && (
        <main className='popup-content'>
          <div className='toggle-group'>
            <div className='toggle-item'>
              <div className='toggle-label-wrapper'>
                <label htmlFor='wide-comments' className='toggle-label'>
                  Wide Comments
                </label>
                <span className='toggle-description'>
                  Wider comments section with bigger reply indents
                </span>
              </div>
              <label className='toggle-switch'>
                <input
                  id='wide-comments'
                  type='checkbox'
                  checked={state.wideEnabled}
                  onChange={() => toggleFeature('wideEnabled')}
                />
                <span className='slider'></span>
              </label>
            </div>
            <div className='toggle-item'>
              <div className='toggle-label-wrapper'>
                <label htmlFor='auto-refresh' className='toggle-label'>
                  Auto Refresh
                </label>
                <span className='toggle-description'>
                  Auto load new comments and replies
                </span>
              </div>
              <label className='toggle-switch'>
                <input
                  id='auto-refresh'
                  type='checkbox'
                  checked={state.autoRefreshEnabled}
                  onChange={() => toggleFeature('autoRefreshEnabled')}
                />
                <span className='slider'></span>
              </label>
            </div>
            {state.autoRefreshEnabled && (
              <div
                className='toggle-item'
                style={{
                  marginTop: '-8px',
                  borderTopLeftRadius: 0,
                  borderTopRightRadius: 0,
                  borderTop: 'none',
                }}
              >
                <div className='toggle-label-wrapper'>
                  <label htmlFor='interval-input' className='toggle-label'>
                    Refresh Interval
                  </label>
                  <span className='toggle-description'>
                    Delay in seconds (0 - 60) before loading new comments. 0 = no delay.
                  </span>
                </div>
                <input
                  id='interval-input'
                  type='number'
                  min='0'
                  max='60'
                  value={state.autoRefreshInterval ?? 5}
                  onChange={handleIntervalChange}
                  style={{
                    width: '60px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    textAlign: 'right',
                  }}
                />
              </div>
            )}
            <div className='accordion'>
              <button
                type='button'
                className='accordion-header'
                onClick={() => setIsExperimentalOpen(!isExperimentalOpen)}
              >
                <div className='accordion-title'>Experimental</div>
                {!isExperimentalOpen && state.darkEnabled && (
                  <div className='accordion-badge'>1 feature enabled</div>
                )}
                <div
                  className={`accordion-icon ${isExperimentalOpen ? 'open' : ''}`}
                >
                  ▼
                </div>
              </button>
              {isExperimentalOpen && (
                <div className='accordion-content'>
                  <span className='toggle-description'>
                    Note: experimental features may be unstable, and are for
                    testing and feedback purposes only.
                  </span>
                  <div className='toggle-item'>
                    <div className='toggle-label-wrapper'>
                      <label htmlFor='dark-theme' className='toggle-label'>
                        Dark Theme
                      </label>
                      <span className='toggle-description'>
                        Enable dark theme
                      </span>
                    </div>
                    <label className='toggle-switch'>
                      <input
                        id='dark-theme'
                        type='checkbox'
                        checked={state.darkEnabled}
                        onChange={() => toggleFeature('darkEnabled')}
                      />
                      <span className='slider'></span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      )}
    </div>
  );
}

export default App;
