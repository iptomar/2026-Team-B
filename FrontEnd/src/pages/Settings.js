import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import './Settings.css';

const Settings = () => {
	const [user, setUser] = useState(null);
	const [isEditingUsername, setIsEditingUsername] = useState(false);
	const [isEditingEmail, setIsEditingEmail] = useState(false);
	const [isEditingAvatar, setIsEditingAvatar] = useState(false);
	const [editedUsername, setEditedUsername] = useState('');
	const [editedEmail, setEditedEmail] = useState('');
	const [editedAvatar, setEditedAvatar] = useState('');
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
			setEditedAvatar(userData.avatarIcon || '');
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
			if (field === 'avatarIcon') payload.avatarIcon = editedAvatar;

			const apiUrl = process.env.REACT_APP_API_URL || '';
			const res = await fetch(`${apiUrl}/users/${user.id || user._id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			const data = await res.json();

			if (res.ok) {
				// Update local state and localStorage using the actual returned data from the server
				setUser(data);
				localStorage.setItem('user', JSON.stringify(data));

				setIsEditingUsername(false);
				setIsEditingEmail(false);
				setIsEditingAvatar(false);
				setSuccess(`${field === 'avatarIcon' ? 'Avatar icon' : field.charAt(0).toUpperCase() + field.slice(1)} updated successfully!`);
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

	const isAdmin = user.roles?.some(r => r.name?.toLowerCase() === 'admin');

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
						<div className="settings-item">
							<div className="item-info">
								<h3>User Icon</h3>
								{isEditingAvatar ? (
									<div className="edit-form">
										<div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
											<img
												src={editedAvatar || user.avatarIcon || require('../assets/default_user_avatar.jpg')}
												alt="Preview"
												style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #e2e8f0' }}
											/>
											<input
												type="file"
												accept="image/*"
												className="settings-input"
												style={{ padding: '8px' }}
												onChange={(e) => {
													const file = e.target.files[0];
													if (file) {
														const reader = new FileReader();
														reader.onloadend = () => setEditedAvatar(reader.result);
														reader.readAsDataURL(file);
													}
												}}
											/>
										</div>
										<div className="edit-actions">
											<button onClick={() => handleUpdateProfile('avatarIcon')} className="btn-save">Save</button>
											<button onClick={() => { setIsEditingAvatar(false); setEditedAvatar(user.avatarIcon || ''); }} className="btn-cancel">Cancel</button>
										</div>
									</div>
								) : (
									<div style={{ marginTop: '10px' }}>
										<img
											src={user.avatarIcon || require('../assets/default_user_avatar.jpg')}
											alt="User Icon"
											style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #e2e8f0' }}
										/>
									</div>
								)}
							</div>
							{!isEditingAvatar && (
								<button onClick={() => setIsEditingAvatar(true)} className="btn-edit-text">Edit</button>
							)}
						</div>
						{isAdmin && (
							<div className="settings-item">
								<div className="item-info">
									<h3>Roles</h3>
									<p>{user.roles?.map(r => r.name).join(', ') || 'User'}</p>
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
