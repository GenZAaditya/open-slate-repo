import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import Sidebar from './component/SideBar';
import MainContent from './component/MainContent';
import { UserProvider } from './UserContext';

function App() {
  return (
    <UserProvider>
      <Router>
        <div className="flex h-screen bg-background">
          <Sidebar />
          <MainContent />
        </div>
      </Router>
    </UserProvider>
  );
}

export default App;

