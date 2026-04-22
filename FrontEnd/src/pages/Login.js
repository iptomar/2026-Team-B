import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';
import iptLogo from '../assets/IPT_LOGO.jpg';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: username, password })
      });
      const data = await res.json();

      if (res.ok) {
        // Save the tokens and user data for future authenticated requests
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/dashboard');
      } else {
        setError(data.message || 'Invalid credentials');
      }
    } catch (err) {
      setError('Network error, could not connect to server.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <img src={iptLogo} alt="IPT Logo" style={{ height: '60px', marginBottom: '15px' }} />
        <h2>Welcome</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>
          <button type="submit" className="login-button">Sign In</button>
          <div style={{ marginTop: '15px', fontSize: '14px' }}>
            <Link to="/change-password" style={{ color: '#2f855a', textDecoration: 'none', fontWeight: '500' }}>Change Password?</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
