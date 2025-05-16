import React, { useState, useEffect } from 'react';
import type { PropsWithChildren } from 'react';
import Header from './Header';
import Footer from './Footer';

import styles from './Layout.module.css';

interface LayoutProps {
  selectedWalletType: 'sui' | 'metamask' | null;
  setSelectedWalletType: (type: 'sui' | 'metamask' | null) => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ 
  selectedWalletType, 
  setSelectedWalletType, 
  children 
}) => {
  // Try to load the saved wallet type from localStorage
  useEffect(() => {
    const savedWalletType = localStorage.getItem('selectedWalletType') as 'sui' | 'metamask' | null;
    if (savedWalletType) {
      setSelectedWalletType(savedWalletType);
    }
  }, [setSelectedWalletType]);

  // Save the selected wallet type to localStorage
  useEffect(() => {
    if (selectedWalletType) {
      localStorage.setItem('selectedWalletType', selectedWalletType);
    } else {
      localStorage.removeItem('selectedWalletType');
    }
  }, [selectedWalletType]);
  
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-gray-100">
      <Header 
        selectedWalletType={selectedWalletType} 
        setSelectedWalletType={setSelectedWalletType}
      />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
