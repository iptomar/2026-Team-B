import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useLanguage } from '../contexts/LanguageContext';
import './AdminFormManagement.css';
import { getStorageItem } from '../utils/storage';

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_CLASSES = {
	submitted: 'afm-status-submitted',
	in_progress: 'afm-status-in-progress',
	approved: 'afm-status-approved',
	denied: 'afm-status-denied',
};

const SORTABLE_COLUMNS = [
	{ field: 'templateTitle', labelKey: 'formName' },
	{ field: 'submitterName', labelKey: 'submitter' },
	{ field: 'status', labelKey: 'status' },
	{ field: 'createdAt', labelKey: 'dateSubmitted' },
];

const DEFAULT_PAGE_SIZE = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
	if (!dateStr) return '—';
	return new Date(dateStr).toLocaleDateString(undefined, {
		year: 'numeric', month: 'short', day: 'numeric',
		hour: '2-digit', minute: '2-digit',
	});
}

// ─── Sort indicator component ─────────────────────────────────────────────────
function SortIndicator({ field, sorts, onToggle }) {
	const idx = sorts.findIndex(s => s.field === field);
	const order = idx >= 0 ? sorts[idx].order : null;

	const cycle = (e) => {
		e.stopPropagation();
		if (!order) {
			onToggle([{ field, order: 'asc' }, ...sorts]);
		} else if (order === 'asc') {
			const copy = [...sorts];
			copy[idx] = { field, order: 'desc' };
			onToggle(copy);
		} else {
			onToggle(sorts.filter(s => s.field !== field));
		}
	};

	return (
		<span
			className={`afm-sort-indicator ${order ? 'afm-sort-active' : ''}`}
			onClick={cycle}
			title={
				order === 'asc' ? 'Ascending — click for Descending'
					: order === 'desc' ? 'Descending — click to remove'
						: 'Click to sort ascending'
			}
		>
			<span className="afm-sort-icon">
				{order === 'desc' ? '▼' : order === 'asc' ? '▲' : '⇅'}
			</span>
			{idx >= 1 && <span className="afm-sort-priority">{idx + 1}</span>}
		</span>
	);
}

// ─── Pagination component ─────────────────────────────────────────────────────
function Pagination({ page, totalPages, total, pageSize, onPageChange, onPageSizeChange, t }) {
	const pages = [];
	const maxVisible = 5;
	let start = Math.max(1, page - Math.floor(maxVisible / 2));
	let end = Math.min(totalPages, start + maxVisible - 1);
	if (end - start + 1 < maxVisible) {
		start = Math.max(1, end - maxVisible + 1);
	}

	for (let i = start; i <= end; i++) {
		pages.push(i);
	}

	return (
		<div className="afm-pagination">
			<span className="afm-pagination-info">
				{t('page')} {page} {t('of')} {totalPages} ({total} {t('total')})
			</span>
			<div className="afm-pagination-btns">
				<button
					className="afm-page-btn"
					disabled={page <= 1}
					onClick={() => onPageChange(1)}
				>««</button>
				<button
					className="afm-page-btn"
					disabled={page <= 1}
					onClick={() => onPageChange(page - 1)}
				>«</button>
				{pages.map(p => (
					<button
						key={p}
						className={`afm-page-btn ${p === page ? 'afm-page-active' : ''}`}
						onClick={() => onPageChange(p)}
					>{p}</button>
				))}
				<button
					className="afm-page-btn"
					disabled={page >= totalPages}
					onClick={() => onPageChange(page + 1)}
				>»</button>
				<button
					className="afm-page-btn"
					disabled={page >= totalPages}
					onClick={() => onPageChange(totalPages)}
				>»»</button>
			</div>
			<div className="afm-page-size">
				<label>{t('pageSizeLabel') || 'Per page:'}</label>
				<select value={pageSize} onChange={e => onPageSizeChange(Number(e.target.value))}>
					{[5, 10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
				</select>
			</div>
		</div>
	);
}

// ─── Main Component ───────────────────────────────────────────────────────────
const AdminFormManagement = () => {
	const [user, setUser] = useState(null);
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [templates, setTemplates] = useState([]);

	// Filters
	const [filters, setFilters] = useState({
		templateId: '',
		status: '',
		submitterSearch: '',
		dateFrom: '',
		dateTo: '',
	});

	// Sort state: array of { field, order }
	const [sorts, setSorts] = useState([]);

	// Pagination
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
	const [totalPages, setTotalPages] = useState(0);
	const [total, setTotal] = useState(0);

	const navigate = useNavigate();
	const { t } = useLanguage();
	const searchTimer = useRef(null);

	// ── Admin guard ────────────────────────────────────────────────────────
	useEffect(() => {
		const storedUser = getStorageItem('user');
		if (storedUser) {
			const parsedUser = JSON.parse(storedUser);
			const isAdmin = parsedUser.roles?.some(r => r.name?.toLowerCase() === 'admin');
			if (!isAdmin) {
				navigate('/dashboard');
				return;
			}
			setUser(parsedUser);
		} else {
			navigate('/');
		}
	}, [navigate]);

	// ── Fetch templates for filter dropdown ─────────────────────────────────
	useEffect(() => {
		const fetchTemplates = async () => {
			try {
				const apiUrl = process.env.REACT_APP_API_URL || '';
				const res = await fetch(`${apiUrl}/formTemplates`);
				if (res.ok) {
					const data = await res.json();
					setTemplates(Array.isArray(data) ? data : []);
				}
			} catch { /* non-fatal */ }
		};
		fetchTemplates();
	}, []);

	// ── Fetch data ──────────────────────────────────────────────────────────
	const fetchData = useCallback(async () => {
		const token = getStorageItem('accessToken');
		if (!token) return;

		setLoading(true);
		setError(null);

		try {
			const apiUrl = process.env.REACT_APP_API_URL || '';
			const params = new URLSearchParams();
			params.set('page', page);
			params.set('limit', pageSize);

			if (filters.templateId) params.set('templateId', filters.templateId);
			if (filters.status) params.set('status', filters.status);
			if (filters.submitterSearch.trim()) params.set('submitterSearch', filters.submitterSearch.trim());
			if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
			if (filters.dateTo) params.set('dateTo', filters.dateTo);
			if (sorts.length > 0) params.set('sorts', JSON.stringify(sorts));

			const res = await fetch(`${apiUrl}/formSubmissions/admin?${params.toString()}`, {
				headers: { Authorization: `Bearer ${token}` },
			});

			if (res.ok) {
				const data = await res.json();
				setItems(data.items || []);
				setTotal(data.total || 0);
				setTotalPages(data.totalPages || 0);
			} else if (res.status === 403) {
				setError('Admin access required.');
			} else {
				setError('Failed to load submissions.');
			}
		} catch {
			setError('Network error. Please try again.');
		} finally {
			setLoading(false);
		}
	}, [page, pageSize, filters, sorts]);

	useEffect(() => {
		if (user) fetchData();
	}, [fetchData, user]);

	// ── Filter handlers ─────────────────────────────────────────────────────
	const handleFilterChange = (key, value) => {
		setFilters(prev => ({ ...prev, [key]: value }));
		setPage(1);
	};

	// Debounced submitter search — update display immediately, fetch after delay
	const handleSearchChange = (value) => {
		setFilters(prev => ({ ...prev, submitterSearch: value }));
		if (searchTimer.current) clearTimeout(searchTimer.current);
		searchTimer.current = setTimeout(() => {
			setPage(1);
		}, 500);
	};

	const handleSortToggle = (newSorts) => {
		setSorts(newSorts);
		setPage(1);
	};

	const handlePageChange = (newPage) => {
		setPage(newPage);
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	const handleClearFilters = () => {
		setFilters({
			templateId: '',
			status: '',
			submitterSearch: '',
			dateFrom: '',
			dateTo: '',
		});
		setSorts([]);
		setPage(1);
	};

	if (!user) return null;

	return (
		<div className="afm-container">
			<Navbar user={user} />

			<main className="afm-content">
				{/* ── Header ── */}
				<div className="afm-header-row">
					<div>
						<h1 className="afm-title">{t('formManagement') || 'Form Management'}</h1>
						<p className="afm-subtitle">
							{t('formManagementDesc') || 'View and manage all submitted forms across the system'}
						</p>
					</div>
					<div className="afm-count-badge">
						<span className="afm-count-number">{loading ? '…' : total}</span>
						<span className="afm-count-label">{t('totalSubmissions') || 'Total'}</span>
					</div>
				</div>

				{/* ── Filter Panel ── */}
				<div className="afm-filter-panel">
					<div className="afm-filter-row">
						<div className="afm-filter-group" style={{ flex: '0 0 300px', minWidth: 180 }}>
							<label className="afm-filter-label">{t('formType') || 'Form Type'}</label>
							<select
								className="afm-filter-select"
								value={filters.templateId}
								onChange={(e) => handleFilterChange('templateId', e.target.value)}
							>
								<option value="">{t('allForms') || 'All Forms'}</option>
								{templates.map(tpl => (
									<option key={tpl._id} value={tpl._id} title={tpl.title}>{tpl.title.length > 40 ? tpl.title.slice(0, 37) + '...' : tpl.title}</option>
								))}
							</select>
						</div>

						<div className="afm-filter-group">
							<label className="afm-filter-label">{t('status') || 'Status'}</label>
							<select
								className="afm-filter-select"
								value={filters.status}
								onChange={(e) => handleFilterChange('status', e.target.value)}
							>
								<option value="">{t('allStatuses')}</option>
								<option value="submitted">{t('statusSubmitted')}</option>
								<option value="in_progress">{t('statusInProgress')}</option>
								<option value="approved">{t('statusApproved')}</option>
								<option value="denied">{t('statusDenied')}</option>
							</select>
						</div>

						<div className="afm-filter-group">
							<label className="afm-filter-label">{t('submitter') || 'Submitter'}</label>
							<input
								type="text"
								className="afm-filter-input"
								placeholder={t('searchByNameOrEmail') || 'Search by name or email...'}
								value={filters.submitterSearch}
								onChange={(e) => handleSearchChange(e.target.value)}
							/>
						</div>
					</div>

					<div className="afm-filter-row">
						<div className="afm-filter-group">
							<label className="afm-filter-label">{t('dateFrom') || 'From Date'}</label>
							<input
								type="date"
								className="afm-filter-input"
								value={filters.dateFrom}
								onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
							/>
						</div>

						<div className="afm-filter-group">
							<label className="afm-filter-label">{t('dateTo') || 'To Date'}</label>
							<input
								type="date"
								className="afm-filter-input"
								value={filters.dateTo}
								onChange={(e) => handleFilterChange('dateTo', e.target.value)}
							/>
						</div>

						<div className="afm-filter-group afm-filter-actions">
							<button className="afm-btn-clear" onClick={handleClearFilters}>
								{t('clearFilters') || 'Clear Filters'}
							</button>
						</div>
					</div>
				</div>

				{/* ── Active sort indicators ── */}
				{sorts.length > 0 && (
					<div className="afm-active-sorts">
						<span className="afm-active-sorts-label">{t('sortingBy') || 'Sorting by'}:</span>
						{sorts.map((s, i) => {
							const col = SORTABLE_COLUMNS.find(c => c.field === s.field);
							return (
								<span key={s.field} className="afm-active-sort-tag">
									{col ? (t(col.labelKey) || col.labelKey) : s.field}
									{' '}
									{s.order === 'asc' ? '↑' : '↓'}
									{i < sorts.length - 1 && <span className="afm-sort-sep">, then</span>}
								</span>
							);
						})}
						<button className="afm-sort-clear" onClick={() => { setSorts([]); setPage(1); }}>
							✕ {t('clear') || 'Clear'}
						</button>
					</div>
				)}

				{/* ── Results ── */}
				{loading ? (
					<div className="afm-cards-list" style={{ marginTop: '1.5rem' }}>
						{[1, 2, 3].map(i => (
							<div key={i} className="afm-card" style={{ cursor: 'default' }}>
								<div className="afm-card-row-top" style={{ width: '100%' }}>
									<div className="skeleton-box skeleton-title" style={{ width: '45%', height: '1.25rem', margin: 0 }} />
									<div className="skeleton-box skeleton-text" style={{ width: '15%', height: '1.5rem', borderRadius: '12px' }} />
								</div>
								<div className="afm-card-row-bottom" style={{ width: '100%', marginTop: '0.8rem' }}>
									<div className="skeleton-box skeleton-text" style={{ width: '30%', height: '0.88rem', margin: 0 }} />
									<div className="skeleton-box skeleton-text" style={{ width: '20%', height: '0.88rem', margin: 0 }} />
								</div>
							</div>
						))}
					</div>
				) : error ? (
					<div className="afm-table-card">
						<div className="afm-error">{error}</div>
					</div>
				) : items.length === 0 ? (
					<div className="afm-table-card">
						<div className="afm-empty">
							<div className="afm-empty-icon">📋</div>
							<h3>{t('noSubmissionsFound') || 'No submissions found'}</h3>
							<p>{t('noSubmissionsFoundDesc') || 'Try adjusting your filters or check back later.'}</p>
							{(filters.templateId || filters.status || filters.submitterSearch || filters.dateFrom || filters.dateTo) && (
								<button className="afm-btn-clear" onClick={handleClearFilters}>
									{t('clearFilters') || 'Clear Filters'}
								</button>
							)}
						</div>
					</div>
				) : (
					<>
						<div className="afm-sort-bar">
							<span className="afm-sort-bar-label">{t('sortBy') || 'Sort by'}:</span>
							{SORTABLE_COLUMNS.map(col => (
								<button
									key={col.field}
									className="afm-sort-bar-btn"
									onClick={() => {
										const idx = sorts.findIndex(s => s.field === col.field);
										const order = idx >= 0 ? sorts[idx].order : null;
										if (!order) handleSortToggle([{ field: col.field, order: 'asc' }, ...sorts]);
										else if (order === 'asc') {
											const copy = [...sorts];
											copy[idx] = { field: col.field, order: 'desc' };
											handleSortToggle(copy);
										} else handleSortToggle(sorts.filter(s => s.field !== col.field));
									}}
								>
									<span>{t(col.labelKey) || col.labelKey}</span>
									<SortIndicator field={col.field} sorts={sorts} onToggle={handleSortToggle} />
								</button>
							))}
						</div>

						<div className="afm-cards-list">
							{items.map(item => (
								<div
									key={item._id}
									className="afm-card"
									onClick={() => navigate(`/submission/${item._id}`)}
								>
									<div className="afm-card-row-top">
										<span className="afm-card-title">{item.templateTitle || '—'}</span>
										<span className={`afm-status-badge ${STATUS_CLASSES[item.status] || ''}`}>
											{t(item.status === 'submitted' ? 'statusSubmitted'
												: item.status === 'in_progress' ? 'statusInProgress'
													: item.status === 'approved' ? 'statusApproved'
														: item.status === 'denied' ? 'statusDenied'
															: 'statusPending')}
										</span>
									</div>
									<div className="afm-card-row-bottom">
										<span className="afm-card-submitter">
											{item.submitterName || '—'}
											{item.submitterEmail && <span className="afm-card-submitter-email"> · {item.submitterEmail}</span>}
										</span>
										<span className="afm-card-date">{formatDate(item.createdAt)}</span>
									</div>
								</div>
							))}
						</div>

								<Pagination
									page={page}
									totalPages={totalPages}
									total={total}
									pageSize={pageSize}
									onPageChange={handlePageChange}
									onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
									t={t}
								/>
					</>
				)}
			</main>
		</div>
	);
};

export default AdminFormManagement;
