import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { PopoutCardView } from '@/features/dashboards/components/PopoutCardView';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function RootRouter() {
  const hash = window.location.hash;
  if (hash.startsWith('#/popout/')) {
    const cardId = hash.replace('#/popout/', '');
    return <PopoutCardView cardId={cardId} />;
  }
  return <App />;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RootRouter />
    </QueryClientProvider>
  </React.StrictMode>
);
