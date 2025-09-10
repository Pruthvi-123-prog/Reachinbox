import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import Main from './Main';
import reportWebVitals from './reportWebVitals';
// Import animations
import './scripts/diganthadeepaAnimations';

// Display frontend configuration
console.log('\n✨ =================================');
console.log('✨ DIGANTHADEEPA EMAIL APP STARTED');
console.log('✨ =================================');
console.log(`✨ Frontend Port: ${window.location.port || '3000 (default)'}`);
console.log(`✨ API Base URL: ${(window as any).REACHINBOX_CONFIG?.API_URL || process.env.REACT_APP_API_URL || 'https://reachinbox-8bd8.onrender.com'}`);
console.log(`✨ Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`✨ React Version: ${React.version}`);
console.log('✨ =================================\n');

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <Main />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
