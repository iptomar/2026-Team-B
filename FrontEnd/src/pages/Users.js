import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Users.css';
import iptLogo from '../assets/IPT_LOGO.jpg';

const Users = () => {
	const [users, setUsers] = useState([]);
	const [roles, setRoles] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const navigate = useNavigate();

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
		if (!window.confirm('Are you sure you want to delete this user?')) return;

		try {
			const res = await fetch(`${apiUrl}/users/${id}`, { method: 'DELETE' });
			if (!res.ok) throw new Error('Failed to delete user');

			await fetchData();
		} catch (err) {
			alert(err.message);
		}
	};

	if (loading) return <div className="loading">Loading...</div>;

	return (
		<div className="users-page">
			<div className="users-container">
				<div className="header">
					<div style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
						<img src={iptLogo} alt="IPT Logo" style={{ height: '50px', margin: 0, padding: 0, objectFit: 'contain' }} />
						<h1>Users Management</h1>
					</div>
					<button className="btn-primary" onClick={openCreateModal}>+ Add User</button>
				</div>

				{error && !isModalOpen && <div className="error-alert">{error}</div>}

				<div className="table-wrapper">
					<table className="users-table">
						<thead>
							<tr>
								<th>Username</th>
								<th>Email</th>
								<th>Roles</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							{users.map(user => (
								<tr id={user._id} key={user._id}>
									<td>{user.username}</td>
									<td>{user.email}</td>
									<td>
										{user.roles && user.roles.length > 0 ? (
											user.roles.map(r => (
												<span key={r._id} className="role-badge" style={{ marginRight: '4px', display: 'inline-block', marginBottom: '2px' }}>{r.name}</span>
											))
										) : (
											<span className="role-badge">No Role</span>
										)}
									</td>
									<td>
										<div className="actions">
											<button className="btn-edit" onClick={() => openEditModal(user)}>Edit</button>
											<button className="btn-delete" onClick={() => handleDelete(user._id)}>Delete</button>
										</div>
									</td>
								</tr>
							))}
							{users.length === 0 && (
								<tr>
									<td colSpan="4" className="text-center">No users found.</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>

			{isModalOpen && (
				<div className="modal-overlay">
					<div className="modal">
						<h2>{modalMode === 'create' ? 'Create User' : 'Edit User'}</h2>
						{error && <div className="error-alert">{error}</div>}

						<form onSubmit={handleSubmit}>
							<div className="form-group">
								<label>Username</label>
								<input required type="text" name="username" value={formData.username} onChange={handleChange} />
							</div>
							<div className="form-group">
								<label>Email</label>
								<input required type="email" name="email" value={formData.email} onChange={handleChange} />
							</div>
							{modalMode === 'create' && (
								<div className="form-group">
									<label>Password</label>
									<input required type="password" name="password" value={formData.password} onChange={handleChange} />
								</div>
							)}
							<div className="form-group">
								<label>Roles</label>
								<select required multiple name="roles" value={formData.roles} onChange={handleRolesChange} style={{ height: '100px' }}>
									{roles.map(role => (
										<option id={role._id} key={role._id || role.name} value={role._id}>{role.name}</option>
									))}
								</select>
								<small style={{ display: 'block', marginTop: '4px', color: '#666' }}>Hold Ctrl/Cmd to select multiple roles.</small>
							</div>

							<div className="modal-actions">
								<button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
								<button type="submit" className="btn-primary">Save</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
};

export default Users;
