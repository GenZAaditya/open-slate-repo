import React, { useState, useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';

const Breadcrumb = () => {
  const location = useLocation();
  const params = useParams();
  const [isDark, setIsDark] = useState(false);
  
  const pathnames = location.pathname.split('/').filter(x => x);
  
  // Load theme preference from localStorage on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
      setIsDark(savedTheme === 'dark');
      document.documentElement.classList.toggle('theme-dark', savedTheme === 'dark');
    } else {
      // Use system preference if no saved preference
      setIsDark(prefersDark);
      document.documentElement.classList.toggle('theme-dark', prefersDark);
    }
  }, []);

  // Handle theme toggle
  const handleThemeToggle = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    
    // Apply theme to document
    document.documentElement.classList.toggle('theme-dark', newTheme);
    
    // Save preference to localStorage
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };
  
  // Custom page names mapping
  const getPageTitle = () => {
    if (params.name) return params.name;
    
    if (pathnames.length === 0) return 'Extract here !';
    
    const currentPath = pathnames[pathnames.length - 1].toLowerCase();
    
    // Custom names for specific routes
    const pageNames = {
      'history': 'Extraction history',
      'analytics': 'More on your data',
      'settings': 'Settings',
      'upcoming': 'Upcoming',
      'documentation': 'Documentation',
      'email': 'Email Us',
      'status': 'Status'
    };
    
    return pageNames[currentPath] || currentPath.charAt(0).toUpperCase() + currentPath.slice(1);
  };

  return (
    <div className="breadcrumb">
      <div className="breadcrumb__header">
        <h1 className="breadcrumb__title">{getPageTitle()}</h1>
        
        <button 
          className="breadcrumb__theme-toggle"
          onClick={handleThemeToggle}
          aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        >
          {isDark ? '☀️' : '🌙'}
        </button>
      </div>
    </div>
  );
};

export default Breadcrumb;