import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ChangePassword.css';

const ChangePassword = () => {
	const [currentPassword, setCurrentPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [message, setMessage] = useState('');
	const [error, setError] = useState('');
	const navigate = useNavigate();

	const handleChangePassword = async (e) => {
		e.preventDefault();
		setError('');
		setMessage('');

		if (!currentPassword || !newPassword || !confirmPassword) {
			setError('Please fill in all fields');
			return;
		}

		if (newPassword !== confirmPassword) {
			setError('New passwords do not match');
			return;
		}

		try {
			const accessToken = localStorage.getItem('accessToken');
			const res = await fetch(`http://localhost:5000/auth/reset-password`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${accessToken}`
				},
				body: JSON.stringify({
					token: `Bearer ${accessToken}`,
					newPassword: newPassword
				})
			});
			const data = await res.json();

			if (res.ok) {
				setMessage('Password successfully changed!');
				setTimeout(() => {
					navigate('/settings');
				}, 2000);
			} else {
				setError(data.message || 'Failed to change password');
			}
		} catch (err) {
			setError('Network error, could not connect to server.');
		}

		//test/simulation of password change: success
		//setMessage('Password successfully changed!');
		//setTimeout(() => {
		//	navigate('/settings');
		//}, 2000);
	};

	return (
		<div className="change-password-container">
			<div className="change-password-card">
				<h2>Change Password</h2>
				{error && <div className="error-message">{error}</div>}
				{message && <div className="success-message">{message}</div>}
				<form onSubmit={handleChangePassword}>
					<div className="input-group">
						<label htmlFor="currentPassword">Current Password</label>
						<input
							type="password"
							id="currentPassword"
							value={currentPassword}
							onChange={(e) => setCurrentPassword(e.target.value)}
							placeholder="Enter current password"
						/>
					</div>
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
					<button type="submit" className="change-password-button">Update Password</button>
					<button type="button" className="back-button" onClick={() => navigate(-1)}>Back</button>
				</form>
			</div>
		</div>
	);
};

export default ChangePassword;
