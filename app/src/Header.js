import React from 'react';
import { useUser } from './UserContext';
import { useNavigate, useLocation } from 'react-router-dom';

const Header = () => {
  const { user, logout, isLoading } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  // Don't show header on login page, if user not loaded, or no user
  if (isLoading || !user || location.pathname === '/') return null;

  return (
    <div style={{
      backgroundColor: '#003b70',
      color: 'white',
      padding: '10px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontFamily: 'Lexend, sans-serif',
      fontSize: '14px',
      borderBottom: '2px solid #0071ce',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      <div style={{ fontWeight: '500', fontSize: '16px' }}>
    
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <span style={{ fontSize: '12px', opacity: 0.8 }}>
          Role: {user.role}
        </span>
        <button
          onClick={handleLogout}
          style={{
            backgroundColor: 'transparent',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
          onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Header;
