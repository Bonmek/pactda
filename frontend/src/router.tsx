import { createBrowserRouter } from 'react-router'

import Layout from './components/Layout/Layout'
import Index from './pages/Index'
import Notfound from './pages/Notfound'
import { Dashboard } from './pages/Dashboard'
import { Create } from './pages/Create'
import { Home } from './pages/Home'

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <Layout>
        <Home/>
      </Layout>
    ),
  },
  {
    path: '/Dashboard',
    element: (
      <Layout>
        <Dashboard />
      </Layout>
    ),
  },
  {
    path: '/Create',
    element: (
      <Layout>
        <Create />
      </Layout>
    ),
  },
  {
    path: '*',
    element: (
      <Layout>
        <Notfound />
      </Layout>
    ),
  },
])

export default router
