// LoginPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { setPocid, getPocid } from './pocConfig';// Import poc from config.js
import { appealsLoginAPI } from './config';
import { useUser } from './UserContext';
import axios from 'axios';

function LoginPage() {
  const { 
    login,
    setAgentId,
    setTeamLeadId,
    setClientId,
    setPocId,
    user
  } = useUser();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // If already logged in → redirect to intended page
  useEffect(() => {
    if (user && location.state?.from) {
      navigate(location.state.from.pathname, { replace: true });
    }
  }, [user, navigate, location.state]);

  const handleLogin = async (e) => {
    e.preventDefault();

    const normalized = username.replace(/\s+/g, ' ').trim();

    /* ───────────────────────────────────────────────
       LEGACY LOGIN (NO PASSWORD)
    ─────────────────────────────────────────────── */
    if (password === '') {
      const loginState = {
        // managerName: normalized.toLowerCase(),
        // managerNameRaw: normalized
      };
      

      const uname = normalized.toLowerCase();

      if (uname === 'leader') {
        navigate('/client');
        return;
      }
      if (uname === 'agent') {
        setAgentId('LEGACY'); // optional
        navigate('/agent');
        return;
      }
      if (uname === 'poc') {
        setPocId('M132305');
        navigate('/poc');
        return;
      }
      if (uname === 'onshore') {
        setPocId('ONSHORE');
        navigate('/poc');
        return;
      }

      navigate('/teamlead', { state: loginState });
      return;
    }

    /* ───────────────────────────────────────────────
       API LOGIN
    ─────────────────────────────────────────────── */
    setIsLoading(true);

    try {
      const response = await axios.post(
        `${appealsLoginAPI}appeals_login`,
        {
          Username: username,
          Password: password
        }
      );

      if (!response.data) return;

      const userData = response.data;

      console.log('API Response:', userData);
      const landingPage = (userData.landingPage || '').trim().toLowerCase();

      // store user in global UserContext
      login(userData);

      console.log('API Response:', userData);
      // also save old loginState for backwards compatibility
      const loginState = {
        // managerName: normalized.toLowerCase(),
        // managerNameRaw: normalized,
        userInfo: userData
      };
     

      /* ───────────────────────────────────────────────
         ROLE-BASED ROUTING USING Setters
      ─────────────────────────────────────────────── */

      // CLIENT
      if (landingPage === 'client' || landingPage === '/client') {
        setClientId(userData.agentID || userData.clientID);
        navigate('/client');
        return;
      }

      // AGENT
      if (landingPage === 'agent' || landingPage === '/agent') {
        setAgentId(userData.agentID);
        navigate('/agent');
        return;
      }

      // POC
      if (landingPage === 'poc' || landingPage === '/poc') {
        setPocId(userData.agentID);
        navigate('/poc');
        return;
      }

      // TEAM LEAD
      if (landingPage === 'teamlead' || landingPage === '/teamlead') {
        setTeamLeadId(userData.agentID);
        navigate('/teamlead', { state: loginState });
        return;
      }

      /* ───────────────────────────────────────────────
         ❌ No fallback. If no landingPage recognized,
            simply do nothing — stay on login page.
      ─────────────────────────────────────────────── */
      console.warn('Unknown landingPage. No redirect performed.');

    } catch (error) {
      console.error('Login failed:', error);
      alert(error.response?.status === 401
        ? 'Invalid credentials'
        : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }

  };


  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#f0f2f5', // Optional background behind the card
      fontFamily: 'Arial, sans-serif'
    }}>
      
      {/* Login Card (Two Panel Layout) */}
      <div style={{
        display: 'flex',
        height: '75vh',
        width: '150vh',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        backgroundColor: 'white',
      }}>
        
        {/* Left Panel */}
        <div style={{
          flex: 1,
          background: 'linear-gradient(to bottom, #00338D, #0071ce)',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
        }}>
          <img
            src={`${process.env.PUBLIC_URL}/Cigna logo.png`}
            alt="Cigna Logo"
            style={{ height: '80px', marginBottom: '20px' }}
          />
          <h2>Welcome</h2>
          <p style={{ maxWidth: '300px', textAlign: 'center', marginTop: '20px' }}>
            Please log in with your authorized credentials.
          </p>
        </div>

        {/* Right Panel */}
        <div style={{
          flex: 1,
          backgroundColor: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '30px'
        }}>
          <form onSubmit={handleLogin} style={{
            width: '100%',
            maxWidth: '350px',
          }}>
            <h2 style={{ color: '#00338D', marginBottom: '20px' }}>Login to Your Account</h2>

            <label style={{ fontWeight: '600' }}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              style={{
                width: '100%',
                padding: '10px',
                margin: '0 0 20px 0',
                borderRadius: '6px',
                border: '1px solid #ccc',
                boxSizing: 'border-box',
              }}
            />

            <label style={{ fontWeight: '600' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '30px',
                borderRadius: '6px',
                border: '1px solid #ccc',
                boxSizing: 'border-box',
              }}
            />

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: isLoading ? '#ccc' : '#8BC53F',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '16px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'background 0.3s ease',
                boxSizing: 'border-box',
              }}
              onMouseOver={(e) => !isLoading && (e.target.style.backgroundColor = '#76a938')}
              onMouseOut={(e) => !isLoading && (e.target.style.backgroundColor = '#8BC53F')}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;