import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import Sidebar from './component/SideBar';
import MainContent from './component/Maincontent';
import { UserProvider } from './UserContext';

import './App.css';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(false); // Auto-close sidebar on desktop
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <UserProvider>
      <Router>
        <div className="app-container">
          {/* Mobile Overlay */}
          {isMobile && isSidebarOpen && (
            <div 
              className="sidebar-overlay" 
              onClick={closeSidebar}
              aria-label="Close sidebar"
            />
          )}
          
          <Sidebar 
            isOpen={isSidebarOpen}
            isMobile={isMobile}
            onClose={closeSidebar}
          />
          <MainContent 
            onToggleSidebar={toggleSidebar}
            isMobile={isMobile}
            isSidebarOpen={isSidebarOpen}
          />
        </div>
      </Router>
    </UserProvider>
  );
}

export default App;

