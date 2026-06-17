import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import Navbar from '../components/Navbar';
import { getStorageItem } from '../utils/storage';
import { LANGUAGES } from '../components/LanguageSelector';
import { getLocalizedName } from '../utils/localization';
import './Users.css';
import './Users.css';

const LazyAvatar = ({ user }) => {
	const [avatarUrl, setAvatarUrl] = useState(null);

	useEffect(() => {
		if (!user || !user.avatarIcon) {
			setAvatarUrl('👤');
			return;
		}

		if (user.avatarIcon.startsWith('data:image') || user.avatarIcon.startsWith('http') || user.avatarIcon === '👤') {
			setAvatarUrl(user.avatarIcon);
		} else if (user.avatarIcon.startsWith('avatars/')) {
			const fetchSas = async () => {
				try {
					const apiUrl = process.env.REACT_APP_API_URL || '';
					const res = await fetch(`${apiUrl}/users/${user._id}/avatar/sas`);
					if (res.ok) {
						const data = await res.json();
						setAvatarUrl(data.url);
					} else {
						setAvatarUrl('👤');
					}
				} catch {
					setAvatarUrl('👤');
				}
			};
			fetchSas();
		} else {
			setAvatarUrl('👤');
		}
	}, [user]);

	if (!avatarUrl) {
		return <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--color-divider)' }} className="skeleton-pulse" />;
	}

	if (avatarUrl === '👤') {
		return <span style={{ fontSize: '32px' }}>{avatarUrl}</span>;
	}

	return <img src={avatarUrl} alt="Avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />;
};

const Users = () => {
	const [activeTab, setActiveTab] = useState('users'); // 'users', 'roles', 'units'
	const [users, setUsers] = useState([]);
	const [roles, setRoles] = useState([]);
	const [units, setUnits] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [filterRole, setFilterRole] = useState('');
	const [filterUnit, setFilterUnit] = useState('');
	const { t, language } = useLanguage();

	// Modal State
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
	const [currentItem, setCurrentItem] = useState(null);

	// Form State
	const [formData, setFormData] = useState({
		username: '', email: '', password: '', roles: [], units: [],
		name: '', description: '', translations: {} // For Role/Unit
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
			const [usersRes, rolesRes, unitsRes] = await Promise.all([
				fetch(`${apiUrl}/users`, { headers: authHeaders }),
				fetch(`${apiUrl}/roles`, { headers: authHeaders }),
				fetch(`${apiUrl}/units`, { headers: authHeaders })
			]);

			if (!usersRes.ok || !rolesRes.ok || !unitsRes.ok) throw new Error('Failed to fetch data');

			setUsers(await usersRes.json());
			setRoles(await rolesRes.json());
			setUnits(await unitsRes.json());
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
	const handleMultiSelectChange = (e) => {
		const options = Array.from(e.target.selectedOptions, option => option.value);
		setFormData({ ...formData, [e.target.name]: options });
	};
	const handleTranslationChange = (lang, value) => {
		setFormData(prev => ({
			...prev,
			translations: { ...prev.translations, [lang]: value }
		}));
	};

	const openModal = (mode, item = null) => {
		setModalMode(mode);
		setCurrentItem(item);
		if (activeTab === 'users') {
			setFormData({
				username: item ? item.username : '',
				email: item ? item.email : '',
				password: '',
				roles: item ? (item.roles?.map(r => r._id) || []) : [],
				units: item ? (item.units?.map(u => u._id) || []) : []
			});
		} else {
			setFormData({
				name: item ? item.name : '',
				description: item ? item.description : '',
				translations: item && item.translations ? { ...item.translations } : {}
			});
		}
		setIsModalOpen(true);
	};

	const closeModal = () => {
		setIsModalOpen(false);
		setError(null);
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError(null);

		let url = '';
		let method = modalMode === 'create' ? 'POST' : 'PUT';

		if (activeTab === 'users') url = modalMode === 'create' ? `${apiUrl}/users` : `${apiUrl}/users/${currentItem._id}`;
		else if (activeTab === 'roles') url = modalMode === 'create' ? `${apiUrl}/roles` : `${apiUrl}/roles/${currentItem._id}`;
		else if (activeTab === 'units') url = modalMode === 'create' ? `${apiUrl}/units` : `${apiUrl}/units/${currentItem._id}`;

		const payload = { ...formData };
		if (activeTab === 'users' && modalMode === 'edit') delete payload.password;
		if (activeTab !== 'users') {
			delete payload.username; delete payload.email; delete payload.password; delete payload.roles; delete payload.units;
		}

		try {
			const token = getStorageItem('accessToken');
			const res = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
				body: JSON.stringify(payload)
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.message || 'Operation failed');
			await fetchData();
			closeModal();
		} catch (err) { setError(err.message); }
	};

	const handleDelete = async (id) => {
		if (!window.confirm(t('confirmDeleteUser') || 'Are you sure you want to delete this?')) return;
		try {
			const token = getStorageItem('accessToken');
			let endpoint = activeTab;
			// Roles use soft-delete endpoint in the backend
			if (activeTab === 'roles') endpoint = 'roles/' + id + '/soft-delete';
			else endpoint = activeTab + '/' + id;

			const res = await fetch(`${apiUrl}/${endpoint}`, { method: activeTab === 'roles' ? 'POST' : 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {} });
			if (!res.ok) throw new Error('Failed to delete');
			await fetchData();
		} catch (err) { alert(err.message); }
	};

	const handleRemoveAvatar = async (id) => {
		if (!window.confirm('Are you sure you want to remove this user\'s avatar?')) return;
		try {
			const token = getStorageItem('accessToken');
			const apiUrl = process.env.REACT_APP_API_URL || '';
			const res = await fetch(`${apiUrl}/users/${id}/avatar`, {
				method: 'DELETE',
				headers: token ? { Authorization: `Bearer ${token}` } : {}
			});
			if (!res.ok) throw new Error('Failed to remove avatar');
			
			// Optimistically update currentItem and users list
			setCurrentItem(prev => ({ ...prev, avatarIcon: '👤' }));
			setUsers(prev => prev.map(u => u._id === id ? { ...u, avatarIcon: '👤' } : u));
			
			alert('Avatar removed successfully.');
		} catch (err) {
			alert(err.message);
		}
	};

	const renderList = (items) => {
		let filteredItems = items;
		if (activeTab === 'users') {
			if (filterRole) {
				filteredItems = filteredItems.filter(u => u.roles?.some(r => r._id === filterRole));
			}
			if (filterUnit) {
				filteredItems = filteredItems.filter(u => u.units?.some(un => un._id === filterUnit));
			}
		}
		const paginated = filteredItems.slice((page - 1) * pageSize, page * pageSize);
		return (
			<>
				{activeTab === 'users' && (
					<div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
						<select className="fb-select" style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--color-border)' }} value={filterRole} onChange={e => { setFilterRole(e.target.value); setPage(1); }}>
							<option value="">{t('allRoles') || 'All Roles'}</option>
							{roles.map(r => <option key={r._id} value={r._id}>{getLocalizedName(r, language)}</option>)}
						</select>
						<select className="fb-select" style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--color-border)' }} value={filterUnit} onChange={e => { setFilterUnit(e.target.value); setPage(1); }}>
							<option value="">{t('allUnits') || 'All Units'}</option>
							{units.map(u => <option key={u._id} value={u._id}>{getLocalizedName(u, language)}</option>)}
						</select>
					</div>
				)}
				<div className="users-card-list">
					{paginated.map(item => (
						<div className="user-card" key={item._id}>
							<div className="user-card-info">
								<span className="user-card-name" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
									{activeTab === 'users' && <LazyAvatar user={item} />}
									{activeTab === 'users' ? item.username : item.name}
								</span>
								{activeTab === 'users' && (
									<>
										<p><strong>{t('username') || 'Username'}:</strong> {item.username}</p>
										<p><strong>{t('email') || 'Email'}:</strong> {item.email}</p>
										<div className="users-card-roles">
											{item.roles && item.roles.length > 0 ? item.roles.map(r => <span key={r._id} className="role-badge">{getLocalizedName(r, language)}</span>) : <span className="role-badge role-badge-none">{t('noRole')}</span>}
											{item.units && item.units.length > 0 ? item.units.map(u => <span key={u._id} className="role-badge" style={{ backgroundColor: 'var(--color-primary)' }}>{getLocalizedName(u, language)}</span>) : null}
										</div>
									</>
								)}
								{activeTab !== 'users' && (
									<>
										<h3>{getLocalizedName(item, language)}</h3>
										<p>{item.description}</p>
									</>
								)}
							</div>
							<div className="user-card-actions">
								<button className="btn-edit" onClick={() => openModal('edit', item)}>{t('edit')}</button>
								<button className="btn-delete" onClick={() => handleDelete(item._id)}>{t('delete')}</button>
							</div>
						</div>
					))}
					{filteredItems.length === 0 && <div className="user-card user-card-empty">{activeTab === 'users' ? (t('noUsersFound') || 'No users found.') : activeTab === 'roles' ? (t('noRolesFound') || 'No roles found.') : (t('noUnitsFound') || 'No units found.')}</div>}
				</div>
				{filteredItems.length > 0 && (
					<div className="users-pagination">
						<div className="users-pagination-info">
							{t('showing')} {Math.min((page - 1) * pageSize + 1, filteredItems.length)}–{Math.min(page * pageSize, filteredItems.length)} {t('of')} {filteredItems.length}
						</div>
						<div className="users-pagination-btns">
							<button className="users-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
							{Array.from({ length: Math.ceil(filteredItems.length / pageSize) }, (_, i) => i + 1).map(p => (
								<button key={p} className={`users-page-btn${p === page ? ' users-page-active' : ''}`} onClick={() => setPage(p)}>{p}</button>
							))}
							<button className="users-page-btn" disabled={page >= Math.ceil(filteredItems.length / pageSize)} onClick={() => setPage(p => p + 1)}>›</button>
						</div>
						<div className="users-page-size">
							<label>{t('pageSizeLabel') || 'Per page:'}</label>
							<select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
								{[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
							</select>
						</div>
					</div>
				)}
			</>
		);
	};

	return (
		<div className="dashboard-container">
			<Navbar user={loggedInUser} />
			<div className="users-container" style={{ maxWidth: '1000px', margin: '0 auto', marginTop: '20px' }}>
				<div className="users-page-header">
					<h1>{t('accessManagementTitle') || 'Access Management'}</h1>
					<button className="btn-primary" onClick={() => openModal('create')}>+ {t('add') || 'Add'}</button>
				</div>

				<div className="users-tabs" style={{ display: 'flex', gap: '20px', marginBottom: '20px', borderBottom: '1px solid var(--color-divider)' }}>
					{['users', 'roles', 'units'].map(tab => (
						<div 
							key={tab} 
							onClick={() => { setActiveTab(tab); setPage(1); }}
							style={{ 
								padding: '10px 0', 
								cursor: 'pointer', 
								fontWeight: activeTab === tab ? 'bold' : 'normal',
								color: activeTab === tab ? 'var(--color-accent-light)' : 'var(--color-text-secondary)',
								borderBottom: activeTab === tab ? '2px solid var(--color-accent-light)' : '2px solid transparent',
								textTransform: 'capitalize'
							}}
						>
							{t(tab) || tab}
						</div>
					))}
				</div>

				{error && !isModalOpen && <div className="error-toast-fixed">{error}</div>}

				{loading ? (
					<div className="users-card-list">
						{[1, 2, 3].map(i => (
							<div key={i} className="user-card" style={{ cursor: 'default' }}>
								<div className="user-card-info" style={{ width: '60%' }}>
									<div className="skeleton-box skeleton-text" style={{ width: '40%', height: '1.25rem', marginBottom: '0.5rem' }} />
									<div className="skeleton-box skeleton-text" style={{ width: '50%', height: '0.88rem', marginBottom: '0.5rem' }} />
								</div>
							</div>
						))}
					</div>
				) : (
					renderList(activeTab === 'users' ? users : activeTab === 'roles' ? roles : units)
				)}
			</div>

			{isModalOpen && (
				<div className="modal-overlay">
					<div className="modal">
						<h2>{modalMode === 'create' ? t('create') || 'Create' : t('edit') || 'Edit'}</h2>
						{error && <div className="error-toast-fixed">{error}</div>}

						<form onSubmit={handleSubmit}>
							{activeTab === 'users' ? (
								<>
									{modalMode === 'edit' && currentItem && (
										<div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
											<div style={{ transform: 'scale(1.5)', transformOrigin: 'left center' }}>
												<LazyAvatar user={currentItem} />
											</div>
											{currentItem.avatarIcon && currentItem.avatarIcon !== '👤' && (
												<button 
													type="button" 
													className="btn-delete" 
													onClick={() => handleRemoveAvatar(currentItem._id)}
													style={{ padding: '6px 12px', fontSize: '0.85rem' }}
												>
													Remove Avatar
												</button>
											)}
										</div>
									)}
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
										<select multiple name="roles" value={formData.roles} onChange={handleMultiSelectChange} style={{ height: '100px' }}>
											{roles.map(role => <option key={role._id} value={role._id}>{role.name}</option>)}
										</select>
										<small style={{ display: 'block', marginTop: '4px', color: 'var(--color-text-muted)' }}>{t('holdCtrlMultipleRoles')}</small>
									</div>
									<div className="form-group">
										<label>{t('units') || 'Units'}</label>
										<select multiple name="units" value={formData.units} onChange={handleMultiSelectChange} style={{ height: '100px' }}>
											{units.map(unit => <option key={unit._id} value={unit._id}>{unit.name}</option>)}
										</select>
									</div>
								</>
							) : (
								<>
									<div className="form-group">
										<label>{t('name') || 'Name'} (Default/English)</label>
										<input required type="text" name="name" value={formData.name} onChange={handleChange} />
									</div>
									<div className="form-group">
										<label>{t('description') || 'Description'}</label>
										<input type="text" name="description" value={formData.description} onChange={handleChange} />
									</div>

								</>
							)}

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
