import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { CountryProvider } from './context/CountryContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <CountryProvider>
          <AuthProvider>
            <App />
            <Toaster position="top-right" />
          </AuthProvider>
        </CountryProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
)
