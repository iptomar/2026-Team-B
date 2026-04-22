import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('accessToken');
    
    if (!token || !userStr) {
      navigate('/');
      return;
    }

    try {
      const userData = JSON.parse(userStr);
      setUser(userData);
      
      if (userData.role && userData.role.name) {
        setRole(userData.role.name.toLowerCase());
      }
    } catch (e) {
      console.error('Failed to parse user data');
      navigate('/');
    }
  }, [navigate]);

  const handleSignOut = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/');
  };

  if (!user) {
    return <div className="dashboard-loading">Loading...</div>;
  }

  const isAdmin = role === 'admin';

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="nav-brand">IPT Portal</div>
        <div className="nav-user">
          <span className="user-greeting">Welcome, {user.username || user.email}</span>
          <button className="btn-signout" onClick={handleSignOut}>Sign Out</button>
        </div>
      </nav>

      <main className="dashboard-content">
        <header className="dashboard-header">
          <h1>Dashboard</h1>
          <p>Select an option below to get started.</p>
        </header>

        {isAdmin && (
          <div className="dashboard-stats">
            <div className="stat-card">
              <div className="stat-value">0</div>
              <div className="stat-label">Forms to Review/Approve</div>
            </div>
          </div>
        )}

        <div className="dashboard-grid">
          {isAdmin ? (
            <>
              <Link to="/manage-users" className="action-card">
                <div className="card-icon">👥</div>
                <h3>User Management</h3>
                <p>Add, edit, or remove users and manage roles.</p>
              </Link>
              
              <Link to="/template-builder" className="action-card">
                <div className="card-icon">🏗️</div>
                <h3>Form Builder</h3>
                <p>Create and customize dynamic form templates.</p>
              </Link>

              <Link to="/manage-forms" className="action-card">
                <div className="card-icon">📁</div>
                <h3>Form Management</h3>
                <p>View and manage all submitted forms across the institution.</p>
              </Link>

              <Link to="/fill-forms" className="action-card">
                <div className="card-icon">📝</div>
                <h3>Form Filing</h3>
                <p>Fill out forms and submit requests on behalf of others.</p>
              </Link>
            </>
          ) : (
            <>
              <Link to="/my-forms" className="action-card">
                <div className="card-icon">📄</div>
                <h3>My Forms</h3>
                <p>View your submitted forms and check their approval status.</p>
              </Link>
              <Link to="/fill-forms" className="action-card">
                <div className="card-icon">✍️</div>
                <h3>New Request</h3>
                <p>Fill out a new form to request approvals.</p>
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
