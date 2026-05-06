import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

import * as logPkg from 'logging-middleware';
const { setAuthToken } = logPkg;

// Pass token from environment variables
const token = import.meta.env.VITE_EVALUATION_AUTH_TOKEN;
if (token) {
    setAuthToken(token);
} else {
    console.warn("Auth token missing from environment!");
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
