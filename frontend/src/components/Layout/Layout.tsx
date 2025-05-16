import React, { useState, useEffect } from 'react';
import type { PropsWithChildren } from 'react';
import Header from './Header';
import Footer from './Footer';
import clsx from 'clsx';
import { useLocation } from 'react-router-dom';

import styles from './Layout.module.css';

interface LayoutProps {
  selectedWalletType: 'sui' | 'metamask' | 'google' | 'facebook' | null;
  setSelectedWalletType: (type: 'sui' | 'metamask' | 'google' | 'facebook' | null) => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ 
  selectedWalletType, 
  setSelectedWalletType, 
  children 
}) => {
  const [scrollPosition, setScrollPosition] = useState(0);
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  // Handle scroll position for glow effects
  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Try to load the saved wallet type from localStorage
  useEffect(() => {
    const savedWalletType = localStorage.getItem('selectedWalletType') as 'sui' | 'metamask' | 'google' | 'facebook' | null;
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
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#0c1225] to-[#0f172a] text-gray-100">
      <Header 
        selectedWalletType={selectedWalletType} 
        setSelectedWalletType={setSelectedWalletType}
      />
      <main className={styles.layout}>
        {/* Decorative blue glowing elements */}
        <div
          className={clsx(styles.blueGlow, styles.topGlow)}
          style={{ opacity: 0.7 - scrollPosition / 1000 }}
        />
        <div
          className={clsx(styles.blueGlow, styles.bottomGlow)}
          style={{ opacity: 0.5 + scrollPosition / 2000 }}
        />

        {/* Animated particles background */}
        <div className="absolute inset-0 overflow-hidden opacity-20">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute bg-blue-700 rounded-full"
              style={{
                width: `${Math.random() * 4 + 1}px`,
                height: `${Math.random() * 4 + 1}px`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.5,
                animation: `float ${Math.random() * 10 + 10}s linear infinite`,
                animationDelay: `${Math.random() * 5}s`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 w-full h-full">
          <div className={styles.container}>
            <div
              className={clsx(
                isHomePage ? 'my-2' : styles.content,
                'relative z-10 w-full h-full',
              )}
            >
              {children}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
