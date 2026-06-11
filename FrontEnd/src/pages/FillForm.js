import React, { useState, useEffect, useRef } from 'react';
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

// ─── Field Renderer ───────────────────────────────────────────────────────────
function FieldRenderer({ field, value, onChange, number, numberingMap, formData: formDataProp }) {
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
						maxLength={field.maxLength ?? 128}
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
						maxLength={field.maxLength ?? 128}
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
		case "file": {
			const selectedFiles = Array.isArray(value) ? value : [];
			const fileInputRef = React.createRef();
			return (
				<div className="ff-field-wrapper">
					<label className="ff-label">{numPrefix}{field.label}{req}</label>
					<div
						className="ff-file-dropzone"
						onClick={() => fileInputRef.current?.click()}
						onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('ff-file-dragover'); }}
						onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('ff-file-dragover'); }}
						onDrop={(e) => {
							e.preventDefault();
							e.currentTarget.classList.remove('ff-file-dragover');
							const droppedFiles = Array.from(e.dataTransfer.files);
							if (field.multiple) {
								onChange(field.id, [...selectedFiles, ...droppedFiles]);
							} else {
								onChange(field.id, droppedFiles.slice(0, 1));
							}
						}}
					>
						<input
							ref={fileInputRef}
							type="file"
							accept={field.accept}
							multiple={field.multiple}
							style={{ display: 'none' }}
							onChange={(e) => {
								const newFiles = Array.from(e.target.files);
								if (field.multiple) {
									onChange(field.id, [...selectedFiles, ...newFiles]);
								} else {
									onChange(field.id, newFiles.slice(0, 1));
								}
								e.target.value = ''; // allow re-selecting same file
							}}
						/>
						<div className="ff-file-dropzone-content">
							<span className="ff-file-dropzone-icon">📎</span>
							<span className="ff-file-dropzone-text">
								{t('dropFilesHere') || 'Click or drag files here'}
							</span>
						</div>
					</div>
					{selectedFiles.length > 0 && (
						<div className="ff-file-list">
							{selectedFiles.map((f, i) => (
								<div key={i} className="ff-file-item">
									<span className="ff-file-item-icon">📄</span>
									<span className="ff-file-item-name">{f.name}</span>
									<span className="ff-file-item-size">{(f.size / 1024).toFixed(1)} KB</span>
									<button
										type="button"
										className="ff-file-item-remove"
										onClick={(e) => {
											e.stopPropagation();
											onChange(field.id, selectedFiles.filter((_, idx) => idx !== i));
										}}
										title={t('removeFile') || 'Remove'}
									>✕</button>
								</div>
							))}
						</div>
					)}
				</div>
			);
		}
		case "group":
			return (
				<div className="ff-field-wrapper" style={{ border: '2px solid var(--color-accent-light, #10b981)', borderRadius: '10px', padding: '16px', background: 'var(--color-bg-elevated)', marginBottom: '1.5rem' }}>
					<label className="ff-label" style={{ fontWeight: 700, marginBottom: '12px', display: 'block', ...buildStyle(field.labelStyle) }}>{field.label}</label>
					{(field.children || []).map(childRow => (
						<div key={childRow.id} className="ff-row" style={{ marginBottom: '12px' }}>
							{(childRow.columns || []).map(col => (
								<div key={col.id} className="ff-col" style={{ flex: col.span || 1, minWidth: 0 }}>
									{col.field ? <FieldRenderer field={col.field} value={formDataProp ? formDataProp[col.field.id] : value} onChange={onChange} number={(numberingMap || {})[col.field.id]} numberingMap={numberingMap} formData={formDataProp} /> : null}
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

			// Separate file fields from text fields
			const textData = {};
			const fileEntries = []; // { fieldId, file }

			for (const [key, value] of Object.entries(formData)) {
				if (Array.isArray(value) && value.length > 0 && value[0] instanceof File) {
					// File field — collect file objects
					for (const file of value) {
						fileEntries.push({ fieldId: key, file });
					}
					// Store filenames in textData for the submittedData snapshot
					textData[key] = value.map(f => f.name);
				} else {
					textData[key] = value;
				}
			}

			if (fileEntries.length > 0) {
				// Multipart upload with files
				const fd = new FormData();
				fd.append('templateId', templateId);
				fd.append('formData', JSON.stringify(textData));
				fd.append('fileFieldMap', JSON.stringify(fileEntries.map(e => e.fieldId)));
				for (const entry of fileEntries) {
					fd.append('files', entry.file, entry.file.name);
				}

				const res = await fetch(`${apiUrl}/formSubmissions/upload`, {
					method: 'POST',
					headers: { 'Authorization': `Bearer ${token}` },
					body: fd,
				});

				if (res.ok) {
					showToast(t('formSubmitSuccess'));
					setTimeout(() => navigate('/dashboard'), 2000);
				} else {
					const data = await res.json();
					showToast(data.message || t('formSubmitFailed'), "err");
					setIsSubmitting(false);
				}
			} else {
				// No files — use original JSON endpoint
				const res = await fetch(`${apiUrl}/formSubmissions`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${token}`
					},
					body: JSON.stringify({
						templateId,
						formData: JSON.stringify(textData)
					})
				});

				if (res.ok) {
					showToast(t('formSubmitSuccess'));
					setTimeout(() => navigate('/dashboard'), 2000);
				} else {
					const data = await res.json();
					showToast(data.message || t('formSubmitFailed'), "err");
					setIsSubmitting(false);
				}
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

				<form onSubmit={handleSubmit} onKeyDown={(e) => { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') e.preventDefault(); }} className={formSubmitted ? 'form-submitted' : ''}>
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