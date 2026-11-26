import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import App from './App.jsx';
import { queryClient } from './lib/query-client';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
        <Toaster
          richColors
          position="bottom-right"
          // Neo-brutalism: viền đậm + bóng cứng cho toast (ghi đè style mặc định của sonner)
          toastOptions={{ classNames: { toast: '!rounded-sm !border-2 !border-[rgb(var(--edge))] !shadow-[4px_4px_0_0_rgb(var(--shadow))] !font-sans !font-semibold' } }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
