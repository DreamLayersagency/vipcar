import React from 'react';
import { createRoot } from 'react-dom/client';
import { configureClient } from '../../../libs/web-client/src/index.js';
import { App } from './App.jsx';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/pages.css';

// Same gateway and analytics settings as App 1 (root `.env`, shared by every view).
configureClient({
  apiBaseUrl: import.meta.env.VITE_API_URL ?? '',
  gaMeasurementId: import.meta.env.VITE_GA_MEASUREMENT_ID ?? '',
});

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);

// The demo switcher is part of demo builds only (`--mode demo`, the default for this app).
if (import.meta.env.MODE === 'demo') {
  import('../../../libs/demo-switcher/src/index.js').then(({ mountDemoSwitcher }) => {
    mountDemoSwitcher({ currentViewId: 'view-2' });
  });
}
