import React, { useState, useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

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
  
  const getCurrentPageTitle = () => {
    if (pathnames.length === 0) return 'Home';
    return pathnames[pathnames.length - 1].charAt(0).toUpperCase() + pathnames[pathnames.length - 1].slice(1);
  };

return (
    <div className="p-md border-b border-border bg-background-alt transition-all duration-300">
      <div className="flex items-center justify-between">
        <nav className="flex items-center space-x-1 text-sm">
          {pathnames.length > 0 ? (
            <>
              {pathnames.map((name, index) => {
                const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
                const isLast = index === pathnames.length - 1;

                return isLast ? (
                  <span key={name} className="font-medium bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    {name.charAt(0).toUpperCase() + name.slice(1)}
                  </span>
                ) : (
                  <React.Fragment key={name}>
                    <Link 
                      to={routeTo} 
                      className="text-text-secondary hover:text-primary transition-colors duration-200 relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-gradient-to-r after:from-primary after:to-accent after:transition-all after:duration-300 hover:after:w-full"
                    >
                      {name.charAt(0).toUpperCase() + name.slice(1)}
                    </Link>
                    <span className="text-text-secondary mx-2"> › </span>
                  </React.Fragment>
                );
              })}
            </>
          ) : (
            <span className="font-medium bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Home</span>
          )}
        </nav>
        
        <button 
          className="px-4 py-2 rounded-lg transition-all duration-300 text-sm font-medium bg-gradient-to-r from-primary to-accent text-white hover:shadow-lg hover:shadow-primary/25 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/50"
          onClick={handleThemeToggle}
          aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        >
          {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
      </div>
      
      <h1 className="text-2xl font-bold mt-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-gradient-to-r after:from-primary after:to-accent after:transition-all after:duration-500 hover:after:w-full">
        {params.name || getCurrentPageTitle()}
      </h1>
    </div>
  );
};

export default Breadcrumb;