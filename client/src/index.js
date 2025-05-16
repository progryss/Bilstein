import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.js'
import './App.css';
import { ToastContainer } from 'react-toastify';

createRoot(document.getElementById('root')).render(
  <StrictMode>
      <ToastContainer position="top-right" hideProgressBar={true} />
      <App />
  </StrictMode>,
)
