import React, { useState, useRef, useEffect, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import FlowEditor, { INIT_FLOW_NODES, INIT_FLOW_EDGES } from './FlowEditor';
import LanguageSelector from './LanguageSelector';
import "./FormBuilder.css";
import defaultAvatar from '../assets/default_user_avatar.jpg';
import { getStorageItem } from '../utils/storage';

// ─── Constants ────────────────────────────────────────────────────────────────
const PALETTE_ITEMS = [
	{ type: "heading", label: "Heading", icon: "H1" },
	{ type: "label", label: "Paragraph", icon: "¶" },
	{ type: "text", label: "Text Input", icon: "[ ]" },
	{ type: "email", label: "Email", icon: "@" },
	{ type: "number", label: "Number", icon: "##" },
	{ type: "textarea", label: "Text Area", icon: "≡" },
	{ type: "dropdown", label: "Dropdown", icon: "▾" },
	{ type: "radio", label: "Radio Group", icon: "◉" },
	{ type: "checkbox", label: "Checkboxes", icon: "☑" },
	{ type: "date", label: "Date Picker", icon: "▦" },
	{ type: "file", label: "File Upload", icon: "↑" },
	{ type: "group", label: "Group Box", icon: "⊞" },
	{ type: "divider", label: "Divider", icon: "—" },
];

const getFieldDefaults = (t) => ({
	heading: { label: t('defSectionTitle'), level: "h2", textAlign: 'left', labelStyle: { bold: false, italic: false, color: null, fontFamily: null, fontSize: null } },
	label: { label: t('defParagraphText'), textAlign: 'left', labelStyle: { bold: false, italic: false, color: null, fontFamily: null, fontSize: null } },
	text: { label: t('defTextField'), placeholder: t('defEnterText'), required: false, maxLength: 128, textAlign: 'left', labelStyle: { bold: false, italic: false, color: null, fontFamily: null, fontSize: null }, contentStyle: { bold: false, italic: false, color: null, fontFamily: null, fontSize: null } },
	email: { label: t('defEmailAddress'), placeholder: t('defYouExample'), required: false, maxLength: 128, textAlign: 'left', labelStyle: { bold: false, italic: false, color: null, fontFamily: null, fontSize: null }, contentStyle: { bold: false, italic: false, color: null, fontFamily: null, fontSize: null } },
	number: { label: t('defNumber'), placeholder: "0", required: false, min: "", max: "", textAlign: 'left', labelStyle: { bold: false, italic: false, color: null, fontFamily: null, fontSize: null }, contentStyle: { bold: false, italic: false, color: null, fontFamily: null, fontSize: null } },
	textarea: { label: t('defMessage'), placeholder: t('defWriteSomething'), required: false, maxLength: 128, rows: 3, textAlign: 'left', labelStyle: { bold: false, italic: false, color: null, fontFamily: null, fontSize: null }, contentStyle: { bold: false, italic: false, color: null, fontFamily: null, fontSize: null } },
	dropdown: { label: t('defSelectOption'), required: false, options: [t('defOptionA'), t('defOptionB'), t('defOptionC')], textAlign: 'left', labelStyle: { bold: false, italic: false, color: null, fontFamily: null, fontSize: null }, contentStyle: { bold: false, italic: false, color: null, fontFamily: null, fontSize: null } },
	radio: { label: t('defChooseOne'), required: false, options: [t('defChoice1'), t('defChoice2'), t('defChoice3')], textAlign: 'left', direction: 'vertical', labelStyle: { bold: false, italic: false, color: null, fontFamily: null, fontSize: null }, contentStyle: { bold: false, italic: false, color: null, fontFamily: null, fontSize: null } },
	checkbox: { label: t('defSelectAll'), required: false, options: [t('defItem1'), t('defItem2'), t('defItem3')], textAlign: 'left', direction: 'vertical', labelStyle: { bold: false, italic: false, color: null, fontFamily: null, fontSize: null }, contentStyle: { bold: false, italic: false, color: null, fontFamily: null, fontSize: null } },
	date: { label: t('defDate'), required: false, textAlign: 'left', dateFormat: 'DMY', labelStyle: { bold: false, italic: false, color: null, fontFamily: null, fontSize: null }, contentStyle: { bold: false, italic: false, color: null, fontFamily: null, fontSize: null } },
	file: { label: t('defUploadFile'), required: false, accept: "*", multiple: false, textAlign: 'left', labelStyle: { bold: false, italic: false, color: null, fontFamily: null, fontSize: null }, contentStyle: { bold: false, italic: false, color: null, fontFamily: null, fontSize: null } },
	group: { label: 'Group', children: [] },
	divider: {},
});

let _id = 1;
const uid = () => `f${_id++}`;
const urow = () => `r${_id++}`;
const ucol = () => `c${_id++}`;

const mkField = (type, t) => ({ id: uid(), type, ...JSON.parse(JSON.stringify(getFieldDefaults(t)[type])) });
const mkCol = (field = null, span = 1) => ({ id: ucol(), field, span });
const mkRow = (cols = 1) => ({ id: urow(), columns: Array.from({ length: cols }, () => mkCol()) });


// ─── Style Helpers ────────────────────────────────────────────────────────────
const FONT_FAMILIES = ['Inter', 'Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana'];
const FONT_SIZES = ['12px', '13px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];

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

// ─── Field Preview ────────────────────────────────────────────────────────────
function FieldPreview({ field, compact, number }) {
	const { t } = useLanguage();
	const req = field.required ? <span className="fbp-req">*</span> : null;
	const c = compact ? " compact" : "";
	const numPrefix = number ? <span style={{ fontWeight: 700, marginRight: '6px', color: 'var(--color-accent, #059669)' }}>{number}.</span> : null;

	switch (field.type) {
		case "heading": {
			const sz = { h1: "24px", h2: "18px", h3: "15px" }[field.level] || "18px";
			return <div className="fbp-heading" style={{ fontSize: sz, textAlign: field.textAlign || 'left', ...buildStyle(field.labelStyle) }}>{numPrefix}{field.label}</div>;
		}
		case "label":
			return <p className="fbp-p" style={{ textAlign: field.textAlign || 'left', ...buildStyle(field.labelStyle) }}>{numPrefix}{field.label}</p>;
		case "text": case "email": case "number":
			return <div className="fbp-wrapper" style={{ textAlign: field.textAlign || 'left' }}><label className="fbp-label" style={buildStyle(field.labelStyle)}>{numPrefix}{field.label}{req}</label><input type={field.type} placeholder={field.placeholder} className={"fbp-input" + c} style={buildStyle(field.contentStyle)} /></div>;
		case "textarea":
			return <div className="fbp-wrapper" style={{ textAlign: field.textAlign || 'left' }}><label className="fbp-label" style={buildStyle(field.labelStyle)}>{numPrefix}{field.label}{req}</label><textarea placeholder={field.placeholder} rows={compact ? 2 : field.rows} className={"fbp-textarea" + c} style={{ resize: "none", ...buildStyle(field.contentStyle) }} /></div>;
		case "dropdown":
			return <div className="fbp-wrapper" style={{ textAlign: field.textAlign || 'left' }}><label className="fbp-label" style={buildStyle(field.labelStyle)}>{numPrefix}{field.label}{req}</label><select className={"fbp-select" + c} style={buildStyle(field.contentStyle)}>{field.options.map((o, i) => <option key={i}>{o}</option>)}</select></div>;
		case "radio": {
			const rAlign = field.textAlign === 'center' ? 'center' : field.textAlign === 'right' ? 'flex-end' : 'flex-start';
			const rOptsStyle = field.direction === 'horizontal'
				? { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '12px', alignItems: rAlign }
				: { display: 'flex', flexDirection: 'column', alignItems: rAlign };
			return <div className="fbp-wrapper"><label className="fbp-label" style={{ textAlign: field.textAlign || 'left', ...buildStyle(field.labelStyle) }}>{numPrefix}{field.label}{req}</label><div style={rOptsStyle}>{field.options.slice(0, compact ? 2 : 99).map((o, i) => <label key={i} className="fbp-radio-check-wrap" style={buildStyle(field.contentStyle)}><input type="radio" name={field.id} />{o}</label>)}</div>{compact && field.options.length > 2 && <span className="fbp-more">+{field.options.length - 2} {t('moreLabel')}</span>}</div>;
		}
		case "checkbox": {
			const cAlign = field.textAlign === 'center' ? 'center' : field.textAlign === 'right' ? 'flex-end' : 'flex-start';
			const cOptsStyle = field.direction === 'horizontal'
				? { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '12px', alignItems: cAlign }
				: { display: 'flex', flexDirection: 'column', alignItems: cAlign };
			return <div className="fbp-wrapper"><label className="fbp-label" style={{ textAlign: field.textAlign || 'left', ...buildStyle(field.labelStyle) }}>{numPrefix}{field.label}{req}</label><div style={cOptsStyle}>{field.options.slice(0, compact ? 2 : 99).map((o, i) => <label key={i} className="fbp-radio-check-wrap" style={buildStyle(field.contentStyle)}><input type="checkbox" />{o}</label>)}</div>{compact && field.options.length > 2 && <span className="fbp-more">+{field.options.length - 2} {t('moreLabel')}</span>}</div>;
		}
		case "date": {
			const df = field.dateFormat || 'DMY';
			if (df === 'MY') {
				return <div className="fbp-wrapper" style={{ textAlign: field.textAlign || 'left' }}><label className="fbp-label" style={buildStyle(field.labelStyle)}>{numPrefix}{field.label}{req}</label><input type="text" placeholder="MM/YYYY" className={"fbp-input" + c} style={buildStyle(field.contentStyle)} readOnly /></div>;
			}
			if (df === 'Y') {
				return <div className="fbp-wrapper" style={{ textAlign: field.textAlign || 'left' }}><label className="fbp-label" style={buildStyle(field.labelStyle)}>{numPrefix}{field.label}{req}</label><input type="text" placeholder="YYYY" className={"fbp-input" + c} style={buildStyle(field.contentStyle)} readOnly /></div>;
			}
			return <div className="fbp-wrapper" style={{ textAlign: field.textAlign || 'left' }}><label className="fbp-label" style={buildStyle(field.labelStyle)}>{numPrefix}{field.label}{req}</label><input type="date" className={"fbp-input" + c} style={buildStyle(field.contentStyle)} /></div>;
		}
		case "file":
			return <div className="fbp-wrapper" style={{ textAlign: field.textAlign || 'left' }}><label className="fbp-label" style={buildStyle(field.labelStyle)}>{numPrefix}{field.label}{req}</label><input type="file" accept={field.accept} multiple={field.multiple} className={"fbp-input" + c} style={buildStyle(field.contentStyle)} /></div>;
		case "group":
			return <div className="fbp-wrapper" style={{ border: '2px solid var(--color-accent-light, #10b981)', borderRadius: '10px', padding: '16px', background: 'var(--color-bg-elevated)' }}>
				<label className="fbp-label" style={{ fontWeight: 700, marginBottom: '12px', display: 'block', ...buildStyle(field.labelStyle) }}>{numPrefix}{field.label}</label>
				{(field.children || []).map(childRow => (
					<div key={childRow.id} style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
						{(childRow.columns || []).map(col => (
							<div key={col.id} style={{ flex: col.span || 1, minWidth: 0 }}>
								{col.field ? <FieldPreview field={col.field} compact={compact} /> : <div style={{ height: '40px', border: '1px dashed var(--color-border-input)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-placeholder)', fontSize: '11px' }}>drop field</div>}
							</div>
						))}
					</div>
				))}
			</div>;
		case "divider":
			return <hr style={{ border: "none", borderTop: `1px solid #cbd5e0`, margin: "16px 0" }} />;
		default: return null;
	}
}

// ─── Style Editor ─────────────────────────────────────────────────────────────
function StyleEditor({ styleObj, onChange, label }) {
	const s = styleObj || {};
	const upd = (key, value) => onChange({ ...s, [key]: value });
	return (
		<div style={{ marginBottom: '16px', padding: '10px', background: 'var(--color-bg-alt, #f8f9fa)', borderRadius: '8px', border: '1px solid var(--color-border, #e0e0e0)' }}>
			<label className="fb-label" style={{ marginBottom: '8px', color: 'var(--color-accent-light, #10b981)' }}>{label}</label>
			<div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
				<button onClick={() => upd('bold', !s.bold)} title="Bold"
					style={{ fontWeight: 'bold', background: s.bold ? 'var(--color-accent-light, #10b981)' : 'var(--color-bg-input)', color: s.bold ? '#fff' : 'var(--color-text)', border: '1px solid var(--color-border-input)', borderRadius: '4px', padding: '3px 8px', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>B</button>
				<button onClick={() => upd('italic', !s.italic)} title="Italic"
					style={{ fontStyle: 'italic', background: s.italic ? 'var(--color-accent-light, #10b981)' : 'var(--color-bg-input)', color: s.italic ? '#fff' : 'var(--color-text)', border: '1px solid var(--color-border-input)', borderRadius: '4px', padding: '3px 8px', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>I</button>
				<input type="color" value={s.color || '#000000'} onChange={e => upd('color', e.target.value)}
					style={{ width: '28px', height: '28px', padding: '0', border: '1px solid var(--color-border-input)', borderRadius: '4px', cursor: 'pointer', background: 'none' }} title="Font Color" />
				<select value={s.fontFamily || ''} onChange={e => upd('fontFamily', e.target.value || null)}
					style={{ padding: '3px 6px', border: '1px solid var(--color-border-input)', borderRadius: '4px', fontSize: '11px', fontFamily: 'inherit', color: 'var(--color-text)', background: 'var(--color-bg-input)' }}>
					<option value="">Default (Inter)</option>
					{FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
				</select>
				<select value={s.fontSize || ''} onChange={e => upd('fontSize', e.target.value || null)}
					style={{ padding: '3px 6px', border: '1px solid var(--color-border-input)', borderRadius: '4px', fontSize: '11px', fontFamily: 'inherit', color: 'var(--color-text)', background: 'var(--color-bg-input)' }}>
					<option value="">Default (14px)</option>
					{FONT_SIZES.map(f => <option key={f} value={f}>{f}</option>)}
				</select>
			</div>
		</div>
	);
}

// ─── Properties Panel ─────────────────────────────────────────────────────────
function PropsPanel({ field, onChange, onDelete }) {
	const { t } = useLanguage();
	if (!field) return (
		<div className="fb-props-empty">
			<div className="fb-props-empty-icon">◧</div>
			<div className="fb-props-empty-text">{t('clickFieldToEdit')}</div>
		</div>
	);

	const upd = (patch) => onChange({ ...field, ...patch });
	const updOpts = (raw) => upd({ options: raw.split("\n") });

	return (
		<div className="fb-props-content">
			<div className="fb-props-header">
				<span className="fb-props-type">{t(field.type + 'Field').toUpperCase()}</span>
				<button onClick={onDelete} className="fb-btn-danger">✕ {t('delBtn')}</button>
			</div>

			{field.type !== "divider" && field.type !== "group" && (<div className="fb-field-group"><label className="fb-label">{t('labelProp')}</label><input className="fb-input" value={field.label} onChange={e => upd({ label: e.target.value })} /></div>)}
			{field.type !== "divider" && field.type !== "group" && (<div className="fb-field-group"><label className="fb-label">{t('textAlignProp')}</label><select className="fb-select" value={field.textAlign || 'left'} onChange={e => upd({ textAlign: e.target.value })}>
				<option value="left">← {t('alignLeft')}</option>
				<option value="center">↔ {t('alignCenter')}</option>
				<option value="right">→ {t('alignRight')}</option>
				<option value="justify">⇹ {t('alignJustify')}</option>
			</select></div>)}
			{field.type !== "divider" && <StyleEditor styleObj={field.labelStyle} onChange={ls => upd({ labelStyle: ls })} label="Label Style" />}
			{field.type === "heading" && (<div className="fb-field-group"><label className="fb-label">{t('levelProp')}</label><select className="fb-select" value={field.level} onChange={e => upd({ level: e.target.value })}><option value="h1">{t('h1Large')}</option><option value="h2">{t('h2Medium')}</option><option value="h3">{t('h3Small')}</option></select></div>)}
			{["text", "email", "number", "textarea"].includes(field.type) && (<div className="fb-field-group"><label className="fb-label">{t('placeholderProp')}</label><input className="fb-input" value={field.placeholder} onChange={e => upd({ placeholder: e.target.value })} /></div>)}
			{["text", "email", "textarea"].includes(field.type) && (<div className="fb-field-group"><label className="fb-label">Max Length</label><input type="number" className="fb-input" value={field.maxLength ?? 128} onChange={e => upd({ maxLength: parseInt(e.target.value) || 128 })} /></div>)}
			{field.type === "textarea" && (<div className="fb-field-group"><label className="fb-label">{t('rowsProp')}</label><input type="number" className="fb-input" value={field.rows} min={2} max={10} onChange={e => upd({ rows: +e.target.value || 3 })} /></div>)}
			{field.type === "number" && (<><div className="fb-field-group"><label className="fb-label">{t('minProp')}</label><input type="number" className="fb-input" value={field.min} onChange={e => upd({ min: e.target.value })} /></div><div className="fb-field-group"><label className="fb-label">{t('maxProp')}</label><input type="number" className="fb-input" value={field.max} onChange={e => upd({ max: e.target.value })} /></div></>)}
			{["dropdown", "radio", "checkbox"].includes(field.type) && (<div className="fb-field-group"><label className="fb-label">{t('optionsProp')}</label><textarea className="fb-textarea" style={{ resize: "vertical", minHeight: "80px" }} value={field.options.join("\n")} onChange={e => updOpts(e.target.value)} /></div>)}
			{["radio", "checkbox"].includes(field.type) && (
				<div className="fb-field-group">
					<label className="fb-label">Option Layout</label>
					<select className="fb-select" value={field.direction || 'vertical'} onChange={e => upd({ direction: e.target.value })}>
						<option value="vertical">Vertical (stacked)</option>
						<option value="horizontal">Horizontal (inline)</option>
					</select>
				</div>
			)}
			{field.type === "file" && (
				<>
					<div className="fb-field-group">
						<label className="fb-label">{t('acceptProp')}</label>
						<input className="fb-input" value={field.accept} placeholder="*  or  image/*  or  .pdf" onChange={e => upd({ accept: e.target.value })} />
					</div>
					<label className="fb-checkbox-label">
						<input type="checkbox" className="fb-checkbox" checked={field.multiple} onChange={e => upd({ multiple: e.target.checked })} />
						{t('multipleFilesProp')}
					</label>
				</>
			)}
			{field.contentStyle && (
				<StyleEditor styleObj={field.contentStyle} onChange={cs => upd({ contentStyle: cs })} label="Content Style" />
			)}
			{field.type === "group" && (
				<div className="fb-field-group">
					<label className="fb-label">Group Label</label>
					<input className="fb-input" value={field.label} onChange={e => upd({ label: e.target.value })} />
				</div>
			)}
			{!["heading", "label", "divider", "group"].includes(field.type) && (
				<label className="fb-checkbox-label">
					<input type="checkbox" className="fb-checkbox" checked={field.required} onChange={e => upd({ required: e.target.checked })} />
					{t('requiredProp')}
				</label>
			)}
			{field.type === "date" && (
				<div className="fb-field-group">
					<label className="fb-label">Date Format</label>
					<select className="fb-select" value={field.dateFormat || 'DMY'} onChange={e => upd({ dateFormat: e.target.value })}>
						<option value="DMY">Day / Month / Year</option>
						<option value="MDY">Month / Day / Year</option>
						<option value="YMD">Year / Month / Day</option>
						<option value="MY">Month / Year only</option>
						<option value="Y">Year only</option>
					</select>
				</div>
			)}
		</div>
	);
}

// ─── Column Slot ──────────────────────────────────────────────────────────────
function ColSlot({ col, rowId, colIndex, totalCols, selected, onSelect, onDrop, onClear, onMoveOut, onClickEmptySlot, isPaletteSelected }) {
	const [over, setOver] = useState(false);
	const isEmpty = !col.field;
	const { t } = useLanguage();

	return (
		<div className="fb-col-slot" style={{ flex: col.span || 1 }}
			onDragOver={e => { e.preventDefault(); e.stopPropagation(); setOver(true); }}
			onDragLeave={() => setOver(false)}
			onDrop={e => { e.preventDefault(); e.stopPropagation(); setOver(false); onDrop(rowId, col.id); }}>

			{isEmpty ? (
				<div className={`fb-slot-empty ${over ? 'drag-over' : ''} ${isPaletteSelected ? 'palette-selected' : ''}`} onClick={() => onClickEmptySlot && onClickEmptySlot(rowId, col.id)}>
					<span style={{ fontSize: "16px", opacity: 0.6 }}>⊕</span>
					{over ? t('dropHere') : `${t('colLabel')}${colIndex + 1}${totalCols > 1 ? ` · ${t('spanLabel')}${col.span || 1}` : ''}`}
				</div>
			) : (
				<div onClick={() => onSelect(rowId, col.id)}
					className={`fb-slot-filled ${selected ? 'selected' : ''} ${over ? 'drag-over' : ''}`}
					draggable onDragStart={e => { e.stopPropagation(); onMoveOut(rowId, col.id); }}>
					<div style={{ pointerEvents: "none" }}><FieldPreview field={col.field} compact /></div>
					{selected && (
						<button onClick={e => { e.stopPropagation(); onClear(rowId, col.id); }} className="fb-cell-remove">✕</button>
					)}
					{selected && <div className="fb-cell-selected-icon">✦</div>}
				</div>
			)}
		</div>
	);
}

// ─── Row Component ────────────────────────────────────────────────────────────
function RowComp({ row, rowIndex, totalRows, selectedCell, onSelectCell, onDropOnCol, onClearCol,
	onMoveFieldOut, onDeleteRow, onMoveRow, onSetCols, onDuplicateRow, onSetColSpan, onClickEmptySlot, isPaletteSelected,
	onDragStartRow, onDragOverRow, onDragLeaveRow, onDropRow, onDragEndRow, draggedRowId, dragOverRowId, onJumpRow }) {
	const { t } = useLanguage();
	const [tempNumber, setTempNumber] = useState(rowIndex + 1);

	useEffect(() => {
		setTempNumber(rowIndex + 1);
	}, [rowIndex]);

	const handleNumberSubmit = () => {
		const val = parseInt(tempNumber, 10);
		if (isNaN(val) || val < 1 || val > totalRows || val === rowIndex + 1) {
			setTempNumber(rowIndex + 1);
			return;
		}
		if (onJumpRow) onJumpRow(row.id, val);
	};

	return (
		<div className={`fb-row ${draggedRowId === row.id ? 'dragging' : ''} ${dragOverRowId === row.id ? 'drag-over' : ''}`}
			onDragOver={e => onDragOverRow && onDragOverRow(e, row.id)}
			onDragLeave={e => onDragLeaveRow && onDragLeaveRow(e, row.id)}
			onDrop={e => onDropRow && onDropRow(e, row.id)}>
			{/* Row toolbar */}
			<div className="fb-row-toolbar">
				{onDragStartRow && (
					<div 
						className="fb-row-drag-handle"
						draggable
						onDragStart={e => onDragStartRow(e, row.id)}
						onDragEnd={onDragEndRow}
						style={{ cursor: 'grab', marginRight: '6px', color: 'var(--color-text-placeholder)', padding: '2px 4px', display: 'flex', alignItems: 'center' }}
						title="Drag to reorder row"
					>
						⠿
					</div>
				)}
				<span className="fb-row-label" style={{ display: 'flex', alignItems: 'center' }}>
					{t('rowNum')}
					<input 
						type="number"
						value={tempNumber}
						min={1}
						max={totalRows}
						onChange={e => setTempNumber(e.target.value)}
						onBlur={handleNumberSubmit}
						onKeyDown={e => {
							if (e.key === 'Enter') {
								handleNumberSubmit();
							}
						}}
						className="fb-row-number-input"
						title="Change row position"
					/>
				</span>
				<span className="fb-row-divider">│</span>
				<span className="fb-row-label">{t('colsLabel')}</span>
				{[1, 2, 3, 4].map(n => (
					<button key={n} onClick={() => onSetCols(row.id, n)}
						className={`fb-btn-icon ${row.columns.length === n ? 'active' : ''}`} style={{ fontSize: '11px', color: row.columns.length === n ? 'var(--color-accent-light)' : 'var(--color-text-placeholder)', fontWeight: row.columns.length === n ? 'bold' : 'normal' }}>
						{n}
					</button>
				))}

				{/* Column Width Controls — only shown when row has >1 column */}
				{row.columns.length > 1 && (
					<>
						<span className="fb-row-divider">│</span>
						<span className="fb-row-label">{t('widthsLabel')}</span>
						{row.columns.map((col, ci) => (
							<div key={col.id} className="fb-span-control" title={`${t('colLabel')}${ci + 1} ${t('widthFlexTitle')}`}>
								<button
									className="fb-span-btn"
									onClick={() => onSetColSpan(row.id, col.id, Math.max(1, (col.span || 1) - 1))}
									disabled={(col.span || 1) <= 1}
								>−</button>
								<span className="fb-span-value" title={`${t('colLabel')}${ci + 1}: ${col.span || 1} ${(col.span || 1) !== 1 ? t('unitsPlural') : t('unitSingular')}`}>
									{col.span || 1}
								</span>
								<button
									className="fb-span-btn"
									onClick={() => onSetColSpan(row.id, col.id, Math.min(12, (col.span || 1) + 1))}
									disabled={(col.span || 1) >= 12}
								>+</button>
							</div>
						))}
						<button
							className="fb-span-reset"
							title="Reset all columns to equal width"
							onClick={() => row.columns.forEach(col => onSetColSpan(row.id, col.id, 1))}
						>⟳</button>
					</>
				)}

				<div style={{ flex: 1 }} />
				<button disabled={rowIndex === 0} onClick={() => onMoveRow(row.id, "top")} className="fb-btn-icon" style={{ opacity: rowIndex === 0 ? 0.3 : 1, cursor: rowIndex === 0 ? "default" : "pointer" }} title="Move to Top">⯭</button>
				<button disabled={rowIndex === 0} onClick={() => onMoveRow(row.id, -1)} className="fb-btn-icon" style={{ opacity: rowIndex === 0 ? 0.3 : 1, cursor: rowIndex === 0 ? "default" : "pointer" }}>↑</button>
				<button disabled={rowIndex === totalRows - 1} onClick={() => onMoveRow(row.id, 1)} className="fb-btn-icon" style={{ opacity: rowIndex === totalRows - 1 ? 0.3 : 1, cursor: rowIndex === totalRows - 1 ? "default" : "pointer" }}>↓</button>
				<button disabled={rowIndex === totalRows - 1} onClick={() => onMoveRow(row.id, "bottom")} className="fb-btn-icon" style={{ opacity: rowIndex === totalRows - 1 ? 0.3 : 1, cursor: rowIndex === totalRows - 1 ? "default" : "pointer" }} title="Move to Bottom">⯯</button>
				<button onClick={() => onDuplicateRow(row.id)} className="fb-btn" style={{ marginLeft: "6px", padding: "4px 8px", fontSize: "11px", lineHeight: "1" }}>⎘ {t('dupBtn')}</button>
				<button onClick={() => onDeleteRow(row.id)} className="fb-btn-danger" style={{ marginLeft: "6px" }}>✕ {t('rowBtn')}</button>
			</div>

			{/* Column slots */}
			<div className="fb-cols-container">
				{row.columns.map((col, ci) => (
					<ColSlot key={col.id} col={col} rowId={row.id} colIndex={ci} totalCols={row.columns.length}
						selected={selectedCell?.rowId === row.id && selectedCell?.colId === col.id}
						onSelect={onSelectCell} onDrop={onDropOnCol} onClear={onClearCol} onMoveOut={onMoveFieldOut}
						onClickEmptySlot={onClickEmptySlot} isPaletteSelected={isPaletteSelected} />
				))}
			</div>
		</div>
	);
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function FormBuilder() {
	const [rows, setRows] = useState([mkRow(1)]);
	const [draggedRowId, setDraggedRowId] = useState(null);
	const [dragOverRowId, setDragOverRowId] = useState(null);
	const [draggedRowGroupFieldId, setDraggedRowGroupFieldId] = useState(null);
	const [formName, setFormName] = useState("Untitled Form");
	const [selCell, setSelCell] = useState(null);
	const [tab, setTab] = useState("template");
	const [prevTab, setPrevTab] = useState("template");
	const [toast, setToast] = useState(null);
	const [showImport, setShowImport] = useState(false);
	const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
	const [importTxt, setImportTxt] = useState("");
	const [dbTemplates, setDbTemplates] = useState([]);
	const [currentTemplateId, setCurrentTemplateId] = useState(null);
	const [currentDraftId, setCurrentDraftId] = useState(null);
	const [selectedDropdownId, setSelectedDropdownId] = useState("");
	const [showSaveConfirm, setShowSaveConfirm] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [showMenu, setShowMenu] = useState(false);
	const [showNumbering, setShowNumbering] = useState(false);
	const [selectedPaletteItem, setSelectedPaletteItem] = useState(null);
	const [flowNodes, setFlowNodes] = useState(INIT_FLOW_NODES);
	const [flowEdges, setFlowEdges] = useState(INIT_FLOW_EDGES);
	const [showPropsModal, setShowPropsModal] = useState(false);
	const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches);
	const drag = useRef(null);
	const dropHandledRef = useRef(false);
	const navigate = useNavigate();
	const { t } = useLanguage();
	const { themeMode, cycleTheme, isDark } = useTheme();
	const themeIcon = { light: '☀️', dark: '🌙', auto: '🌗' }[themeMode];

	// Parse user from storage
	const storedUser = getStorageItem('user');
	let currentUser = null;
	try { currentUser = storedUser ? JSON.parse(storedUser) : null; } catch { currentUser = null; }

	// Track mobile breakpoint
	useEffect(() => {
		const mql = window.matchMedia('(max-width: 768px)');
		const handler = (e) => setIsMobile(e.matches);
		mql.addEventListener('change', handler);
		return () => mql.removeEventListener('change', handler);
	}, []);

	useEffect(() => {
		const fetchTemplates = async () => {
			try {
				const apiUrl = process.env.REACT_APP_API_URL || '';
				const res = await fetch(`${apiUrl}/formTemplates`);
				if (res.ok) {
					const data = await res.json();
					setDbTemplates(data);
				}
			} catch (err) {
				console.error("Failed to fetch templates", err);
			}
		};
		fetchTemplates();

		// Resume from draft if ?draftId= query param is present
		const params = new URLSearchParams(window.location.search);
		const draftId = params.get('draftId');
		if (draftId) {
			const loadDraft = async () => {
				try {
					const apiUrl = process.env.REACT_APP_API_URL || '';
					const token = getStorageItem('accessToken');
					const res = await fetch(`${apiUrl}/draftFormTemplates/${draftId}`, {
						headers: { Authorization: `Bearer ${token}` }
					});
					if (res.ok) {
						const data = await res.json();
						const t = JSON.parse(data.template);
						if (t.layout) setRows(t.layout);
						if (t.flow) {
							setFlowNodes(t.flow.nodes || INIT_FLOW_NODES);
							setFlowEdges(t.flow.edges || INIT_FLOW_EDGES);
						}
						setFormName(t.name || data.title || 'Untitled Draft');
						setCurrentDraftId(draftId);
						setSelCell(null);
					} else {
						console.error('Failed to load draft');
					}
				} catch (err) {
					console.error('Error loading draft', err);
				}
			};
			loadDraft();
		}
	}, []);

	// Auto-open properties modal on mobile when field is selected
	useEffect(() => {
		if (isMobile && selCell) {
			setShowPropsModal(true);
		}
	}, [selCell, isMobile]);

	const showToast = (msg, type = "ok") => { setToast({ msg, type }); setTimeout(() => setToast(null), 2500); };

	const mutRows = (fn) => setRows(prev => fn(JSON.parse(JSON.stringify(prev))));

	const getField = () => {
		if (!selCell) return null;
		if (selCell.childRowId && selCell.childColId) return getGroupChildField();
		return rows.find(r => r.id === selCell.rowId)?.columns.find(c => c.id === selCell.colId)?.field || null;
	};

	const allFields = () => rows.flatMap(r => r.columns.map(c => c.field).filter(Boolean));

	// Drop handler — palette → slot, or canvas → slot (swap)
	const handleDropOnCol = (rowId, colId) => {
		if (!drag.current || dropHandledRef.current) return;
		if (drag.current.source === "palette") {
			const newField = mkField(drag.current.type, t);
			mutRows(rs => {
				const col = rs.find(r => r.id === rowId)?.columns.find(c => c.id === colId);
				if (!col) return rs;
				// If target column has a group, add to group's children instead of replacing
				if (col.field && col.field.type === 'group') {
					// Block nested groups
					if (newField.type === 'group') {
						drag.current = null;
						showToast(t('nestedGroupsNotSupported'), 'err');
						return rs;
					}
					const childRow = mkRow(1);
					childRow.columns[0].field = newField;
					col.field = { ...col.field, children: [...(col.field.children || []), childRow] };
				} else {
					col.field = newField;
				}
				return rs;
			});
			// Auto-select if dropped a group, so its editor opens immediately
			if (newField.type === 'group') {
				setSelCell({ rowId, colId });
				drag.current = null;
				return;
			}
			setSelCell({ rowId, colId });
		} else if (drag.current.source === "canvas") {
			const { rowId: fr, colId: fc } = drag.current;
			if (fr === rowId && fc === colId) { drag.current = null; return; }
			mutRows(rs => {
				const sc = rs.find(r => r.id === fr)?.columns.find(c => c.id === fc);
				const dc = rs.find(r => r.id === rowId)?.columns.find(c => c.id === colId);
				if (!sc || !dc) return rs;
				// If target column has a group, move source field into group's children
				if (dc.field && dc.field.type === 'group' && sc.field && sc.field.type !== 'group') {
					const childRow = mkRow(1);
					childRow.columns[0].field = sc.field;
					dc.field = { ...dc.field, children: [...(dc.field.children || []), childRow] };
					sc.field = null;
				} else {
					// Standard swap
					const tmp = sc.field; sc.field = dc.field; dc.field = tmp;
				}
				return rs;
			});
			setSelCell({ rowId, colId });
		}
		setTimeout(() => { dropHandledRef.current = false; }, 0);
		drag.current = null;
	};

	const handleClearCol = (rowId, colId) => {
		mutRows(rs => {
			const col = rs.find(r => r.id === rowId)?.columns.find(c => c.id === colId);
			if (col) col.field = null;
			return rs;
		});
		setSelCell(null);
	};

	const handleUpdateField = (updated) => {
		if (!selCell) return;
		if (selCell.childRowId && selCell.childColId) {
			mutGroupField(gf => {
				const ch = (gf.children || []).map(r => {
					if (r.id !== selCell.childRowId) return r;
					const cols = r.columns.map(c => c.id === selCell.childColId ? { ...c, field: updated } : c);
					return { ...r, columns: cols };
				});
				return { ...gf, children: ch };
			}, selCell.fieldId);
			return;
		}
		mutRows(rs => {
			const col = rs.find(r => r.id === selCell.rowId)?.columns.find(c => c.id === selCell.colId);
			if (col) col.field = updated;
			return rs;
		});
	};

	const handleDeleteField = () => { if (selCell) handleClearCol(selCell.rowId, selCell.colId); };

	const handleEmptySlotClick = (rowId, colId) => {
		if (selectedPaletteItem) {
			drag.current = { source: "palette", type: selectedPaletteItem };
			handleDropOnCol(rowId, colId);
			setSelectedPaletteItem(null);
		} else {
			setSelCell({ rowId, colId });
		}
	};

	const handleGroupEmptySlotClick = (childRowId, colId, gfId) => {
		if (selectedPaletteItem) {
			drag.current = { source: "palette", type: selectedPaletteItem };
			handleGroupDropOnCol(childRowId, colId, gfId);
			setSelectedPaletteItem(null);
		} else {
			setSelCell({ fieldId: gfId, childRowId, childColId: colId });
		}
	};

	const addRow = (cols = 1) => setRows(prev => [...prev, mkRow(cols)]);

	const duplicateRow = (rowId) => {
		mutRows(rs => {
			const idx = rs.findIndex(r => r.id === rowId);
			if (idx === -1) return rs;
			const orig = rs[idx];
			const newRow = {
				id: urow(),
				columns: orig.columns.map(c => ({
					id: ucol(),
					field: c.field ? { ...c.field, id: uid() } : null
				}))
			};
			rs.splice(idx + 1, 0, newRow);
			return rs;
		});
	};

	const deleteRow = (rowId) => {
		setRows(prev => prev.length === 1 ? prev : prev.filter(r => r.id !== rowId));
		if (selCell?.rowId === rowId) setSelCell(null);
	};

	const moveRow = (rowId, dir) => {
		mutRows(rs => {
			const i = rs.findIndex(r => r.id === rowId);
			if (i === -1) return rs;
			if (dir === "top") {
				const [item] = rs.splice(i, 1);
				rs.unshift(item);
			} else if (dir === "bottom") {
				const [item] = rs.splice(i, 1);
				rs.push(item);
			} else {
				const j = i + dir;
				if (j < 0 || j >= rs.length) return rs;
				[rs[i], rs[j]] = [rs[j], rs[i]];
			}
			return rs;
		});
	};

	const handleRowDragStart = (e, rowId, gfId = null) => {
		setDraggedRowId(rowId);
		setDraggedRowGroupFieldId(gfId);
		e.dataTransfer.effectAllowed = "move";
	};

	const handleRowDragOver = (e, targetRowId, gfId = null) => {
		if (draggedRowId && draggedRowId !== targetRowId && draggedRowGroupFieldId === gfId) {
			e.preventDefault();
			setDragOverRowId(targetRowId);
		}
	};

	const handleRowDragLeave = (e, targetRowId) => {
		if (dragOverRowId === targetRowId) {
			setDragOverRowId(null);
		}
	};

	const handleRowDragEnd = () => {
		setDraggedRowId(null);
		setDragOverRowId(null);
		setDraggedRowGroupFieldId(null);
	};

	const handleRowDrop = (e, targetRowId, gfId = null) => {
		e.preventDefault();
		if (!draggedRowId || draggedRowId === targetRowId || draggedRowGroupFieldId !== gfId) return;

		if (gfId) {
			mutGroupField(gf => {
				const ch = [...(gf.children || [])];
				const fromIdx = ch.findIndex(r => r.id === draggedRowId);
				const toIdx = ch.findIndex(r => r.id === targetRowId);
				if (fromIdx !== -1 && toIdx !== -1) {
					const [moved] = ch.splice(fromIdx, 1);
					ch.splice(toIdx, 0, moved);
				}
				return { ...gf, children: ch };
			}, gfId);
		} else {
			mutRows(rs => {
				const fromIdx = rs.findIndex(r => r.id === draggedRowId);
				const toIdx = rs.findIndex(r => r.id === targetRowId);
				if (fromIdx !== -1 && toIdx !== -1) {
					const [moved] = rs.splice(fromIdx, 1);
					rs.splice(toIdx, 0, moved);
				}
				return rs;
			});
		}

		handleRowDragEnd();
	};

	const jumpRow = (rowId, newPosition) => {
		mutRows(rs => {
			const fromIdx = rs.findIndex(r => r.id === rowId);
			if (fromIdx === -1) return rs;
			const toIdx = Math.max(0, Math.min(rs.length - 1, newPosition - 1));
			if (fromIdx === toIdx) return rs;
			const [moved] = rs.splice(fromIdx, 1);
			rs.splice(toIdx, 0, moved);
			return rs;
		});
	};

	const groupJumpRow = (childRowId, newPosition, gfId) => {
		mutGroupField(gf => {
			const ch = [...(gf.children || [])];
			const fromIdx = ch.findIndex(r => r.id === childRowId);
			if (fromIdx === -1) return gf;
			const toIdx = Math.max(0, Math.min(ch.length - 1, newPosition - 1));
			if (fromIdx === toIdx) return gf;
			const [moved] = ch.splice(fromIdx, 1);
			ch.splice(toIdx, 0, moved);
			return { ...gf, children: ch };
		}, gfId);
	};

	const setRowCols = (rowId, n) => {
		mutRows(rs => {
			const row = rs.find(r => r.id === rowId);
			if (!row) return rs;
			while (row.columns.length < n) row.columns.push(mkCol(null, 1));
			while (row.columns.length > n) row.columns.pop();
			// If switching to 1 col, reset its span to 1
			if (n === 1) row.columns[0].span = 1;
			return rs;
		});
	};

	const setColSpan = (rowId, colId, span) => {
		mutRows(rs => {
			const col = rs.find(r => r.id === rowId)?.columns.find(c => c.id === colId);
			if (col) col.span = span;
			return rs;
		});
	};

	// ─── Group-internal operations ──────────────────────────────────────────
	const mutGroupField = (fn, gfId) => {
		if (!gfId) return;
		mutRows(rs => {
			// Search all rows and columns (including inside groups) for the group with matching field ID
			let found = null;
			const search = (rowList) => {
				for (const r of rowList) {
					for (const c of r.columns || []) {
						if (c.field && c.field.id === gfId && c.field.type === 'group') { found = c; return; }
						if (c.field && c.field.type === 'group') search(c.field.children || []);
					}
				}
			};
			search(rs);
			if (!found || !found.field || found.field.type !== 'group') return rs;
			
			found.field = fn(found.field);
			return rs;
		});
	};

	const groupAddRow = (cols = 1, gfId) => {
		mutGroupField(gf => ({ ...gf, children: [...(gf.children || []), mkRow(cols)] }), gfId);
	};

	const groupDeleteRow = (childRowId, gfId) => {
		mutGroupField(gf => ({ ...gf, children: (gf.children || []).filter(r => r.id !== childRowId) }), gfId);
	};

	const groupDuplicateRow = (childRowId, gfId) => {
		mutGroupField(gf => {
			const idx = (gf.children || []).findIndex(r => r.id === childRowId);
			if (idx === -1) return gf;
			const orig = gf.children[idx];
			const newRow = { id: urow(), columns: orig.columns.map(c => ({ id: ucol(), field: c.field ? { ...c.field, id: uid() } : null })) };
			const newChildren = [...gf.children];
			newChildren.splice(idx + 1, 0, newRow);
			return { ...gf, children: newChildren };
		}, gfId);
	};

	const groupMoveRow = (childRowId, dir, gfId) => {
		mutGroupField(gf => {
			const ch = [...(gf.children || [])];
			const i = ch.findIndex(r => r.id === childRowId);
			if (i === -1) return gf;
			if (dir === "top") {
				const [item] = ch.splice(i, 1);
				ch.unshift(item);
			} else if (dir === "bottom") {
				const [item] = ch.splice(i, 1);
				ch.push(item);
			} else {
				const j = i + dir;
				if (j < 0 || j >= ch.length) return gf;
				[ch[i], ch[j]] = [ch[j], ch[i]];
			}
			return { ...gf, children: ch };
		}, gfId);
	};

	const groupSetRowCols = (childRowId, n, gfId) => {
		mutGroupField(gf => {
			const ch = (gf.children || []).map(r => {
				if (r.id !== childRowId) return r;
				const cols = [...r.columns];
				while (cols.length < n) cols.push(mkCol(null, 1));
				while (cols.length > n) cols.pop();
				if (n === 1) cols[0].span = 1;
				return { ...r, columns: cols };
			});
			return { ...gf, children: ch };
		}, gfId);
	};

	const groupSetColSpan = (childRowId, colId, span, gfId) => {
		mutGroupField(gf => {
			const ch = (gf.children || []).map(r => {
				if (r.id !== childRowId) return r;
				const cols = r.columns.map(c => c.id === colId ? { ...c, span } : c);
				return { ...r, columns: cols };
			});
			return { ...gf, children: ch };
		}, gfId);
	};

	const handleGroupDropOnCol = (childRowId, colId, gfId) => {
		if (!drag.current || dropHandledRef.current) return;
		dropHandledRef.current = true;
		if (drag.current.source === "palette") {
			// Block nested groups
			if (drag.current.type === 'group') {
				showToast(t('nestedGroupsNotSupported'), 'err');
				setTimeout(() => { dropHandledRef.current = false; }, 0);
				drag.current = null;
				return;
			}
			const newField = mkField(drag.current.type, t);
			mutGroupField(gf => {
				const ch = (gf.children || []).map(r => {
					if (r.id !== childRowId) return r;
					const targetCol = r.columns.find(c => c.id === colId);
					// If target column is occupied, add a new column instead of replacing
					if (targetCol && targetCol.field && targetCol.field.type !== 'group') {
						const newCol = mkCol(newField, 1);
						return { ...r, columns: [...r.columns, newCol] };
					}
					const cols = r.columns.map(c => {
						if (c.id !== colId) return c;
						if (c.field && c.field.type === 'group') {
							const childRow = mkRow(1);
							childRow.columns[0].field = newField;
							return { ...c, field: { ...c.field, children: [...(c.field.children || []), childRow] } };
						}
						return { ...c, field: newField };
					});
					return { ...r, columns: cols };
				});
				return { ...gf, children: ch };
			}, gfId);
			setSelCell(null); // clear selection — group identified by field ID now
		} else if (drag.current.source === "canvas") {
			const { rowId: fr, colId: fc } = drag.current;
			mutRows(rs => {
				const sc = rs.find(r => r.id === fr)?.columns.find(c => c.id === fc);
				if (!sc || !sc.field) return rs;
				const srcField = sc.field;
				sc.field = null;
				// Find the group column by field ID
				let foundG = null;
				const searchG = (rowList) => {
					for (const r of rowList) {
						for (const c of r.columns || []) {
							if (c.field && c.field.id === gfId && c.field.type === 'group') { foundG = c; return; }
							if (c.field && c.field.type === 'group') searchG(c.field.children || []);
						}
					}
				};
				searchG(rs);
				if (foundG && foundG.field && foundG.field.type === 'group') {
					const ch = (foundG.field.children || []).map(r => {
						if (r.id !== childRowId) return r;
						const cols = r.columns.map(c => {
							if (c.id !== colId) return c;
							if (c.field && c.field.type === 'group') {
								const childRow = mkRow(1);
								childRow.columns[0].field = srcField;
								return { ...c, field: { ...c.field, children: [...(c.field.children || []), childRow] } };
							}
							return { ...c, field: srcField };
						});
						return { ...r, columns: cols };
					});
					foundG.field = { ...foundG.field, children: ch };
				}
				return rs;
			});
			setSelCell(null);
		}
		setTimeout(() => { dropHandledRef.current = false; }, 0);
		drag.current = null;
	};

	const handleGroupClearCol = (childRowId, colId, gfId) => {
		mutGroupField(gf => {
			const ch = (gf.children || []).map(r => {
				if (r.id !== childRowId) return r;
				const cols = r.columns.map(c => c.id === colId ? { ...c, field: null } : c);
				return { ...r, columns: cols };
			});
			return { ...gf, children: ch };
		}, gfId);
	};

	const handleGroupSelectCell = (childRowId, childColId, gfId) => {
		setSelCell({ fieldId: gfId, childRowId, childColId });
	};

	const getGroupChildField = () => {
		if (!selCell || !selCell.childRowId || !selCell.childColId) return null;
		// Search all rows/columns for the group by fieldId
		const gfId = selCell.fieldId;
		if (!gfId) return null;
		let gf = null;
		const findGroup = (rowList) => {
			for (const r of rowList) {
				for (const c of r.columns || []) {
					if (c.field && c.field.id === gfId && c.field.type === 'group') { gf = c.field; return; }
					if (c.field && c.field.type === 'group') findGroup(c.field.children || []);
				}
			}
		};
		findGroup(rows);
		if (!gf) return null;
		return (gf.children || []).find(r => r.id === selCell.childRowId)?.columns.find(c => c.id === selCell.childColId)?.field || null;
	};

	const exportJSON = () => {
		const blob = new Blob([JSON.stringify({ name: formName, version: "2.0", created: new Date().toISOString(), layout: rows, flow: { nodes: flowNodes, edges: flowEdges } }, null, 2)], { type: "application/json" });
		const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${formName.replace(/\s+/g, "_")}.json`; a.click();
		showToast(t('templateExported'));
	};

	const importJSON = () => {
		try {
			const t = JSON.parse(importTxt);
			if (!t.layout) throw new Error();
			setRows(t.layout);
			if (t.flow) {
				setFlowNodes(t.flow.nodes || INIT_FLOW_NODES);
				setFlowEdges(t.flow.edges || INIT_FLOW_EDGES);
			} else {
				setFlowNodes(INIT_FLOW_NODES);
				setFlowEdges(INIT_FLOW_EDGES);
			}
			setFormName(t('untitledForm')); setSelCell(null);
			setShowImport(false); setImportTxt(""); showToast(t('templateLoaded'));
		} catch { showToast(t('invalidJson'), "err"); }
	};

	const loadTemplateFromDb = async (idToLoad) => {
		if (!idToLoad) return;
		try {
			const apiUrl = process.env.REACT_APP_API_URL || '';
			const res = await fetch(`${apiUrl}/formTemplates/${idToLoad}`);
			if (res.ok) {
				const data = await res.json();
				const t = JSON.parse(data.template);
				if (!t.layout) throw new Error();
				setRows(t.layout);
				if (t.flow) {
					setFlowNodes(t.flow.nodes || INIT_FLOW_NODES);
					setFlowEdges(t.flow.edges || INIT_FLOW_EDGES);
				} else {
					setFlowNodes(INIT_FLOW_NODES);
					setFlowEdges(INIT_FLOW_EDGES);
				}
				setFormName(t.name || data.title || t('untitledForm')); setSelCell(null);
				setCurrentTemplateId(data._id);
				showToast(t('templateLoadedDb'));
			} else {
				showToast(t('failedLoadTemplate'), "err");
			}
		} catch { showToast(t('errorParsingTemplate'), "err"); }
	};

	const saveTemplateToDb = async () => {
		try {
			const apiUrl = process.env.REACT_APP_API_URL || '';
			const token = getStorageItem('accessToken');
			if (!token) { showToast(t('mustBeLoggedInSave'), "err"); return; }

			// Validate form name
			const trimmedName = formName.trim();
			if (!trimmedName || trimmedName === 'Untitled Form' || trimmedName === t('untitledForm')) {
				showToast(t('mustNameForm') || 'Please give your form a name before saving.', "err");
				return;
			}

			// Validate flow: Start node must have allowedSubmitRoles
			const startNode = flowNodes.find(n => n.type === 'start');
			if (startNode && (!startNode.data.allowedSubmitRoles || startNode.data.allowedSubmitRoles.length === 0)) {
				showToast(t('startNodeNeedsRoles') || 'Start node must have at least one allowed submit role.', "err");
				return;
			}

			// Validate flow: Each Approval node must have assigned roles or specific users
			const approvalNodes = flowNodes.filter(n => n.type === 'approval');
			for (const aNode of approvalNodes) {
				const hasRoles = aNode.data.assignedRoles && aNode.data.assignedRoles.length > 0;
				const hasUsers = aNode.data.specificUsers && aNode.data.specificUsers.length > 0;
				if (!hasRoles && !hasUsers) {
					showToast(t('approvalNodeNeedsAssignees') || `Approval node "${aNode.data.label}" needs assigned roles or users.`, "err");
					return;
				}
			}

			const templateObj = { name: formName, version: "2.0", created: new Date().toISOString(), layout: rows, flow: { nodes: flowNodes, edges: flowEdges } };
			const payload = {
				template: JSON.stringify(templateObj),
				...(currentTemplateId ? { previousTemplateId: currentTemplateId } : {})
			};

			const res = await fetch(`${apiUrl}/formTemplates`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`
				},
				body: JSON.stringify(payload)
			});

			const data = await res.json();
			if (res.ok) {
				setCurrentTemplateId(data._id);
				showToast(t('savedDbSuccess'));

				// If we were working on a draft, delete it from the in progress section of the dashboard, now that it's a real template
				if (currentDraftId) {
					try {
						await fetch(`${apiUrl}/draftFormTemplates/${currentDraftId}`, {
							method: 'DELETE',
							headers: { 'Authorization': `Bearer ${token}` }
						});
						setCurrentDraftId(null);
					} catch (err) {
						console.error("Failed to delete draft after save", err);
					}
				}

				// Refresh templates dropdown
				const refreshRes = await fetch(`${apiUrl}/formTemplates`);
				if (refreshRes.ok) setDbTemplates(await refreshRes.json());

			} else {
				showToast(data.message || t('failedSaveTemplate'), "err");
			}
		} catch (err) {
			showToast(t('networkErrorSaveTemplate'), "err");
		}
	};

	const deleteTemplateFromDb = async () => {
		if (!currentTemplateId) return;
		try {
			const apiUrl = process.env.REACT_APP_API_URL || '';
			const token = getStorageItem('accessToken');
			if (!token) { showToast(t('mustBeLoggedInDelete'), "err"); return; }

			const res = await fetch(`${apiUrl}/formTemplates/${currentTemplateId}/soft-delete`, {
				method: 'POST',
				headers: { 'Authorization': `Bearer ${token}` }
			});

			if (res.ok) {
				showToast(t('templateDeprecatedSuccess'));
				setRows([mkRow(1)]);
				setFormName(t('untitledForm'));
				setCurrentTemplateId(null);
				setSelectedDropdownId("");
				setFlowNodes(INIT_FLOW_NODES);
				setFlowEdges(INIT_FLOW_EDGES);

				// Refresh templates dropdown
				const refreshRes = await fetch(`${apiUrl}/formTemplates`);
				if (refreshRes.ok) setDbTemplates(await refreshRes.json());
			} else {
				const data = await res.json();
				showToast(data.message || t('failedDeprecateTemplate'), "err");
			}
		} catch (err) {
			showToast(t('networkErrorDeprecateTemplate'), "err");
		}
	};

	const saveDraft = async () => {
		const token = getStorageItem('accessToken');
		if (!token) { showToast(t('mustBeLoggedInDraft'), 'err'); return; }

		const apiUrl = process.env.REACT_APP_API_URL || '';
		const templateObj = {
			name: formName,
			version: '2.0',
			created: new Date().toISOString(),
			layout: rows,
			flow: { nodes: flowNodes, edges: flowEdges }
		};
		try {
			const res = await fetch(`${apiUrl}/draftFormTemplates`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
				body: JSON.stringify({
					template: JSON.stringify(templateObj),
					...(currentDraftId ? { draftId: currentDraftId } : {})
				})
			});
			const data = await res.json();
			if (res.ok) {
				setCurrentDraftId(data._id);
				showToast(t('draftSaved'));
			} else {
				showToast(data.message || t('failedSaveDraft'), 'err');
			}
		} catch {
			showToast(t('networkErrorSaveDraft'), 'err');
		}
	};

	const selectedField = getField();
	const stats = { rows: rows.length, fields: allFields().length, required: allFields().filter(f => f.required).length };

	// Auto-numbering computation
	const computeNumbering = () => {
		const map = {};
		let sectionNum = 0;
		let itemNum = 0;
		const walkRows = (rowList, prefix) => {
			for (const row of rowList) {
				for (const col of row.columns || []) {
					const f = col.field;
					if (!f) continue;
					if (f.type === 'group') {
						sectionNum++;
						map[f.id] = String(sectionNum);
						walkRows(f.children || [], sectionNum + '.');
					} else {
						itemNum++;
						map[f.id] = prefix ? prefix + String(itemNum) : null;
					}
				}
			}
		};
		walkRows(rows, '');
		// Second pass: number non-group items sequentially if not under a group
		// Actually, let's simplify: groups get numbers 1,2,3; items under group X get X.1, X.2; items outside groups get no number
		const map2 = {};
		let sec = 0;
		const walk = (rowList, base) => {
			for (const row of rowList) {
				for (const col of row.columns || []) {
					const f = col.field;
					if (!f) continue;
					if (f.type === 'group') {
						sec++;
						map2[f.id] = String(sec);
						let sub = 0;
						for (const cr of (f.children || [])) {
							for (const cc of (cr.columns || [])) {
								if (cc.field) {
									sub++;
									map2[cc.field.id] = sec + '.' + sub;
								}
							}
						}
					}
				}
			}
		};
		walk(rows, '');
		return map2;
	};
	const numberingMap = showNumbering ? computeNumbering() : {};

	const togglePreview = () => {
		if (tab === "preview") {
			setTab(prevTab);
		} else {
			setPrevTab(tab);
			setTab("preview");
		}
	};

	return (
		<div className="fb-page">

			{/* Top Bar */}
			<div className="fb-topbar">
				<div className="fb-logo-container" onClick={() => navigate("/dashboard")}>
					<img src={isDark ? '/bannerDark.png' : '/bannerLight.png'} alt="IPT Logo" style={{ height: '50px', margin: 0, padding: 0, objectFit: 'contain' }} />
					<span className="fb-logo" style={{ marginLeft: '4px' }}>FORM<span className="fb-logo-separator"> </span>BUILDER</span>
				</div>
				<div className="fb-topbar-divider" />
				<input value={formName} onChange={e => setFormName(e.target.value)} className="fb-form-name-input" />
				<div className="fb-topbar-actions">
					{/* Template ↔ Flow toggle */}
					<button
						className="fb-toggle-btn"
						onClick={() => setTab(tab === "flow" ? "template" : "flow")}
					>
						{tab === "flow" ? t('templateTab').toUpperCase() : t('flowTab').toUpperCase()}
					</button>

					{/* Preview + Actions split button */}
					<div className="fb-split-btn">
						<button onClick={togglePreview} className={`fb-split-btn-main${tab === 'preview' ? ' active' : ''}`}>
							{tab === 'preview' ? (prevTab === 'flow' ? t('flowTab').toUpperCase() : t('templateTab').toUpperCase()) : t('previewTab').toUpperCase()}
						</button>
						<button className="fb-split-btn-toggle" onClick={() => setShowMenu(!showMenu)} title={t('moreOptions')}>
							<span className="fb-split-btn-chevron">▼</span>
						</button>
						{showMenu && (
							<>
								<div className="fb-split-btn-backdrop" onClick={() => setShowMenu(false)} />
								<div className="fb-split-btn-menu">
									<button onClick={() => { setShowMenu(false); setShowSaveConfirm(true); }} className="fb-split-btn-item">
										{currentTemplateId ? `📝 ${t('modifyTemplate')}` : `✨ ${t('createTemplate')}`}
									</button>
									<button onClick={() => { setShowMenu(false); saveDraft(); }} className="fb-split-btn-item">
										💾 {t('saveDraft')}
									</button>
									{currentTemplateId && (
										<button onClick={() => { setShowMenu(false); setShowDeleteConfirm(true); }} className="fb-split-btn-item" style={{ color: 'var(--color-danger)' }}>
											⚠️ {t('deprecateTemplate')}
										</button>
									)}
									<div style={{ height: '1px', background: 'var(--color-divider)', margin: '4px 0' }} />
									<button onClick={() => { setShowMenu(false); setShowImport(true); }} className="fb-split-btn-item">
										📥 {t('import')}
									</button>
									<button onClick={() => { setShowMenu(false); exportJSON(); }} className="fb-split-btn-item">
										📤 {t('exportJson')}
									</button>
									{isMobile && (
										<>
											<div style={{ height: '1px', background: 'var(--color-divider)', margin: '4px 0' }} />
											<div style={{ padding: '6px 12px', fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
												{t('loadTemplate')}
											</div>
											<div style={{ maxHeight: '200px', overflowY: 'auto' }}>
												{dbTemplates.map(t2 => (
													<button key={t2._id} onClick={() => {
														setSelectedDropdownId(t2._id);
														loadTemplateFromDb(t2._id);
														setShowMenu(false);
													}} className="fb-split-btn-item" style={{ whiteSpace: 'normal', wordWrap: 'break-word', textAlign: 'left', padding: '8px 12px' }}>
														{t2.title} (v{t2.version})
													</button>
												))}
												{dbTemplates.length === 0 && <div style={{ padding: '6px 12px', color: 'var(--color-text-muted)' }}>No templates</div>}
											</div>
										</>
									)}
								</div>
							</>
						)}
					</div>

					{/* Auto-numbering — desktop only (moved to palette on mobile) */}
					<button onClick={() => setShowNumbering(!showNumbering)} className={`fb-btn fb-topbar-numbering-desktop ${showNumbering ? "active" : ""}`} title="Toggle auto-numbering">{showNumbering ? '🔢' : '◌'} #</button>

					{/* Desktop Load Template Dropdown */}
					{!isMobile && (
						<div style={{ position: 'relative', marginLeft: '12px' }}>
							<button className="fb-select" style={{ width: '150px', maxWidth: '150px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', textAlign: 'left', paddingRight: '20px', cursor: 'pointer' }} onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}>
								{selectedDropdownId ? dbTemplates.find(t => t._id === selectedDropdownId)?.title + ` (v${dbTemplates.find(t => t._id === selectedDropdownId)?.version})` : t('loadTemplate')}
							</button>
							{showTemplateDropdown && (
								<>
									<div className="fb-split-btn-backdrop" onClick={() => setShowTemplateDropdown(false)} />
									<div className="fb-split-btn-menu" style={{ right: 0, top: '100%', minWidth: '200px', maxWidth: '300px', maxHeight: '400px', overflowY: 'auto', zIndex: 1000 }}>
										{dbTemplates.map(t2 => (
											<button key={t2._id} className="fb-split-btn-item" style={{ whiteSpace: 'normal', wordWrap: 'break-word', textAlign: 'left', padding: '8px 12px' }} onClick={() => {
												setSelectedDropdownId(t2._id);
												loadTemplateFromDb(t2._id);
												setShowTemplateDropdown(false);
											}}>
												{t2.title} (v{t2.version})
											</button>
										))}
										{dbTemplates.length === 0 && <div style={{ padding: '8px 12px', color: 'var(--color-text-muted)' }}>No templates</div>}
									</div>
								</>
							)}
						</div>
					)}
				</div>

				{/* Nav icons: theme, language, avatar */}
				<div className="fb-topbar-nav-icons">
					<button onClick={cycleTheme} className="theme-toggle-btn" title={themeMode} style={{ fontSize: '1.1rem', padding: '4px' }}>
						{themeIcon}
					</button>
					<LanguageSelector />
					<img
						src={(currentUser && currentUser.avatarIcon) || defaultAvatar}
						alt="User"
						className="fb-topbar-avatar"
						onClick={() => navigate('/settings')}
						title={currentUser ? currentUser.username || currentUser.email : 'Settings'}
					/>
				</div>
			</div>

			<div className="fb-main" style={tab === "flow" ? { padding: 0 } : {}}>

				{tab === "flow" && (
					<FlowEditor nodes={flowNodes} setNodes={setFlowNodes} edges={flowEdges} setEdges={setFlowEdges} />
				)}

				{/* Left Palette */}
				{tab === "template" && (
					<div className="fb-panel-left">

						<div className="fb-section-title">{t('dragElements')}</div>
						{PALETTE_ITEMS.map(item => (
							<div key={item.type} draggable onDragStart={() => { drag.current = { source: "palette", type: item.type }; }} onClick={() => setSelectedPaletteItem(item.type)} className={`fb-palette-item ${selectedPaletteItem === item.type ? 'selected' : ''}`} title={t(item.type + 'Field')}>
								<span className="fb-palette-icon">{item.icon}</span>
								{t(item.type + 'Field')}
							</div>
						))}
						{/* Auto-numbering toggle — shown in palette on mobile */}
						{isMobile && (
							<button
								onClick={() => setShowNumbering(!showNumbering)}
								className={`fb-palette-numbering-btn ${showNumbering ? 'active' : ''}`}
								title="Toggle auto-numbering"
							>
								#
							</button>
						)}

						<div className="fb-section-title" style={{ marginTop: "10px" }}>{t('addRow')}</div>
						{[1, 2, 3, 4].map(n => (
							<div key={n} onClick={() => addRow(n)} className="fb-add-row-item">
								<span className="fb-col-preview">
									{Array.from({ length: n }, (_, i) => <span key={i} style={{ width: `${Math.floor(36 / n)}px` }} />)}
								</span>
								<span>+ {n} {n > 1 ? t('colsPlural') : t('colSingular')}</span>
							</div>
						))}

						<div className="fb-stats-box">
							<div className="fb-section-title" style={{ padding: "0 0 8px 0" }}>{t('stats')}</div>
							{[[t('statsRows'), stats.rows], [t('statsFields'), stats.fields], [t('statsRequired'), stats.required]].map(([k, v]) => (
								<div key={k} className="fb-stat-row">
									<span>{k}</span><span className="fb-stat-val">{v}</span>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Canvas */}
				{tab !== "flow" && (
					<div className="fb-canvas" onClick={e => { if (e.target === e.currentTarget) setSelCell(null); }}>

						{tab === "template" && (
							<>
								{rows.map((row, ri) => {
									// Check if this row contains any group columns
									const groupCols = row.columns.filter(c => c.field && c.field.type === 'group');
									if (groupCols.length === 0) {
										return (
											<RowComp key={row.id} row={row} rowIndex={ri} totalRows={rows.length}
												selectedCell={selCell}
												onSelectCell={(rid, cid) => setSelCell({ rowId: rid, colId: cid })}
												onDropOnCol={handleDropOnCol}
												onClearCol={handleClearCol}
												onMoveFieldOut={(rid, cid) => { drag.current = { source: "canvas", rowId: rid, colId: cid }; }}
												onDeleteRow={deleteRow}
												onMoveRow={moveRow}
												onSetCols={setRowCols}
												onDuplicateRow={duplicateRow}
												onSetColSpan={setColSpan}
												onClickEmptySlot={handleEmptySlotClick}
												isPaletteSelected={!!selectedPaletteItem}
												onDragStartRow={(e, rid) => handleRowDragStart(e, rid, null)}
												onDragOverRow={(e, rid) => handleRowDragOver(e, rid, null)}
												onDragLeaveRow={(e, rid) => handleRowDragLeave(e, rid)}
												onDropRow={(e, rid) => handleRowDrop(e, rid, null)}
												onDragEndRow={handleRowDragEnd}
												draggedRowId={draggedRowId}
												dragOverRowId={dragOverRowId}
												onJumpRow={jumpRow}
											/>
										);
									}
									// Row contains groups — render inline group editors
									return (
										<div key={row.id} 
											className={`fb-row ${draggedRowId === row.id ? 'dragging' : ''} ${dragOverRowId === row.id ? 'drag-over' : ''}`}
											style={{ marginBottom: '16px' }}
											onDragOver={e => handleRowDragOver(e, row.id, null)}
											onDragLeave={e => handleRowDragLeave(e, row.id)}
											onDrop={e => handleRowDrop(e, row.id, null)}
										>
											<div className="fb-row-toolbar">
												<div 
													className="fb-row-drag-handle"
													draggable
													onDragStart={e => handleRowDragStart(e, row.id, null)}
													onDragEnd={handleRowDragEnd}
													style={{ cursor: 'grab', marginRight: '6px', color: 'var(--color-text-placeholder)', padding: '2px 4px', display: 'flex', alignItems: 'center' }}
													title="Drag to reorder row"
												>
													⠿
												</div>
												<span className="fb-row-label" style={{ display: 'flex', alignItems: 'center' }}>
													{t('rowNum')}
													<input 
														type="number"
														defaultValue={ri + 1}
														key={ri + 1}
														min={1}
														max={rows.length}
														onBlur={e => {
															const val = parseInt(e.target.value, 10);
															if (!isNaN(val) && val >= 1 && val <= rows.length && val !== ri + 1) {
																jumpRow(row.id, val);
															} else {
																e.target.value = ri + 1;
															}
														}}
														onKeyDown={e => {
															if (e.key === 'Enter') {
																e.target.blur();
															}
														}}
														className="fb-row-number-input"
														title="Change row position"
													/>
												</span>
												<span className="fb-row-divider">│</span>
												<span className="fb-row-label">{t('colsLabel')}</span>
												{[1, 2, 3, 4].map(n => (
													<button key={n} onClick={() => setRowCols(row.id, n)}
														className={`fb-btn-icon ${row.columns.length === n ? 'active' : ''}`}
														style={{ fontSize: '11px', color: row.columns.length === n ? 'var(--color-accent-light)' : 'var(--color-text-placeholder)', fontWeight: row.columns.length === n ? 'bold' : 'normal' }}>{n}</button>
												))}
												{row.columns.length > 1 && (
													<>
														<span className="fb-row-divider">│</span>
														<span className="fb-row-label">{t('widthsLabel')}</span>
														{row.columns.map((col, ci) => (
															<div key={col.id} className="fb-span-control">
																<button className="fb-span-btn" onClick={() => setColSpan(row.id, col.id, Math.max(1, (col.span || 1) - 1))} disabled={(col.span || 1) <= 1}>−</button>
																<span className="fb-span-value">{col.span || 1}</span>
																<button className="fb-span-btn" onClick={() => setColSpan(row.id, col.id, Math.min(12, (col.span || 1) + 1))} disabled={(col.span || 1) >= 12}>+</button>
															</div>
														))}
														<button className="fb-span-reset" onClick={() => row.columns.forEach(c => setColSpan(row.id, c.id, 1))}>⟳</button>
													</>
												)}
												<div style={{ flex: 1 }} />
												<button disabled={ri === 0} onClick={() => moveRow(row.id, "top")} className="fb-btn-icon" style={{ opacity: ri === 0 ? 0.3 : 1 }} title="Move to Top">⯭</button>
												<button disabled={ri === 0} onClick={() => moveRow(row.id, -1)} className="fb-btn-icon" style={{ opacity: ri === 0 ? 0.3 : 1 }}>↑</button>
												<button disabled={ri === rows.length - 1} onClick={() => moveRow(row.id, 1)} className="fb-btn-icon" style={{ opacity: ri === rows.length - 1 ? 0.3 : 1 }}>↓</button>
												<button disabled={ri === rows.length - 1} onClick={() => moveRow(row.id, "bottom")} className="fb-btn-icon" style={{ opacity: ri === rows.length - 1 ? 0.3 : 1 }} title="Move to Bottom">⯯</button>
												<button onClick={() => duplicateRow(row.id)} className="fb-btn" style={{ marginLeft: '6px', padding: '4px 8px', fontSize: '11px' }}>⎘ {t('dupBtn')}</button>
												<button onClick={() => deleteRow(row.id)} className="fb-btn-danger" style={{ marginLeft: '6px' }}>✕ {t('rowBtn')}</button>
											</div>
											<div className="fb-cols-container">
												{row.columns.map((col, ci) => {
													const isGroup = col.field && col.field.type === 'group';
													if (!isGroup) {
														return (
															<ColSlot key={col.id} col={col} rowId={row.id} colIndex={ci} totalCols={row.columns.length}
																selected={selCell && !selCell.childRowId && selCell.rowId === row.id && selCell.colId === col.id}
																onSelect={(rid, cid) => setSelCell({ rowId: rid, colId: cid })}
																onDrop={handleDropOnCol}
																onClear={handleClearCol}
																onMoveOut={(rid, cid) => { drag.current = { source: "canvas", rowId: rid, colId: cid }; }}
																onClickEmptySlot={handleEmptySlotClick}
																isPaletteSelected={!!selectedPaletteItem}
															/>
														);
													}
													const gf = col.field;
													return (
														<div key={col.id} className="fb-col-slot" style={{ flex: col.span || 1 }}
															onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
															onDrop={e => { e.preventDefault(); e.stopPropagation(); handleDropOnCol(row.id, col.id); }}
															onClick={() => setSelCell({ rowId: row.id, colId: col.id })}>
															<div style={{ border: '2px solid var(--color-accent-light, #10b981)', borderRadius: '10px', padding: '12px', background: 'var(--color-bg-elevated)', cursor: 'pointer' }}>
																<div className="fb-row-toolbar" style={{ marginBottom: '8px' }}>
																	<span className="fb-row-label" style={{ fontSize: '12px', ...buildStyle(gf.labelStyle) }}>📁 {gf.label || 'Group'}</span>
																	<div style={{ flex: 1 }} />
																	<button onClick={e => { e.stopPropagation(); handleClearCol(row.id, col.id); }} className="fb-btn-danger" style={{ padding: '2px 8px', fontSize: '10px' }}>✕</button>
																</div>
																{(gf.children || []).map((childRow, cri) => (
																	<React.Fragment key={childRow.id}>
																		<RowComp row={childRow} rowIndex={cri} totalRows={(gf.children || []).length}
																			selectedCell={selCell && selCell.childRowId === childRow.id ? { rowId: selCell.childRowId, colId: selCell.childColId } : null}
																			onSelectCell={(rid, cid) => handleGroupSelectCell(rid, cid, gf.id)}
																			onDropOnCol={(rid, cid) => handleGroupDropOnCol(rid, cid, gf.id)}
																			onClearCol={(rid, cid) => handleGroupClearCol(rid, cid, gf.id)}
																			onMoveFieldOut={(rid, cid) => { drag.current = { source: "canvas", rowId: rid, colId: cid }; }}
																			onDeleteRow={(rid) => groupDeleteRow(rid, gf.id)}
																			onMoveRow={(rid, dir) => groupMoveRow(rid, dir, gf.id)}
																			onSetCols={(rid, n) => groupSetRowCols(rid, n, gf.id)}
																			onDuplicateRow={(rid) => groupDuplicateRow(rid, gf.id)}
																			onSetColSpan={(rid, cid2, sp) => groupSetColSpan(rid, cid2, sp, gf.id)}
																			onClickEmptySlot={(rid, cid) => handleGroupEmptySlotClick(rid, cid, gf.id)}
																			isPaletteSelected={!!selectedPaletteItem}
																			onDragStartRow={(e, rid) => handleRowDragStart(e, rid, gf.id)}
																			onDragOverRow={(e, rid) => handleRowDragOver(e, rid, gf.id)}
																			onDragLeaveRow={(e, rid) => handleRowDragLeave(e, rid)}
																			onDropRow={(e, rid) => handleRowDrop(e, rid, gf.id)}
																			onDragEndRow={handleRowDragEnd}
																			draggedRowId={draggedRowId}
																			dragOverRowId={dragOverRowId}
																			onJumpRow={(rid, pos) => groupJumpRow(rid, pos, gf.id)}
																		/>
																	</React.Fragment>
																))}
																<div className="fb-canvas-add-row">
																	<span className="fb-row-label">{t('newRowLabel')}</span>
																	{[1, 2, 3, 4].map(n => (
																		<button key={n} onClick={() => { setSelCell({ rowId: row.id, colId: col.id }); groupAddRow(n, gf.id); }} className="fb-btn-add-row">
																			<span className="fb-col-preview">{Array.from({ length: n }, (_, i) => <span key={i} style={{ width: "12px" }} />)}</span>
																			<span>{n} {n > 1 ? t('colsPlural') : t('colSingular')}</span>
																		</button>
																	))}
																</div>
															</div>
														</div>
													);
												})}
											</div>
										</div>
									);
								})}

								{/* Add row strip */}
								<div className="fb-canvas-add-row">
									<span className="fb-row-label">{t('newRowLabel')}</span>
									{[1, 2, 3, 4].map(n => (
										<button key={n} onClick={() => addRow(n)} className="fb-btn-add-row">
											<span className="fb-col-preview">
												{Array.from({ length: n }, (_, i) => <span key={i} style={{ width: "12px" }} />)}
											</span>
											<span>{n} {n > 1 ? t('colsPlural') : t('colSingular')}</span>
										</button>
									))}
								</div>
							</>
						)}

						{tab === "preview" && (
							<div className="fb-preview-card">
								<h2 className="fb-preview-title">{formName}</h2>
								{rows.map(row => (
									<div key={row.id} style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
										{row.columns.map(col => (
											<div key={col.id} style={{ flex: col.span || 1, minWidth: 0 }}>
												{col.field ? <FieldPreview field={col.field} number={numberingMap[col.field.id]} /> : null}
											</div>
										))}
									</div>
								))}
								{stats.fields > 0 && (
									<button className="fb-preview-submit">{t('submitArrow')}</button>
								)}
								{stats.fields === 0 && <p style={{ color: "var(--color-text-placeholder)", fontSize: "14px", textAlign: "center" }}>{t('noFieldsAdded')}</p>}
							</div>
						)}
					</div>
				)}

				{/* Right Properties */}
				{tab === "template" && (
					<div className="fb-panel-right">
						<div className="fb-section-title">{t('properties')}</div>
						<PropsPanel field={selectedField} onChange={handleUpdateField} onDelete={handleDeleteField} />
					</div>
				)}

			{/* Properties Overlay Modal — mobile only */}
			{isMobile && showPropsModal && (
				<div className="fb-props-modal-overlay" onClick={() => setShowPropsModal(false)}>
					<div className="fb-props-modal" onClick={e => e.stopPropagation()}>
						<div className="fb-props-modal-header">
							<div className="fb-section-title" style={{ padding: 0, margin: 0 }}>{t('properties')}</div>
							<button className="fb-props-modal-close" onClick={() => setShowPropsModal(false)}>✕</button>
						</div>
						<PropsPanel field={selectedField} onChange={handleUpdateField} onDelete={() => { handleDeleteField(); setShowPropsModal(false); }} />
					</div>
				</div>
			)}
			</div>

			{/* Import Modal */}
			{showImport && (
				<div className="fb-modal-overlay">
					<div className="fb-modal">
						<div className="fb-modal-title">{t('importTemplate')}</div>
						<textarea value={importTxt} onChange={e => setImportTxt(e.target.value)} placeholder="Paste exported JSON here..." className="fb-textarea" style={{ height: "180px", resize: "vertical" }} />
						<div className="fb-modal-actions">
							<button onClick={() => { setShowImport(false); setImportTxt(""); }} className="fb-btn">{t('cancelCaps')}</button>
							<button onClick={importJSON} className="fb-btn-primary">{t('loadCaps')}</button>
						</div>
					</div>
				</div>
			)}

			{/* Save Confirm Modal */}
			{showSaveConfirm && (
				<div className="fb-modal-overlay">
					<div className="fb-modal">
						<div className="fb-modal-title">{t('confirmSave')}</div>
						<p style={{ margin: "20px 0", fontSize: "15px", color: "var(--color-text-secondary)" }}>
							{currentTemplateId ? t('confirmModifyTemplate') : t('confirmCreateTemplate')}
						</p>
						<div className="fb-modal-actions">
							<button onClick={() => setShowSaveConfirm(false)} className="fb-btn">{t('cancelCaps')}</button>
							<button onClick={() => { setShowSaveConfirm(false); saveTemplateToDb(); }} className="fb-btn-primary" style={{ backgroundColor: 'var(--color-accent-light)' }}>{t('confirmCaps')}</button>
						</div>
					</div>
				</div>
			)}

			{/* Delete Confirm Modal */}
			{showDeleteConfirm && (
				<div className="fb-modal-overlay">
					<div className="fb-modal">
						<div className="fb-modal-title" style={{ color: 'var(--color-danger)' }}>{t('deprecateTemplate')}</div>
						<p style={{ margin: "20px 0", fontSize: "15px", color: "var(--color-text-secondary)" }}>
							{t('confirmDeprecateTemplateDesc')}
						</p>
						<div className="fb-modal-actions">
							<button onClick={() => setShowDeleteConfirm(false)} className="fb-btn">{t('cancelCaps')}</button>
							<button onClick={() => { setShowDeleteConfirm(false); deleteTemplateFromDb(); }} className="fb-btn-danger">{t('deprecateCaps')}</button>
						</div>
					</div>
				</div>
			)}

			{/* Toast */}
			{toast && (
				<div className={`fb-toast ${toast.type === "err" ? "fb-toast-err" : "fb-toast-ok"}`}>
					{toast.msg}
				</div>
			)}
		</div>
	);
}