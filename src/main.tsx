import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Self-healing migration to clear any old cached browser localStorage test data
try {
  const MIGRATION_KEY = 'e2c_zirara_production_clean_v3';
  if (!localStorage.getItem(MIGRATION_KEY)) {
    const keysToClear = [
      'e2c_zirara_users_v10',
      'e2c_zirara_beneficiaires_v10',
      'e2c_zirara_seances_v10',
      'e2c_zirara_absences_v10',
      'e2c_zirara_convocations_v10',
      'e2c_zirara_billets_retard_v1',
      'e2c_zirara_current_user_v1'
    ];
    keysToClear.forEach(key => localStorage.removeItem(key));
    localStorage.setItem(MIGRATION_KEY, 'true');
    console.log('Cleared outdated local storage test data cache.');
  }
} catch (e) {
  console.error('Migration error:', e);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
