import React from 'react'
import ReactDOM from 'react-dom/client'
import './global.css'

import App from './App'
import { Providers } from './providers'
import { ThemeProvider } from './context/ThemeContext'

const root = ReactDOM.createRoot(document.getElementById('root')!)

// Setup MSW mock server in development
if (process.env.NODE_ENV === 'development') {
  // Certify MSW's Service Worker is available before start React app.
  import('../mocks/browser')
    .then(async ({ worker }) => {
      return worker.start()
    }) // Run <App /> when Service Worker is ready to intercept requests.
    .then(() => {
      root.render(
        <ThemeProvider>
          <React.StrictMode>
            <Providers>
              <App />
            </Providers>
          </React.StrictMode>
        </ThemeProvider>,
      )
    })
  // Never setup MSW mock server in production
} else if (process.env.NODE_ENV === 'production') {
  root.render(
    <ThemeProvider>
      <React.StrictMode>
        <Providers>
          <App />
        </Providers>
      </React.StrictMode>
    </ThemeProvider>,
  )
}
