// LoginPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setPocid, getPocid } from './pocConfig';// Import poc from config.js

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

const handleLogin = (e) => {
  e.preventDefault();

  const normalized = username.replace(/\s+/g, ' ').trim();

  const loginState = {
    managerName: normalized.toLowerCase(),
    managerNameRaw: normalized
  };

  sessionStorage.setItem('loginState', JSON.stringify(loginState));

  if (normalized.toLowerCase() === 'leader' && password === '') {
    navigate('/client');
    } else if (username === 'agent' && password === '') {
  navigate('/agent');
     } else if (username === 'poc' && password === '') {
  navigate('/poc');
  setPocid('M132305');
  } else if (username === 'Onshore' && password === '') {
    setPocid(username);
    navigate('/poc');
  } else if (password === '') {
    console.log("Sending login state:", loginState);
    navigate('/teamlead', { state: loginState });
  
  } else {
    alert('Invalid credentials');
  }
};






  // const handleLogin = (e) => {
  //   e.preventDefault();
  //   if (username === 'client' && password === '') {
  //     navigate('/client');
  //   } else if (username === 'teamlead' && password === '') {
  //     navigate('/teamlead');
  //   } else {
  //     alert('Invalid credentials');
  //   }
  // };

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
                margin: '10px 0 20px',
                borderRadius: '6px',
                border: '1px solid #ccc',
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
              }}
            />

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#8BC53F',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'background 0.3s ease'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#76a938'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#8BC53F'}
            >
              Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
