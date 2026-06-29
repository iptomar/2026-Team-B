import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import Navbar from '../components/Navbar';
import './FillForm.css';
import { getStorageItem } from '../utils/storage';

// ─── Style Helper ──────────────────────────────────────────────────────────────
function buildStyle(styleObj) {
	if (!styleObj) return {};
	const s = {};
	if (styleObj.bold) s.fontWeight = 'bold';
	if (styleObj.italic) s.fontStyle = 'italic';
	if (styleObj.color) s.color = styleObj.color;
	if (styleObj.fontFamily) s.fontFamily = styleObj.fontFamily;
	if (styleObj.fontSize) s.fontSize = styleObj.fontSize;
	return s;
}

// ─── Dependent (cascading) dropdowns ───────────────────────────────────────────
// One select per level (e.g. Degree → Programme → Subject). Each select's options
// are the children of the value chosen in the level above. Depth is driven by the
// dataset, so the same field works for 2, 3 or more levels.
function dropdownDepth(nodes) {
	if (!Array.isArray(nodes) || nodes.length === 0) return 0;
	return 1 + Math.max(...nodes.map(n => dropdownDepth(n.children)));
}

function DependentDropdown({ field, value, onChange, numPrefix, req }) {
	const { t } = useLanguage();
	const [dataset, setDataset] = useState(null);
	const selections = Array.isArray(value) ? value : [];

	useEffect(() => {
		if (!field.datasetKey) { setDataset(null); return; }
		const apiUrl = process.env.REACT_APP_API_URL || '';
		const token = getStorageItem('accessToken');
		fetch(`${apiUrl}/cascadingData/${field.datasetKey}`, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
			.then(r => (r.ok ? r.json() : null))
			.then(d => setDataset(d && Array.isArray(d.items) ? d : null))
			.catch(() => { });
	}, [field.datasetKey]);

	const items = dataset?.items || [];
	const levelLabels = (dataset?.levelLabels?.length ? dataset.levelLabels : (field.levelLabels || []));
	const levelCount = levelLabels.length || dropdownDepth(items);
	const subLabelStyle = { fontSize: '0.85rem', color: 'var(--color-text-secondary)' };

	// Nodes available at a given level, following the selections made above it.
	const nodesAtLevel = (level) => {
		let nodes = items;
		for (let i = 0; i < level; i++) {
			const node = nodes.find(n => n.value === selections[i]);
			if (!node || !node.children) return [];
			nodes = node.children;
		}
		return nodes;
	};

	// Selecting a level keeps choices above it and clears everything below.
	const selectLevel = (level, val) => {
		const next = selections.slice(0, level);
		next[level] = val;
		onChange(field.id, next);
	};

	return (
		<div className="ff-field-wrapper">
			<label className="ff-label" style={buildStyle(field.labelStyle)}>{numPrefix}{field.label}{req}</label>
			<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
				{Array.from({ length: levelCount }).map((_, level) => {
					const options = nodesAtLevel(level);
					const disabled = level > 0 && !selections[level - 1];
					return (
						<React.Fragment key={level}>
							{levelLabels[level] && <span style={subLabelStyle}>{levelLabels[level]}</span>}
							<select
								className="ff-select"
								value={selections[level] || ''}
								required={field.required}
								disabled={disabled}
								style={buildStyle(field.contentStyle)}
								onChange={e => selectLevel(level, e.target.value)}
							>
								<option value="" disabled>{t('selectAnOption')}</option>
								{options.map((n, i) => <option key={i} value={n.value}>{n.value}</option>)}
							</select>
						</React.Fragment>
					);
				})}
			</div>
		</div>
	);
}

// A single dropdown that is one level of a cascade placed as its own field.
// It finds the fields for the levels above it (same data source, via cascadeMap)
// and shows only the children of their current selections.
function LinkedDropdown({ field, value, onChange, numPrefix, req, formData, cascadeMap }) {
	const { t } = useLanguage();
	const [dataset, setDataset] = useState(null);
	const level = field.level || 0;

	useEffect(() => {
		if (!field.datasetKey) { setDataset(null); return; }
		const apiUrl = process.env.REACT_APP_API_URL || '';
		const token = getStorageItem('accessToken');
		fetch(`${apiUrl}/cascadingData/${field.datasetKey}`, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
			.then(r => (r.ok ? r.json() : null))
			.then(d => setDataset(d && Array.isArray(d.items) ? d : null))
			.catch(() => { });
	}, [field.datasetKey]);

	const items = dataset?.items || [];
	const group = (cascadeMap && cascadeMap[field.datasetKey]) || {};

	// Walk down the tree using the picks made in the levels above this one.
	let nodes = items;
	let broken = false;
	for (let i = 0; i < level; i++) {
		const ancestorId = group[i];
		const ancestorVal = ancestorId ? (formData || {})[ancestorId] : undefined;
		const node = nodes.find(n => n.value === ancestorVal);
		if (!node || !node.children) { broken = true; nodes = []; break; }
		nodes = node.children;
	}
	const options = nodes;
	const optionKey = options.map(n => n.value).join('|');

	// If an upstream pick changed and the stored value is no longer valid, clear it.
	useEffect(() => {
		if (value && !options.some(n => n.value === value)) onChange(field.id, '');
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [optionKey]);

	return (
		<div className="ff-field-wrapper">
			<label className="ff-label" style={buildStyle(field.labelStyle)}>{numPrefix}{field.label}{req}</label>
			<select
				className="ff-select"
				value={value || ''}
				required={field.required}
				disabled={level > 0 && broken}
				style={buildStyle(field.contentStyle)}
				onChange={e => onChange(field.id, e.target.value)}
			>
				<option value="" disabled>{t('selectAnOption')}</option>
				{options.map((n, i) => <option key={i} value={n.value}>{n.value}</option>)}
			</select>
		</div>
	);
}

// ─── Field Renderer ───────────────────────────────────────────────────────────
function FieldRenderer({ field, value, onChange, number, numberingMap, formData: formDataProp, cascadeMap }) {
	const req = field.required ? <span className="ff-req">*</span> : null;
	const { t } = useLanguage();
	const numPrefix = number ? <span style={{ fontWeight: 700, marginRight: '6px', color: 'var(--color-accent, #059669)' }}>{number}.</span> : null;

	const handleChange = (e) => {
		onChange(field.id, e.target.value);
	};

	const handleCheckbox = (option) => {
		const current = Array.isArray(value) ? value : [];
		if (current.includes(option)) {
			onChange(field.id, current.filter(o => o !== option));
		} else {
			onChange(field.id, [...current, option]);
		}
	};

	switch (field.type) {
		case "heading": {
			const sz = { h1: "28px", h2: "22px", h3: "18px" }[field.level] || "22px";
			return <div className="ff-heading" style={{ fontSize: sz, ...buildStyle(field.labelStyle) }}>{numPrefix}{field.label}</div>;
		}
		case "label":
			return <p className="ff-p" style={buildStyle(field.labelStyle)}>{numPrefix}{field.label}</p>;
		case "text":
		case "email":
		case "number":
			return (
				<div className="ff-field-wrapper">
					<label className="ff-label" style={buildStyle(field.labelStyle)}>{numPrefix}{field.label}{req}</label>
					<input
						type={field.type}
						placeholder={field.placeholder}
						className="ff-input"
						value={value || ''}
						onChange={handleChange}
						required={field.required}
						min={field.min}
						max={field.max}
						style={buildStyle(field.contentStyle)}
					/>
				</div>
			);
		case "date":
			if (field.dateFormat === 'MY') {
				const [y, m] = (value || '').split('-');
				return (
					<div className="ff-field-wrapper">
						<label className="ff-label" style={buildStyle(field.labelStyle)}>{numPrefix}{field.label}{req}</label>
						<div style={{ display: 'flex', gap: '8px' }}>
							<select className="ff-select" value={m || ''} onChange={e => {
								const mm = e.target.value;
								const yy = y || new Date().getFullYear().toString();
								onChange(field.id, `${yy}-${mm}`);
							}} style={buildStyle(field.contentStyle)}>
								<option value="" disabled>Month</option>
								{['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(mo =>
									<option key={mo} value={mo}>{new Date(2000, parseInt(mo) - 1).toLocaleString('default', { month: 'long' })}</option>
								)}
							</select>
							<input type="number" className="ff-input" placeholder="YYYY" value={y || ''} min="1900" max="2100"
								onChange={e => {
									const yy = e.target.value;
									const mm = m || '01';
									onChange(field.id, yy ? `${yy}-${mm || '01'}` : '');
								}} style={{ ...buildStyle(field.contentStyle), width: '100px' }} />
						</div>
					</div>
				);
			}
			if (field.dateFormat === 'Y') {
				return (
					<div className="ff-field-wrapper">
						<label className="ff-label" style={buildStyle(field.labelStyle)}>{numPrefix}{field.label}{req}</label>
						<input type="number" className="ff-input" placeholder="YYYY" value={value || ''} min="1900" max="2100"
							onChange={handleChange} style={buildStyle(field.contentStyle)} />
					</div>
				);
			}
			return (
				<div className="ff-field-wrapper">
					<label className="ff-label" style={buildStyle(field.labelStyle)}>{numPrefix}{field.label}{req}</label>
					<input
						type="date"
						placeholder={field.placeholder}
						className="ff-input"
						value={value || ''}
						onChange={handleChange}
						required={field.required}
						min={field.min}
						max={field.max}
						style={buildStyle(field.contentStyle)}
					/>
				</div>
			);
		case "textarea":
			return (
				<div className="ff-field-wrapper">
					<label className="ff-label" style={buildStyle(field.labelStyle)}>{numPrefix}{field.label}{req}</label>
					<textarea
						placeholder={field.placeholder}
						rows={field.rows || 3}
						className="ff-textarea"
						style={{ resize: "vertical", ...buildStyle(field.contentStyle) }}
						value={value || ''}
						onChange={handleChange}
						required={field.required}
					/>
				</div>
			);
		case "dropdown":
			return (
				<div className="ff-field-wrapper">
					<label className="ff-label" style={buildStyle(field.labelStyle)}>{numPrefix}{field.label}{req}</label>
					<select className="ff-select" value={value || ''} onChange={handleChange} required={field.required} style={buildStyle(field.contentStyle)}>
						<option value="" disabled>{t('selectAnOption')}</option>
						{field.options?.map((o, i) => <option key={i} value={o}>{o}</option>)}
					</select>
				</div>
			);
		case "dependentDropdown":
			return <DependentDropdown field={field} value={value} onChange={onChange} numPrefix={numPrefix} req={req} />;
		case "linkedDropdown":
			return <LinkedDropdown field={field} value={value} onChange={onChange} numPrefix={numPrefix} req={req} formData={formDataProp} cascadeMap={cascadeMap} />;
		case "radio":
			const rAlign = field.textAlign === 'center' ? 'center' : field.textAlign === 'right' ? 'flex-end' : 'flex-start';
			const rDirection = field.direction === 'horizontal'
				? { flexDirection: 'row', flexWrap: 'wrap', gap: '12px' }
				: { flexDirection: 'column', alignItems: rAlign };
			return (
				<div className="ff-field-wrapper">
					<label className="ff-label" style={buildStyle(field.labelStyle)}>{numPrefix}{field.label}{req}</label>
					<div style={{ display: 'flex', ...rDirection }}>
						{field.options?.map((o, i) => (
							<label key={i} className="ff-radio-check-wrap" style={buildStyle(field.contentStyle)}>
								<input
									type="radio"
									name={field.id}
									value={o}
									checked={value === o}
									onChange={handleChange}
									required={field.required}
								/>
								{o}
							</label>
						))}
					</div>
				</div>
			);
		case "checkbox":
			const cAlign = field.textAlign === 'center' ? 'center' : field.textAlign === 'right' ? 'flex-end' : 'flex-start';
			const cDirection = field.direction === 'horizontal'
				? { flexDirection: 'row', flexWrap: 'wrap', gap: '12px' }
				: { flexDirection: 'column', alignItems: cAlign };
			return (
				<div className="ff-field-wrapper">
					<label className="ff-label" style={buildStyle(field.labelStyle)}>{numPrefix}{field.label}{req}</label>
					<div style={{ display: 'flex', ...cDirection }}>
						{field.options?.map((o, i) => (
							<label key={i} className="ff-radio-check-wrap" style={buildStyle(field.contentStyle)}>
								<input
									type="checkbox"
									value={o}
									checked={(Array.isArray(value) ? value : []).includes(o)}
									onChange={() => handleCheckbox(o)}
								/>
								{o}
							</label>
						))}
					</div>
				</div>
			);
		case "file":
			return (
				<div className="ff-field-wrapper">
					<label className="ff-label">{numPrefix}{field.label}{req}</label>
					<input
						type="file"
						accept={field.accept}
						multiple={field.multiple}
						className="ff-input"
						onChange={(e) => {
							// For real file upload, you'd store the File objects. 
							// Here we just store filenames for dummy preview.
							const files = Array.from(e.target.files).map(f => f.name);
							onChange(field.id, files);
						}}
						required={field.required}
					/>
				</div>
			);
		case "group":
			return (
				<div className="ff-field-wrapper" style={{ border: '2px solid var(--color-accent-light, #10b981)', borderRadius: '10px', padding: '16px', background: 'var(--color-bg-elevated)', marginBottom: '1.5rem' }}>
					<label className="ff-label" style={{ fontWeight: 700, marginBottom: '12px', display: 'block', ...buildStyle(field.labelStyle) }}>{field.label}</label>
					{(field.children || []).map(childRow => (
						<div key={childRow.id} className="ff-row" style={{ marginBottom: '12px' }}>
							{(childRow.columns || []).map(col => (
								<div key={col.id} className="ff-col" style={{ flex: col.span || 1, minWidth: 0 }}>
									{col.field ? <FieldRenderer field={col.field} value={formDataProp ? formDataProp[col.field.id] : value} onChange={onChange} number={(numberingMap || {})[col.field.id]} numberingMap={numberingMap} formData={formDataProp} cascadeMap={cascadeMap} /> : null}
								</div>
							))}
						</div>
					))}
				</div>
			);
		case "divider":
			return <hr style={{ border: "none", borderTop: "1px solid var(--color-border-input)", margin: "24px 0" }} />;
		default:
			return null;
	}
}

// ─── FillForm Component ────────────────────────────────────────────────────────
export default function FillForm() {
	const { templateId } = useParams();
	const navigate = useNavigate();

	const [templateDoc, setTemplateDoc] = useState(null);
	const [layout, setLayout] = useState([]);
	const [formData, setFormData] = useState({});
	const [loading, setLoading] = useState(true);
	const [toast, setToast] = useState(null);
	const [formSubmitted, setFormSubmitted] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { t } = useLanguage();

	const [user, setUser] = useState(null);
	useEffect(() => {
		const userStr = getStorageItem('user');
		if (userStr) {
			try { setUser(JSON.parse(userStr)); } catch { }
		}
	}, []);

	const showToast = (msg, type = "ok") => {
		setToast({ msg, type });
		setTimeout(() => setToast(null), 3000);
	};

	useEffect(() => {
		const fetchTemplate = async () => {
			try {
				const apiUrl = process.env.REACT_APP_API_URL || '';
				const res = await fetch(`${apiUrl}/formTemplates/${templateId}`);

				if (res.ok) {
					const data = await res.json();
					setTemplateDoc(data);
					const parsed = JSON.parse(data.template);
					if (parsed.layout) {
						setLayout(parsed.layout);
					}
				} else {
					showToast(t('failedLoadTemplate'), "err");
				}
			} catch (err) {
				showToast(t('networkErrorTemplate'), "err");
			} finally {
				setLoading(false);
			}
		};

		if (templateId) fetchTemplate();
	}, [templateId, t]);

	const handleFieldChange = (fieldId, value) => {
		setFormData(prev => ({ ...prev, [fieldId]: value }));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (isSubmitting) return;

		setFormSubmitted(true);
		setIsSubmitting(true);

		try {
			const token = getStorageItem('accessToken');
			if (!token) {
				showToast(t('mustBeLoggedInSubmit'), "err");
				return;
			}

			const apiUrl = process.env.REACT_APP_API_URL || '';
			const res = await fetch(`${apiUrl}/formSubmissions`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`
				},
				body: JSON.stringify({
					templateId,
					formData: JSON.stringify(formData)
				})
			});

			if (res.ok) {
				showToast(t('formSubmitSuccess'));
				setTimeout(() => {
					navigate('/dashboard');
				}, 2000);
			} else {
				const data = await res.json();
				showToast(data.message || t('formSubmitFailed'), "err");
				setIsSubmitting(false);
			}
		} catch (err) {
			showToast(t('networkErrorSubmitForm'), "err");
			setIsSubmitting(false);
		}
	};

	const computeFillNumbering = () => {
		const map = {};
		let sec = 0;
		const walk = (rowList) => {
			for (const row of rowList) {
				for (const col of row.columns || []) {
					const f = col.field;
					if (!f) continue;
					if (f.type === 'group') {
						sec++;
						map[f.id] = String(sec);
						let sub = 0;
						for (const cr of (f.children || [])) {
							for (const cc of (cr.columns || [])) {
								if (cc.field) {
									sub++;
									map[cc.field.id] = sec + '.' + sub;
								}
							}
						}
					}
				}
			}
		};
		walk(layout);
		return map;
	};
	const fillNumberingMap = computeFillNumbering();

	// Map of { datasetKey: { level: fieldId } } so each separate linked dropdown
	// can locate the fields for the levels above it and read their selections.
	const computeCascadeMap = () => {
		const map = {};
		const add = (f) => {
			if (f && f.type === 'linkedDropdown' && f.datasetKey) {
				const lvl = f.level || 0;
				if (!map[f.datasetKey]) map[f.datasetKey] = {};
				map[f.datasetKey][lvl] = f.id;
			}
		};
		const walk = (rowList) => {
			for (const row of rowList) {
				for (const col of row.columns || []) {
					const f = col.field;
					if (!f) continue;
					add(f);
					if (f.type === 'group') {
						for (const cr of (f.children || [])) walk([cr]);
					}
				}
			}
		};
		walk(layout);
		return map;
	};
	const cascadeMap = computeCascadeMap();

	if (loading) {
		return (
			<div className="fill-form-page">
				<Navbar user={user} />
				<main className="fill-form-container">
					<div className="skeleton-box skeleton-title" style={{ width: '40%', marginBottom: '1rem' }} />
					<div className="skeleton-box skeleton-text" style={{ width: '60%', marginBottom: '2rem' }} />
					{[1, 2, 3].map(i => (
						<div key={i} className="ff-row" style={{ marginBottom: '1.5rem' }}>
							<div className="ff-col" style={{ flex: 1 }}>
								<div className="ff-field-wrapper">
									<div className="skeleton-box skeleton-text-short" style={{ width: '25%', marginBottom: '0.5rem' }} />
									<div className="skeleton-box skeleton-text" style={{ height: '2.5rem', borderRadius: '8px' }} />
								</div>
							</div>
						</div>
					))}
					<div className="skeleton-box skeleton-button" style={{ width: '150px', height: '3rem', marginTop: '2rem' }} />
				</main>
			</div>
		);
	}

	if (!templateDoc) return (
		<div className="fill-form-page">
			<Navbar user={user} />
			<div className="ff-loading">{t('formNotFound')}</div>
		</div>
	);

	return (
		<div className="fill-form-page">
			<Navbar user={user} />

			<main className="fill-form-container">
				<h1 className="fill-form-title">{templateDoc.title}</h1>
				{templateDoc.description && <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>{templateDoc.description}</p>}

				<form onSubmit={handleSubmit} className={formSubmitted ? 'form-submitted' : ''}>
					{layout.map((row) => (
						<div key={row.id} className="ff-row">
							{row.columns.map(col => (
								<div key={col.id} className="ff-col" style={{ flex: col.span || 1 }}>
									{col.field ? (
										<FieldRenderer
											field={col.field}
											value={formData[col.field.id]}
											onChange={handleFieldChange}
											number={fillNumberingMap[col.field.id]}
											numberingMap={fillNumberingMap}
											formData={formData}
											cascadeMap={cascadeMap}
										/>
									) : null}
								</div>
							))}
						</div>
					))}

					{layout.length > 0 && (
						<button
							type="submit"
							className="ff-submit-btn"
							onClick={() => setFormSubmitted(true)}
							disabled={isSubmitting}
						>
							{isSubmitting ? t('submitting') : t('submitRequest')}
						</button>
					)}
				</form>
			</main>

			{toast && (
				<div className={`ff-toast ${toast.type === "err" ? "ff-toast-err" : "ff-toast-ok"}`}>
					{toast.msg}
				</div>
			)}
		</div>
	);
}