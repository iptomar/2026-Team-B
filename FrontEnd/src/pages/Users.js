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
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
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
			const token = getStorageItem('accessToken');
			const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
			const [usersRes, rolesRes] = await Promise.all([
				fetch(`${apiUrl}/users`, { headers: authHeaders }),
				fetch(`${apiUrl}/roles`, { headers: authHeaders })
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
			const token = getStorageItem('accessToken');
			const res = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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
			const token = getStorageItem('accessToken');
			const res = await fetch(`${apiUrl}/users/${id}`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {} });
			if (!res.ok) throw new Error('Failed to delete user');

			await fetchData();
		} catch (err) {
			alert(err.message);
		}
	};

	if (loading) {
		return (
			<div className="users-page">
				<div className="users-container">
					<Navbar user={loggedInUser} />
					<div className="users-page-header">
						<div className="skeleton-box skeleton-title" style={{ width: '30%', margin: 0 }} />
						<div className="skeleton-box skeleton-button" style={{ width: '120px', height: '2.5rem' }} />
					</div>
					<div className="users-card-list" style={{ marginTop: '2rem' }}>
						{[1, 2, 3].map(i => (
							<div key={i} className="user-card" style={{ cursor: 'default' }}>
								<div className="user-card-info" style={{ width: '60%' }}>
									<div className="skeleton-box skeleton-text" style={{ width: '40%', height: '1.25rem', marginBottom: '0.5rem' }} />
									<div className="skeleton-box skeleton-text" style={{ width: '50%', height: '0.88rem', marginBottom: '0.5rem' }} />
									<div className="skeleton-box skeleton-text" style={{ width: '20%', height: '1.1rem', borderRadius: '4px' }} />
								</div>
								<div className="user-card-actions" style={{ display: 'flex', gap: '0.5rem' }}>
									<div className="skeleton-box skeleton-button" style={{ width: '60px', height: '2.2rem' }} />
									<div className="skeleton-box skeleton-button" style={{ width: '60px', height: '2.2rem' }} />
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="users-page">
			<div className="users-container">
				<Navbar user={loggedInUser} />
				<div className="users-page-header">
					<h1>{t('usersManagementTitle')}</h1>
					<button className="btn-primary" onClick={openCreateModal}>{t('addUserBtn')}</button>
				</div>

				{error && !isModalOpen && <div className="error-toast-fixed">{error}</div>}

				<div className="users-card-list">
					{users.slice((page - 1) * pageSize, page * pageSize).map(user => (
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

				{/* Pagination */}
				{users.length > 0 && (() => {
					const totalPages = Math.ceil(users.length / pageSize);
					return (
						<div className="users-pagination">
							<div className="users-pagination-info">
								{t('showing')} {Math.min((page - 1) * pageSize + 1, users.length)}–{Math.min(page * pageSize, users.length)} {t('of')} {users.length}
							</div>
							<div className="users-pagination-btns">
								<button className="users-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
								{Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
									<button key={p} className={`users-page-btn${p === page ? ' users-page-active' : ''}`} onClick={() => setPage(p)}>{p}</button>
								))}
								<button className="users-page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
							</div>
							<div className="users-page-size">
								<label>{t('pageSizeLabel') || 'Per page:'}</label>
								<select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
									{[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
								</select>
							</div>
						</div>
					);
				})()}
			</div>

			{isModalOpen && (
				<div className="modal-overlay">
					<div className="modal">
						<h2>{modalMode === 'create' ? t('createUser') : t('editUser')}</h2>
						{error && <div className="error-toast-fixed">{error}</div>}

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
