import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import './css/mobile.css'
import { ConfirmProvider } from './contexts/ConfirmContext'
import { ErrorProvider } from './contexts/ErrorContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorProvider>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </ErrorProvider>
  </StrictMode>,
)
