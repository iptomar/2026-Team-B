import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import './PendingReviews.css';

const PendingReviews = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Placeholder — actual pending logic will be implemented later
  const pendingItems = [];

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('accessToken');

    if (!token || !userStr) {
      navigate('/');
      return;
    }

    try {
      setUser(JSON.parse(userStr));
    } catch (e) {
      navigate('/');
    }
  }, [navigate]);

  if (!user) return <div className="pr-loading">Loading...</div>;

  return (
    <div className="pr-container">
      <Navbar user={user} />

      <main className="pr-content">
        <div className="pr-header-row">
          <div>
            <button className="pr-back-btn" onClick={() => navigate('/dashboard')}>
              ← Back to Dashboard
            </button>
            <h1 className="pr-title">Pending Reviews &amp; Approvals</h1>
            <p className="pr-subtitle">Forms that are awaiting your review or approval action.</p>
          </div>
          <div className="pr-count-badge">
            <span className="pr-count-number">{pendingItems.length}</span>
            <span className="pr-count-label">Pending</span>
          </div>
        </div>

        <div className="pr-empty">
          <div className="pr-empty-icon">✅</div>
          <h3>All clear!</h3>
          <p>You have no pending reviews or approvals at this time.</p>
          <p className="pr-coming-soon">Pending review logic will be enabled in a future update.</p>
          <button className="pr-action-btn" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </main>
    </div>
  );
};

export default PendingReviews;
