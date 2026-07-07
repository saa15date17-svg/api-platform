import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import App from './App';

const rootEl = document.getElementById('root')!;

async function bootstrap() {
  if (import.meta.env.DEV) {
    const { worker } = await import('./mocks');
    await worker.start({
      onUnhandledRequest: 'bypass',
    });
  }

  ReactDOM.createRoot(rootEl).render(
    <BrowserRouter>
      <ConfigProvider theme={{ token: { colorPrimary: '#1677ff' } }}>
        <App />
      </ConfigProvider>
    </BrowserRouter>
  );
}

bootstrap();
