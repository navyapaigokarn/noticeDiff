import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DashboardApp } from './App';
import './style.css';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <DashboardApp />
    </StrictMode>,
  );
}
