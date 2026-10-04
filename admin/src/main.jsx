import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/admin.css';

/* index.html parks the webfont on media="print" so it cannot block the
 * first paint; switching it on here keeps the CSP free of inline script. */
for (const link of document.querySelectorAll('link[data-webfont]')) {
  link.media = 'all';
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename="/admin">
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
