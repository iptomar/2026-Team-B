import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './ChangePassword.css';

const ChangePassword = () => {
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [message, setMessage] = useState('');
	const [error, setError] = useState('');
	const navigate = useNavigate();
	const location = useLocation();

	// Extract token from URL (e.g., /reset-password?token=...)
	const queryParams = new URLSearchParams(location.search);
	const token = queryParams.get('token');

	const handleChangePassword = async (e) => {
		e.preventDefault();
		setError('');
		setMessage('');

		if (!token) {
			setError('Invalid or missing reset token.');
			return;
		}

		if (!newPassword || !confirmPassword) {
			setError('Please fill in all fields');
			return;
		}

		if (newPassword !== confirmPassword) {
			setError('New passwords do not match');
			return;
		}

		try {
			const apiUrl = process.env.REACT_APP_API_URL || '';
			
			// Reset Password Flow
			const res = await fetch(`${apiUrl}/auth/reset-password`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					token,
					newPassword
				})
			});

			const data = await res.json();

			if (res.ok) {
				setMessage('Password has been successfully reset! Redirecting to login...');
				setTimeout(() => navigate('/'), 3000);
			} else {
				setError(data.message || 'Failed to reset password');
			}
		} catch (err) {
			setError('Network error, could not connect to server.');
		}
	};

	return (
		<div className="change-password-container">
			<div className="change-password-card">
				<h2>Reset Password</h2>
				{error && <div className="error-message">{error}</div>}
				{message && <div className="success-message">{message}</div>}
				<form onSubmit={handleChangePassword}>
					<div className="input-group">
						<label htmlFor="newPassword">New Password</label>
						<input
							type="password"
							id="newPassword"
							value={newPassword}
							onChange={(e) => setNewPassword(e.target.value)}
							placeholder="Enter new password"
						/>
					</div>
					<div className="input-group">
						<label htmlFor="confirmPassword">Confirm New Password</label>
						<input
							type="password"
							id="confirmPassword"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							placeholder="Confirm new password"
						/>
					</div>
					<button type="submit" className="change-password-button">
						Reset Password
					</button>
					<button type="button" className="back-button" onClick={() => navigate(-1)}>Back</button>
				</form>
			</div>
		</div>
	);
};

export default ChangePassword;
