import { createSignal, Show } from 'solid-js';
import { useStore, useAppDispatch } from '../hooks/store';
import { RootState, AppDispatch } from '../store/store';
import { setApiKey, clearError } from '../store/apiSlice';

// Settings component
export default function Settings() {
  const dispatch = useAppDispatch();
  
  // Get state from Redux
  const api = useStore((state: RootState) => state.api);
  
  // Local state
  const [showSettings, setShowSettings] = createSignal(false);
  const [apiKeyInput, setApiKeyInput] = createSignal('');
  
  // Save API key
  function handleSaveApiKey() {
    const key = apiKeyInput().trim();
    if (key) {
      dispatch(setApiKey(key))
        .then(() => {
          setShowSettings(false);
          setApiKeyInput('');
        });
    }
  }
  
  return (
    <>
      <button 
        class="settings-toggle" 
        onClick={() => setShowSettings(!showSettings())}
        title="Settings"
      >
        ⚙️ Settings
      </button>
      
      <Show when={showSettings()}>
        <div class="settings-modal">
          <div class="settings-modal-content">
            <h2>Settings</h2>
            
            <div class="settings-section">
              <h3>API Configuration</h3>
              
              <div class="form-group">
                <label for="api-key">Claude API Key</label>
                <input
                  id="api-key"
                  type="password"
                  value={apiKeyInput()}
                  onInput={(e) => setApiKeyInput(e.currentTarget.value)}
                  placeholder="Enter your Claude API key"
                />
                <p class="help-text">Your API key is stored securely and never sent to any server except Claude's API.</p>
              </div>
              
              <Show when={api().error}>
                <div class="error-message">
                  {api().error}
                  <button onClick={() => dispatch(clearError())}>Dismiss</button>
                </div>
              </Show>
              
              <div class="settings-status">
                <Show when={api().apiKey} fallback={
                  <span class="status-indicator not-configured">API Key not configured</span>
                }>
                  <span class="status-indicator configured">API Key configured</span>
                </Show>
              </div>
            </div>
            
            <div class="modal-actions">
              <button onClick={handleSaveApiKey}>Save</button>
              <button onClick={() => setShowSettings(false)}>Cancel</button>
            </div>
          </div>
        </div>
      </Show>
    </>
  );
}