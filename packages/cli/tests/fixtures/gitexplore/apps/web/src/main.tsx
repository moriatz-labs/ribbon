import { createRoot } from 'react-dom/client';
import { ThemeProvider } from 'strawn';

import { App } from './app';

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
