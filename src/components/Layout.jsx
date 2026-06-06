import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout() {
  const location = useLocation();
  const [role, setRole] = useState('gv');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Auto-close sidebar on mobile when navigating
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const userRoles = decoded.roles;
        const rolesArray = Array.isArray(userRoles) ? userRoles : (userRoles ? [userRoles] : []);
        
        if (rolesArray.some(r => r && (String(r).toUpperCase() === 'ADMIN' || String(r).toUpperCase() === 'ROLE_ADMIN'))) {
          setRole('admin');
        } else {
          setRole('gv');
        }
      } catch (error) {
        console.error("Lỗi giải mã token trong Layout:", error);
      }
    }
  }, []);

  return (
    <>
      <Sidebar role={role} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* Mobile Sidebar Overlay */}
      <div 
        className={`sb-overlay ${isSidebarOpen ? 'open' : ''}`} 
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      <div className="main">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <div className="content">
          <Outlet context={{ role }} />
        </div>
      </div>
    </>
  );
}
