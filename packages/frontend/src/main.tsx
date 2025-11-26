import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';

import { ToastProvider } from './components/ui';
import { queryClient } from './lib/queryClient';
import { Router } from './router';
import { store } from './store';
import { registerServiceWorker } from './lib/serviceWorker';

import './index.css';

// Register service worker for offline support
registerServiceWorker();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <Router />
        </ToastProvider>
      </QueryClientProvider>
    </Provider>
  </React.StrictMode>
);
