import React from 'react';
import { useLocation } from 'react-router-dom';
import Router from '../Router';
import '../Styles/main.css';
import Breadcrumb from './BreadCrum';
import { Menu } from 'lucide-react';


const MainContent = ({ onToggleSidebar, isMobile, isSidebarOpen }) => {
  const location = useLocation();
  
  return (
    <div className="main-content">
      {/* Mobile Hamburger Menu */}
      {isMobile && (
        <button 
          className="main-content__hamburger"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <Menu size={24} />
        </button>
      )}
      
      <div className="main-content__breadcrumb">
        <Breadcrumb />
      </div>
      <div className="main-content__router">
        <Router />
      </div>
    </div>
  );

};

export default MainContent;