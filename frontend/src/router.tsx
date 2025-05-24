import { createBrowserRouter } from 'react-router-dom'
import React, { useState } from 'react'
import Layout from './components/Layout/Layout'
import Index from './pages/Index'
import Notfound from './pages/Notfound'
import Workflow from './pages/Workflow'
import HowToUse from './pages/HowToUse'
import Callback from './pages/Callback'
import Dashboard from './pages/Dashboard'
import CreateContract from './pages/CreateContract'
import Home from './pages/Home'
import About from './pages/About'
import Docs from './pages/Docs'
import UpdateContract from './pages/UpdateContract'
import ContractDetail from './pages/ContractDetail'

interface HomeProps {
  selectedWalletType: 'sui' | 'metamask' | 'google' | 'facebook' | null
  setSelectedWalletType: (
    type: 'sui' | 'metamask' | 'google' | 'facebook' | null,
  ) => void
}

type ChildProps = HomeProps

// Create a wrapper component to manage state across routes
const RouteWrapper = ({
  component: Component,
}: {
  component: React.ComponentType<HomeProps>
}) => {
  const [selectedWalletType, setSelectedWalletType] = useState<
    'sui' | 'metamask' | 'google' | 'facebook' | null
  >(null)

  // Pass wallet state to the Layout and then to the children
  return (
    <Layout
      selectedWalletType={selectedWalletType}
      setSelectedWalletType={setSelectedWalletType}
    >
      <Component
        selectedWalletType={selectedWalletType}
        setSelectedWalletType={setSelectedWalletType}
      />
    </Layout>
  )
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RouteWrapper component={Home} />,
  },
  {
    path: '/workflow',
    element: <RouteWrapper component={Workflow} />,
  },
  {
    path: '/how-to-use',
    element: <RouteWrapper component={HowToUse} />,
  },
  {
    path: '/about',
    element: <RouteWrapper component={About} />,
  },
  {
    path: '/docs',
    element: <RouteWrapper component={Docs} />,
  },
  {
    path: '/callback',
    element: <RouteWrapper component={Callback} />,
  },
  {
    path: '*',
    element: <RouteWrapper component={Notfound} />,
  },
  {
    path: '/dashboard',
    element: <RouteWrapper component={Dashboard} />,
  },
  {
    path: '/create-contract',
    element: <RouteWrapper component={CreateContract} />,
  },
  {
    path: '/contract/:id',
    element: <RouteWrapper component={ContractDetail} />,
  },
  {
    path: '/contract/:id/edit',
    element: <RouteWrapper component={UpdateContract} />,
  },
])
