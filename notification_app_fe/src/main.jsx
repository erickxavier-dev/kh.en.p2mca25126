import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { setAuthToken } from '../../logging_middleware/index.mjs'

const token = import.meta.env.VITE_EVALUATION_AUTH_TOKEN;

if (token) {
    setAuthToken(token);
} else {
    console.warn('No auth token set — logs will be rejected by the evaluation server.');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
