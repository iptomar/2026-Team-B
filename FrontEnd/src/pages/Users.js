import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import Navbar from '../components/Navbar';
import { getStorageItem } from '../utils/storage';
import './Users.css';

const Users = () => {
	const [users, setUsers] = useState([]);
	const [roles, setRoles] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const { t } = useLanguage();

	// Modal State
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
	const [currentUser, setCurrentUser] = useState(null);

	// Form State
	const [formData, setFormData] = useState({
		username: '',
		email: '',
		password: '',
		roles: []
	});

	const [loggedInUser, setLoggedInUser] = useState(null);
	useEffect(() => {
		const userStr = getStorageItem('user');
		if (userStr) {
			try { setLoggedInUser(JSON.parse(userStr)); } catch { }
		}
	}, []);

	const apiUrl = process.env.REACT_APP_API_URL || '';

	useEffect(() => {
		fetchData();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const fetchData = async () => {
		setLoading(true);
		try {
			const [usersRes, rolesRes] = await Promise.all([
				fetch(`${apiUrl}/users`),
				fetch(`${apiUrl}/roles`)
			]);

			if (!usersRes.ok || !rolesRes.ok) throw new Error('Failed to fetch data');

			const usersData = await usersRes.json();
			const rolesData = await rolesRes.json();

			setUsers(usersData);
			setRoles(rolesData);
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	const handleChange = (e) => {
		setFormData({ ...formData, [e.target.name]: e.target.value });
	};

	const handleRolesChange = (e) => {
		const options = Array.from(e.target.selectedOptions, option => option.value);
		setFormData({ ...formData, roles: options });
	};

	const openCreateModal = () => {
		setModalMode('create');
		setFormData({ username: '', email: '', password: '', roles: [] });
		setCurrentUser(null);
		setIsModalOpen(true);
	};

	const openEditModal = (user) => {
		setModalMode('edit');
		setFormData({
			username: user.username,
			email: user.email,
			password: '', // Leave blank, we don't update password here via the PUT endpoint right now
			roles: user.roles?.map(r => r._id) || []
		});
		setCurrentUser(user);
		setIsModalOpen(true);
	};

	const closeModal = () => {
		setIsModalOpen(false);
		setError(null);
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError(null);

		const url = modalMode === 'create' ? `${apiUrl}/users` : `${apiUrl}/users/${currentUser._id}`;
		const method = modalMode === 'create' ? 'POST' : 'PUT';

		// Build payload
		const payload = { ...formData };
		if (modalMode === 'edit') {
			delete payload.password; // Ignore password for edit
		}

		try {
			const res = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.message || 'Operation failed');
			}

			await fetchData();
			closeModal();
		} catch (err) {
			setError(err.message);
		}
	};

	const handleDelete = async (id) => {
		if (!window.confirm(t('confirmDeleteUser'))) return;

		try {
			const res = await fetch(`${apiUrl}/users/${id}`, { method: 'DELETE' });
			if (!res.ok) throw new Error('Failed to delete user');

			await fetchData();
		} catch (err) {
			alert(err.message);
		}
	};

	if (loading) return <div className="loading">{t('loading')}</div>;

	return (
		<div className="users-page">
			<div className="users-container">
				<Navbar user={loggedInUser} />
				<div className="users-page-header">
					<h1>{t('usersManagementTitle')}</h1>
					<button className="btn-primary" onClick={openCreateModal}>{t('addUserBtn')}</button>
				</div>

				{error && !isModalOpen && <div className="error-alert">{error}</div>}

				<div className="users-card-list">
					{users.map(user => (
						<div className="user-card" id={user._id} key={user._id}>
							<div className="user-card-info">
								<span className="user-card-name">{user.username}</span>
								<span className="user-card-email">{user.email}</span>
								<div className="user-card-roles">
									{user.roles && user.roles.length > 0 ? (
										user.roles.map(r => (
											<span key={r._id} className="role-badge">{r.name}</span>
										))
									) : (
										<span className="role-badge role-badge-none">{t('noRole')}</span>
									)}
								</div>
							</div>
							<div className="user-card-actions">
								<button className="btn-edit" onClick={() => openEditModal(user)}>{t('edit')}</button>
								<button className="btn-delete" onClick={() => handleDelete(user._id)}>{t('delete')}</button>
							</div>
						</div>
					))}
					{users.length === 0 && (
						<div className="user-card user-card-empty">{t('noUsersFound')}</div>
					)}
				</div>
			</div>

			{isModalOpen && (
				<div className="modal-overlay">
					<div className="modal">
						<h2>{modalMode === 'create' ? t('createUser') : t('editUser')}</h2>
						{error && <div className="error-alert">{error}</div>}

						<form onSubmit={handleSubmit}>
							<div className="form-group">
								<label>{t('username')}</label>
								<input required type="text" name="username" value={formData.username} onChange={handleChange} />
							</div>
							<div className="form-group">
								<label>{t('email')}</label>
								<input required type="email" name="email" value={formData.email} onChange={handleChange} />
							</div>
							{modalMode === 'create' && (
								<div className="form-group">
									<label>{t('password')}</label>
									<input required type="password" name="password" value={formData.password} onChange={handleChange} />
								</div>
							)}
							<div className="form-group">
								<label>{t('roles')}</label>
								<select required multiple name="roles" value={formData.roles} onChange={handleRolesChange} style={{ height: '100px' }}>
									{roles.map(role => (
										<option id={role._id} key={role._id || role.name} value={role._id}>{role.name}</option>
									))}
								</select>
								<small style={{ display: 'block', marginTop: '4px', color: 'var(--color-text-muted)' }}>{t('holdCtrlMultipleRoles')}</small>
							</div>

							<div className="modal-actions">
								<button type="button" className="btn-secondary" onClick={closeModal}>{t('cancel')}</button>
								<button type="submit" className="btn-primary">{t('save')}</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
};

export default Users;
