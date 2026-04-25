import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import './Dashboard.css';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [templates, setTemplates] = useState([]);
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

    const fetchTemplates = async () => {
      try {
        const apiUrl = process.env.REACT_APP_API_URL || '';
        const res = await fetch(`${apiUrl}/formTemplates`);
        if (res.ok) {
          const data = await res.json();
          setTemplates(data);
        }
      } catch (err) {
        console.error("Failed to fetch templates", err);
      }
    };
    fetchTemplates();
  }, [navigate]);

  if (!user) {
    return <div className="dashboard-loading">Loading...</div>;
  }

  const isAdmin = role === 'admin';

  return (
    <div className="dashboard-container">
      <Navbar user={user} />

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

              <div onClick={() => setShowFormModal(true)} className="action-card" style={{ cursor: 'pointer' }}>
                <div className="card-icon">📝</div>
                <h3>Form Filing</h3>
                <p>Fill out forms and submit requests on behalf of others.</p>
              </div>
            </>
          ) : (
            <>
              <Link to="/my-forms" className="action-card">
                <div className="card-icon">📄</div>
                <h3>My Forms</h3>
                <p>View your submitted forms and check their approval status.</p>
              </Link>
              <div onClick={() => setShowFormModal(true)} className="action-card" style={{ cursor: 'pointer' }}>
                <div className="card-icon">✍️</div>
                <h3>New Request</h3>
                <p>Fill out a new form to request approvals.</p>
              </div>
            </>
          )}

        </div>
      </main>

      {/* Form Selection Modal */}
      {showFormModal && (
        <div className="dashboard-modal-overlay">
          <div className="dashboard-modal">
            <header className="dashboard-modal-header">
              <h2>Select a Form</h2>
              <button className="dashboard-modal-close" onClick={() => setShowFormModal(false)}>✕</button>
            </header>
            <div className="dashboard-modal-content">
              {templates.filter(t => {
                if (isAdmin) return true;
                const roles = t.allowedSubmitRoles || [];
                if (roles.length === 0) return false; // Or true, if empty means everyone. The plan said false.
                return roles.includes(user?.role?._id);
              }).length === 0 ? (
                <p className="no-forms-msg">No forms available for your role at this time.</p>
              ) : (
                <div className="form-list">
                  {templates.filter(t => {
                    if (isAdmin) return true;
                    const roles = t.allowedSubmitRoles || [];
                    if (roles.length === 0) return false;
                    return roles.includes(user?.role?._id);
                  }).map(t => (
                    <div 
                      key={t._id} 
                      className="form-list-item" 
                      onClick={() => navigate(`/fill-form/${t._id}`)}
                    >
                      <div className="form-list-info">
                        <h4>{t.title} <span className="form-version">v{t.version}</span></h4>
                        {t.description && <p>{t.description}</p>}
                      </div>
                      <div className="form-list-action">
                        <span>Fill →</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
