import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './FillForm.css';

// ─── Field Renderer ───────────────────────────────────────────────────────────
function FieldRenderer({ field, value, onChange }) {
	const req = field.required ? <span className="ff-req">*</span> : null;

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
			return <div className="ff-heading" style={{ fontSize: sz }}>{field.label}</div>;
		}
		case "label":
			return <p className="ff-p">{field.label}</p>;
		case "text":
		case "email":
		case "number":
		case "date":
			return (
				<div className="ff-field-wrapper">
					<label className="ff-label">{field.label}{req}</label>
					<input 
						type={field.type} 
						placeholder={field.placeholder} 
						className="ff-input" 
						value={value || ''}
						onChange={handleChange}
						required={field.required}
						min={field.min}
						max={field.max}
					/>
				</div>
			);
		case "textarea":
			return (
				<div className="ff-field-wrapper">
					<label className="ff-label">{field.label}{req}</label>
					<textarea 
						placeholder={field.placeholder} 
						rows={field.rows || 3} 
						className="ff-textarea" 
						style={{ resize: "vertical" }}
						value={value || ''}
						onChange={handleChange}
						required={field.required}
					/>
				</div>
			);
		case "dropdown":
			return (
				<div className="ff-field-wrapper">
					<label className="ff-label">{field.label}{req}</label>
					<select className="ff-select" value={value || ''} onChange={handleChange} required={field.required}>
						<option value="" disabled>Select an option</option>
						{field.options?.map((o, i) => <option key={i} value={o}>{o}</option>)}
					</select>
				</div>
			);
		case "radio":
			return (
				<div className="ff-field-wrapper">
					<label className="ff-label">{field.label}{req}</label>
					{field.options?.map((o, i) => (
						<label key={i} className="ff-radio-check-wrap">
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
			);
		case "checkbox":
			return (
				<div className="ff-field-wrapper">
					<label className="ff-label">{field.label}{req}</label>
					{field.options?.map((o, i) => (
						<label key={i} className="ff-radio-check-wrap">
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
			);
		case "file":
			return (
				<div className="ff-field-wrapper">
					<label className="ff-label">{field.label}{req}</label>
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
		case "divider":
			return <hr style={{ border: "none", borderTop: `1px solid #cbd5e0`, margin: "24px 0" }} />;
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
					showToast("Failed to load template", "err");
				}
			} catch (err) {
				showToast("Network error loading template", "err");
			} finally {
				setLoading(false);
			}
		};

		if (templateId) fetchTemplate();
	}, [templateId]);

	const handleFieldChange = (fieldId, value) => {
		setFormData(prev => ({ ...prev, [fieldId]: value }));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		
		try {
			const token = localStorage.getItem('accessToken');
			if (!token) {
				showToast("You must be logged in to submit a form", "err");
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
				showToast("Form submitted successfully!");
				setTimeout(() => {
					navigate('/dashboard');
				}, 2000);
			} else {
				const data = await res.json();
				showToast(data.message || "Failed to submit form", "err");
			}
		} catch (err) {
			showToast("Network error submitting form", "err");
		}
	};

	if (loading) return <div className="ff-loading">Loading form...</div>;

	if (!templateDoc) return (
		<div className="fill-form-page">
			<header className="fill-form-header">
				<button className="back-btn" onClick={() => navigate('/dashboard')}>
					← Back to Dashboard
				</button>
			</header>
			<div className="ff-loading">Form not found.</div>
		</div>
	);

	return (
		<div className="fill-form-page">
			<header className="fill-form-header">
				<button className="back-btn" onClick={() => navigate('/dashboard')}>
					← Back to Dashboard
				</button>
			</header>

			<main className="fill-form-container">
				<h1 className="fill-form-title">{templateDoc.title}</h1>
				{templateDoc.description && <p style={{ color: '#4a5568', marginBottom: '2rem' }}>{templateDoc.description}</p>}

				<form onSubmit={handleSubmit}>
					{layout.map((row) => (
						<div key={row.id} className="ff-row">
							{row.columns.map(col => (
								<div key={col.id} className="ff-col" style={{ flex: col.span || 1 }}>
									{col.field ? (
										<FieldRenderer 
											field={col.field} 
											value={formData[col.field.id]} 
											onChange={handleFieldChange} 
										/>
									) : null}
								</div>
							))}
						</div>
					))}
					
					{layout.length > 0 && (
						<button type="submit" className="ff-submit-btn">
							Submit Request
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
