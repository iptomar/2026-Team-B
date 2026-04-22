import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Navbar.css';

const Navbar = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/');
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  if (!user) return null;

  return (
    <nav className="common-nav">
      <div className="nav-container">
        <Link to="/dashboard" className="nav-brand">IPT Portal</Link>
        
        <div className="nav-right">
          <div className="user-info">
            <span className="user-greeting">Welcome, {user.username || user.email}</span>
          </div>

          <div className={`burger-menu ${isOpen ? 'open' : ''}`} onClick={toggleMenu} id="burger-menu">
            <div className="burger-line"></div>
            <div className="burger-line"></div>
            <div className="burger-line"></div>
          </div>

          {isOpen && (
            <div className="nav-dropdown" id="nav-dropdown">
              <Link to="/settings" className="dropdown-item" onClick={() => setIsOpen(false)}>
                <span className="item-icon">⚙️</span> Settings
              </Link>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item signout-item" onClick={handleSignOut}>
                <span className="item-icon">🚪</span> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
      {isOpen && <div className="menu-overlay" onClick={() => setIsOpen(false)}></div>}
    </nav>
  );
};

export default Navbar;
