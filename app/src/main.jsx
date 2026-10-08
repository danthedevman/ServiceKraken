import { Toasts } from './components/toasts.jsx';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './application.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <>
    <App />
    <Toasts />
  </>,
);
