import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { setAuthToken, Log } from '../../logging_middleware/index.mjs'

const token = import.meta.env.VITE_EVALUATION_AUTH_TOKEN;

if (token) {
    setAuthToken(token);
    Log('frontend', 'info', 'config', 'Auth token configured successfully.');
} else {
    // Missing token, but cannot use console.warn.
    // Logging to remote without token will fail, so we just fail silently per constraints.
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
