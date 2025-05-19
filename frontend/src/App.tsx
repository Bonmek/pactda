import React from 'react'
import { RouterProvider } from 'react-router-dom'

import ErrorBoundary from './components/ErrorBoundary'
import { router } from './router'
import { Toaster } from 'sonner'

const App: React.FC = () => (
  <ErrorBoundary>
    <Toaster />
    <RouterProvider router={router} />
  </ErrorBoundary>
)
App.displayName = 'App'
export default App
