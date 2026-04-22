import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import './Settings.css';

const Settings = () => {
  const [user, setUser] = useState(null);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [editedUsername, setEditedUsername] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
      setEditedUsername(userData.username || '');
      setEditedEmail(userData.email || '');
    } catch (e) {
      console.error('Failed to parse user data');
      navigate('/');
    }
  }, [navigate]);

  const handleUpdateProfile = async (field) => {
    setError('');
    setSuccess('');

    try {
      const payload = {};
      if (field === 'username') payload.username = editedUsername;
      if (field === 'email') payload.email = editedEmail;

      const res = await fetch(`http://localhost:5000/users/${user.id || user._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        // Update local state and localStorage
        const updatedUser = { ...user, ...payload };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        setIsEditingUsername(false);
        setIsEditingEmail(false);
        setSuccess(`${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully!`);
      } else {
        setError(data.message || 'Failed to update profile');
      }
    } catch (err) {
      setError('Network error, could not connect to server.');
    }
  };

  if (!user) {
    return <div className="settings-loading">Loading...</div>;
  }

  const isAdmin = user.role?.name?.toLowerCase() === 'admin';

  return (
    <div className="settings-container">
      <Navbar user={user} />

      <main className="settings-content">
        <header className="settings-header">
          <h1>Account Settings</h1>
          <p>Manage your account preferences and security.</p>
          {error && <div className="error-alert">{error}</div>}
          {success && <div className="success-alert">{success}</div>}
        </header>

        <section className="settings-section">
          <h2>Security</h2>
          <div className="settings-card">
            <div className="settings-item">
              <div className="item-info">
                <h3>Change Password</h3>
                <p>Update your password to keep your account secure.</p>
              </div>
              <Link to="/change-password" title="Change Password" id="change-password-link" className="btn-settings-action">Change Password</Link>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h2>Profile Information</h2>
          <div className="settings-card">
            <div className="settings-item">
              <div className="item-info">
                <h3>Username</h3>
                {isEditingUsername ? (
                  <div className="edit-form">
                    <input 
                      type="text" 
                      value={editedUsername} 
                      onChange={(e) => setEditedUsername(e.target.value)}
                      className="settings-input"
                    />
                    <div className="edit-actions">
                      <button onClick={() => handleUpdateProfile('username')} className="btn-save">Save</button>
                      <button onClick={() => { setIsEditingUsername(false); setEditedUsername(user.username); }} className="btn-cancel">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <p>{user.username || 'Not set'}</p>
                )}
              </div>
              {!isEditingUsername && (
                <button onClick={() => setIsEditingUsername(true)} className="btn-edit-text">Edit</button>
              )}
            </div>
            <div className="settings-item">
              <div className="item-info">
                <h3>Email Address</h3>
                {isEditingEmail ? (
                  <div className="edit-form">
                    <input 
                      type="email" 
                      value={editedEmail} 
                      onChange={(e) => setEditedEmail(e.target.value)}
                      className="settings-input"
                    />
                    <div className="edit-actions">
                      <button onClick={() => handleUpdateProfile('email')} className="btn-save">Save</button>
                      <button onClick={() => { setIsEditingEmail(false); setEditedEmail(user.email); }} className="btn-cancel">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <p>{user.email}</p>
                )}
              </div>
              {!isEditingEmail && (
                <button onClick={() => setIsEditingEmail(true)} className="btn-edit-text">Edit</button>
              )}
            </div>
            {isAdmin && (
              <div className="settings-item">
                <div className="item-info">
                  <h3>Role</h3>
                  <p>{user.role?.name || 'User'}</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Settings;
