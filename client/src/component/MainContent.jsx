import React from 'react';
import { useLocation } from 'react-router-dom';
import Router from '../Router';
import Breadcrumb from './Breadcrum';

const MainContent = () => {
  const location = useLocation();
  
  return (
    <div className="flex-1 bg-background overflow-y-auto">
      <div className="">
        <Breadcrumb />
      </div>
      <div className="">
        <Router />
      </div>
    </div>
  );

};

export default MainContent;