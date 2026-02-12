import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { CountryProvider } from './context/CountryContext'
import { AuthModalProvider } from './components/ui/AuthModal'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <CountryProvider>
          <AuthProvider>
            <AuthModalProvider>
              <App />
              <Toaster position="top-center" toastOptions={{ style: { zIndex: 99999 } }} containerStyle={{ zIndex: 99999 }} />
            </AuthModalProvider>
          </AuthProvider>
        </CountryProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
)
