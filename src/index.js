import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Firebase always keeps its built-in addresses switched on. Anyone who lands
// on one is sent to the real address, so hawksop.com is the only one people see.
const PUBLIC_HOST = 'hawksop.com';
const BUILT_IN_HOSTS = ['maupcoop.web.app', 'maupcoop.firebaseapp.com'];

if (BUILT_IN_HOSTS.includes(window.location.hostname)) {
  const { pathname, search, hash } = window.location;
  window.location.replace(`https://${PUBLIC_HOST}${pathname}${search}${hash}`);
} else {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
