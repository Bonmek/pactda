import { createBrowserRouter } from 'react-router-dom'
import React, { useState } from 'react'
import Layout from './components/Layout/Layout'
import Index from './pages/Index'
import Notfound from './pages/Notfound'
import TokenBridge from './pages/TokenBridge'

interface HomeProps {
  selectedWalletType: 'sui' | 'metamask' | null;
  setSelectedWalletType: (type: 'sui' | 'metamask' | null) => void;
}

type ChildProps = HomeProps;

// Create a wrapper component to manage state across routes
const RouteWrapper = ({ component: Component }: { component: React.ComponentType<HomeProps> }) => {
  const [selectedWalletType, setSelectedWalletType] = useState<'sui' | 'metamask' | null>(null);
  
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
  );
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <RouteWrapper component={Index} />
    )
  },
  {
    path: '/',
    element: (
      <RouteWrapper component={Index} />
    )
  },
  {
    path: '/token-bridge',
    element: (
      <RouteWrapper component={TokenBridge} />
    )
  },
  {
    path: '*',
    element: (
      <RouteWrapper component={Notfound} />
    ),
  },])
