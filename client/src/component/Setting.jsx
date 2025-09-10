import React, { useState, useEffect } from 'react';

const Settings = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Load theme preference from localStorage on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
      document.documentElement.classList.toggle('theme-dark', savedTheme === 'dark');
    } else {
      // Use system preference if no saved preference
      setIsDarkMode(prefersDark);
      document.documentElement.classList.toggle('theme-dark', prefersDark);
    }
  }, []);

  // Handle theme toggle
  const handleThemeToggle = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    
    // Apply theme to document
    document.documentElement.classList.toggle('theme-dark', newTheme);
    
    // Save preference to localStorage
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Settings</h1>
        <p className="text-text-secondary">Customize your application preferences</p>
      </div>

      <div className="space-y-8">
        <div className="bg-background-alt p-6 rounded-lg border border-border">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Appearance</h2>
          
          <div className="flex items-center justify-between p-4 bg-background rounded-md border border-border">
            <div>
              <h3 className="text-base font-medium text-text-primary mb-1">Theme</h3>
              <p className="text-sm text-text-secondary">
                Choose between light and dark mode for a comfortable viewing experience
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-text-secondary">
                {isDarkMode ? 'Dark' : 'Light'}
              </span>
              <button 
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  isDarkMode ? 'bg-primary' : 'bg-gray-300'
                }`}
                onClick={handleThemeToggle}
                aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    isDarkMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-background-alt p-6 rounded-lg border border-border">
          <h2 className="text-xl font-semibold text-text-primary mb-4">General</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-background rounded-md border border-border">
              <div>
                <h3 className="text-base font-medium text-text-primary mb-1">Language</h3>
                <p className="text-sm text-text-secondary">
                  Select your preferred language
                </p>
              </div>
              <select className="px-3 py-2 border border-border rounded-md bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-4 bg-background rounded-md border border-border">
              <div>
                <h3 className="text-base font-medium text-text-primary mb-1">Notifications</h3>
                <p className="text-sm text-text-secondary">
                  Receive notifications about your extractions
                </p>
              </div>
              <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 translate-x-1" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-background-alt p-6 rounded-lg border border-border">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Account</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-background rounded-md border border-border">
              <div>
                <h3 className="text-base font-medium text-text-primary mb-1">Profile</h3>
                <p className="text-sm text-text-secondary">
                  Manage your account information
                </p>
              </div>
              <button className="px-4 py-2 bg-border text-text-primary rounded-md hover:bg-opacity-80 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                Edit Profile
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-background rounded-md border border-border">
              <div>
                <h3 className="text-base font-medium text-text-primary mb-1">API Keys</h3>
                <p className="text-sm text-text-secondary">
                  Manage your API access keys
                </p>
              </div>
              <button className="px-4 py-2 bg-border text-text-primary rounded-md hover:bg-opacity-80 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                Manage Keys
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;