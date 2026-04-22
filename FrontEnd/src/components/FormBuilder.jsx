import { useState, useRef } from "react";
import "./FormBuilder.css";
import iptLogo from '../assets/IPT_LOGO.jpg';

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
	{ type: "divider", label: "Divider", icon: "—" },
];

const FIELD_DEFAULTS = {
	heading: { label: "Section Title", level: "h2" },
	label: { label: "Paragraph text goes here." },
	text: { label: "Text Field", placeholder: "Enter text...", required: false },
	email: { label: "Email Address", placeholder: "you@example.com", required: false },
	number: { label: "Number", placeholder: "0", required: false, min: "", max: "" },
	textarea: { label: "Message", placeholder: "Write something...", required: false, rows: 3 },
	dropdown: { label: "Select Option", required: false, options: ["Option A", "Option B", "Option C"] },
	radio: { label: "Choose One", required: false, options: ["Choice 1", "Choice 2", "Choice 3"] },
	checkbox: { label: "Select All", required: false, options: ["Item 1", "Item 2", "Item 3"] },
	date: { label: "Date", required: false },
	file: { label: "Upload File", required: false, accept: "*", multiple: false },
	divider: {},
};

let _id = 1;
const uid = () => `f${_id++}`;
const urow = () => `r${_id++}`;
const ucol = () => `c${_id++}`;

const mkField = (type) => ({ id: uid(), type, ...JSON.parse(JSON.stringify(FIELD_DEFAULTS[type])) });
const mkCol = (field = null) => ({ id: ucol(), field });
const mkRow = (cols = 1) => ({ id: urow(), columns: Array.from({ length: cols }, () => mkCol()) });


// ─── Field Preview ────────────────────────────────────────────────────────────
function FieldPreview({ field, compact }) {
	const req = field.required ? <span className="fbp-req">*</span> : null;
	const c = compact ? " compact" : "";

	switch (field.type) {
		case "heading": {
			const sz = { h1: "24px", h2: "18px", h3: "15px" }[field.level] || "18px";
			return <div className="fbp-heading" style={{ fontSize: sz }}>{field.label}</div>;
		}
		case "label":
			return <p className="fbp-p">{field.label}</p>;
		case "text": case "email": case "number":
			return <div className="fbp-wrapper"><label className="fbp-label">{field.label}{req}</label><input type={field.type} placeholder={field.placeholder} className={"fbp-input" + c} /></div>;
		case "textarea":
			return <div className="fbp-wrapper"><label className="fbp-label">{field.label}{req}</label><textarea placeholder={field.placeholder} rows={compact ? 2 : field.rows} className={"fbp-textarea" + c} style={{ resize: "none" }} /></div>;
		case "dropdown":
			return <div className="fbp-wrapper"><label className="fbp-label">{field.label}{req}</label><select className={"fbp-select" + c}>{field.options.map((o, i) => <option key={i}>{o}</option>)}</select></div>;
		case "radio":
			return <div className="fbp-wrapper"><label className="fbp-label">{field.label}{req}</label>{field.options.slice(0, compact ? 2 : 99).map((o, i) => <label key={i} className="fbp-radio-check-wrap"><input type="radio" name={field.id} />{o}</label>)}{compact && field.options.length > 2 && <span className="fbp-more">+{field.options.length - 2} more</span>}</div>;
		case "checkbox":
			return <div className="fbp-wrapper"><label className="fbp-label">{field.label}{req}</label>{field.options.slice(0, compact ? 2 : 99).map((o, i) => <label key={i} className="fbp-radio-check-wrap"><input type="checkbox" />{o}</label>)}{compact && field.options.length > 2 && <span className="fbp-more">+{field.options.length - 2} more</span>}</div>;
		case "date":
			return <div className="fbp-wrapper"><label className="fbp-label">{field.label}{req}</label><input type="date" className={"fbp-input" + c} /></div>;
		case "file":
			return <div className="fbp-wrapper"><label className="fbp-label">{field.label}{req}</label><input type="file" accept={field.accept} multiple={field.multiple} className={"fbp-input" + c} /></div>;
		case "divider":
			return <hr style={{ border: "none", borderTop: `1px solid #cbd5e0`, margin: "16px 0" }} />;
		default: return null;
	}
}

// ─── Properties Panel ─────────────────────────────────────────────────────────
function PropsPanel({ field, onChange, onDelete }) {
	if (!field) return (
		<div className="fb-props-empty">
			<div className="fb-props-empty-icon">◧</div>
			<div className="fb-props-empty-text">Click a field<br />to edit</div>
		</div>
	);

	const upd = (patch) => onChange({ ...field, ...patch });
	const updOpts = (raw) => upd({ options: raw.split("\n") });

	return (
		<div className="fb-props-content">
			<div className="fb-props-header">
				<span className="fb-props-type">{field.type.toUpperCase()}</span>
				<button onClick={onDelete} className="fb-btn-danger">✕ DEL</button>
			</div>

			{field.type !== "divider" && (<div className="fb-field-group"><label className="fb-label">Label</label><input className="fb-input" value={field.label} onChange={e => upd({ label: e.target.value })} /></div>)}
			{field.type === "heading" && (<div className="fb-field-group"><label className="fb-label">Level</label><select className="fb-select" value={field.level} onChange={e => upd({ level: e.target.value })}><option value="h1">H1 — Large</option><option value="h2">H2 — Medium</option><option value="h3">H3 — Small</option></select></div>)}
			{["text", "email", "number", "textarea"].includes(field.type) && (<div className="fb-field-group"><label className="fb-label">Placeholder</label><input className="fb-input" value={field.placeholder} onChange={e => upd({ placeholder: e.target.value })} /></div>)}
			{field.type === "textarea" && (<div className="fb-field-group"><label className="fb-label">Rows</label><input type="number" className="fb-input" value={field.rows} min={2} max={10} onChange={e => upd({ rows: +e.target.value || 3 })} /></div>)}
			{field.type === "number" && (<><div className="fb-field-group"><label className="fb-label">Min</label><input type="number" className="fb-input" value={field.min} onChange={e => upd({ min: e.target.value })} /></div><div className="fb-field-group"><label className="fb-label">Max</label><input type="number" className="fb-input" value={field.max} onChange={e => upd({ max: e.target.value })} /></div></>)}
			{["dropdown", "radio", "checkbox"].includes(field.type) && (<div className="fb-field-group"><label className="fb-label">Options (one per line)</label><textarea className="fb-textarea" style={{ resize: "vertical", minHeight: "80px" }} value={field.options.join("\n")} onChange={e => updOpts(e.target.value)} /></div>)}
			{field.type === "file" && (
				<>
					<div className="fb-field-group">
						<label className="fb-label">Accept</label>
						<input className="fb-input" value={field.accept} placeholder="*  or  image/*  or  .pdf" onChange={e => upd({ accept: e.target.value })} />
					</div>
					<label className="fb-checkbox-label">
						<input type="checkbox" className="fb-checkbox" checked={field.multiple} onChange={e => upd({ multiple: e.target.checked })} />
						MULTIPLE FILES
					</label>
				</>
			)}
			{!["heading", "label", "divider"].includes(field.type) && (
				<label className="fb-checkbox-label">
					<input type="checkbox" className="fb-checkbox" checked={field.required} onChange={e => upd({ required: e.target.checked })} />
					REQUIRED
				</label>
			)}
		</div>
	);
}

// ─── Column Slot ──────────────────────────────────────────────────────────────
function ColSlot({ col, rowId, colIndex, totalCols, selected, onSelect, onDrop, onClear, onMoveOut }) {
	const [over, setOver] = useState(false);
	const isEmpty = !col.field;

	return (
		<div className="fb-col-slot"
			onDragOver={e => { e.preventDefault(); e.stopPropagation(); setOver(true); }}
			onDragLeave={() => setOver(false)}
			onDrop={e => { e.preventDefault(); e.stopPropagation(); setOver(false); onDrop(rowId, col.id); }}>

			{isEmpty ? (
				<div className={`fb-slot-empty ${over ? 'drag-over' : ''}`}>
					<span style={{ fontSize: "16px", opacity: 0.6 }}>⊕</span>
					{over ? "DROP HERE" : `COL ${colIndex + 1} / ${totalCols}`}
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
	onMoveFieldOut, onDeleteRow, onMoveRow, onSetCols }) {
	return (
		<div className="fb-row">
			{/* Row toolbar */}
			<div className="fb-row-toolbar">
				<span className="fb-row-label">ROW {rowIndex + 1}</span>
				<span className="fb-row-divider">│</span>
				<span className="fb-row-label">COLS:</span>
				{[1, 2, 3, 4].map(n => (
					<button key={n} onClick={() => onSetCols(row.id, n)}
						className={`fb-btn-icon ${row.columns.length === n ? 'active' : ''}`} style={{ fontSize: '11px', color: row.columns.length === n ? '#38a169' : '#a0aec0', fontWeight: row.columns.length === n ? 'bold' : 'normal' }}>
						{n}
					</button>
				))}
				<div style={{ flex: 1 }} />
				<button disabled={rowIndex === 0} onClick={() => onMoveRow(row.id, -1)} className="fb-btn-icon" style={{ opacity: rowIndex === 0 ? 0.3 : 1, cursor: rowIndex === 0 ? "default" : "pointer" }}>↑</button>
				<button disabled={rowIndex === totalRows - 1} onClick={() => onMoveRow(row.id, 1)} className="fb-btn-icon" style={{ opacity: rowIndex === totalRows - 1 ? 0.3 : 1, cursor: rowIndex === totalRows - 1 ? "default" : "pointer" }}>↓</button>
				<button onClick={() => onDeleteRow(row.id)} className="fb-btn-danger" style={{ marginLeft: "6px" }}>✕ ROW</button>
			</div>

			{/* Column slots */}
			<div className="fb-cols-container">
				{row.columns.map((col, ci) => (
					<ColSlot key={col.id} col={col} rowId={row.id} colIndex={ci} totalCols={row.columns.length}
						selected={selectedCell?.rowId === row.id && selectedCell?.colId === col.id}
						onSelect={onSelectCell} onDrop={onDropOnCol} onClear={onClearCol} onMoveOut={onMoveFieldOut} />
				))}
			</div>
		</div>
	);
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function FormBuilder() {
	const [rows, setRows] = useState([mkRow(1)]);
	const [formName, setFormName] = useState("Untitled Form");
	const [selCell, setSelCell] = useState(null);
	const [tab, setTab] = useState("build");
	const [toast, setToast] = useState(null);
	const [showImport, setShowImport] = useState(false);
	const [importTxt, setImportTxt] = useState("");
	const drag = useRef(null);

	const showToast = (msg, type = "ok") => { setToast({ msg, type }); setTimeout(() => setToast(null), 2500); };

	const mutRows = (fn) => setRows(prev => fn(JSON.parse(JSON.stringify(prev))));

	const getField = () => {
		if (!selCell) return null;
		return rows.find(r => r.id === selCell.rowId)?.columns.find(c => c.id === selCell.colId)?.field || null;
	};

	const allFields = () => rows.flatMap(r => r.columns.map(c => c.field).filter(Boolean));

	// Drop handler — palette → slot, or canvas → slot (swap)
	const handleDropOnCol = (rowId, colId) => {
		if (!drag.current) return;
		if (drag.current.source === "palette") {
			const field = mkField(drag.current.type);
			mutRows(rs => {
				const col = rs.find(r => r.id === rowId)?.columns.find(c => c.id === colId);
				if (col) col.field = field;
				return rs;
			});
			setSelCell({ rowId, colId });
		} else if (drag.current.source === "canvas") {
			const { rowId: fr, colId: fc } = drag.current;
			if (fr === rowId && fc === colId) { drag.current = null; return; }
			mutRows(rs => {
				const sc = rs.find(r => r.id === fr)?.columns.find(c => c.id === fc);
				const dc = rs.find(r => r.id === rowId)?.columns.find(c => c.id === colId);
				if (sc && dc) { const tmp = sc.field; sc.field = dc.field; dc.field = tmp; }
				return rs;
			});
			setSelCell({ rowId, colId });
		}
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
		mutRows(rs => {
			const col = rs.find(r => r.id === selCell.rowId)?.columns.find(c => c.id === selCell.colId);
			if (col) col.field = updated;
			return rs;
		});
	};

	const handleDeleteField = () => { if (selCell) handleClearCol(selCell.rowId, selCell.colId); };

	const addRow = (cols = 1) => setRows(prev => [...prev, mkRow(cols)]);

	const deleteRow = (rowId) => {
		setRows(prev => prev.length === 1 ? prev : prev.filter(r => r.id !== rowId));
		if (selCell?.rowId === rowId) setSelCell(null);
	};

	const moveRow = (rowId, dir) => {
		mutRows(rs => {
			const i = rs.findIndex(r => r.id === rowId), j = i + dir;
			if (j < 0 || j >= rs.length) return rs;
			[rs[i], rs[j]] = [rs[j], rs[i]];
			return rs;
		});
	};

	const setRowCols = (rowId, n) => {
		mutRows(rs => {
			const row = rs.find(r => r.id === rowId);
			if (!row) return rs;
			while (row.columns.length < n) row.columns.push(mkCol());
			while (row.columns.length > n) row.columns.pop();
			return rs;
		});
	};

	const exportJSON = () => {
		const blob = new Blob([JSON.stringify({ name: formName, version: "2.0", created: new Date().toISOString(), layout: rows }, null, 2)], { type: "application/json" });
		const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${formName.replace(/\s+/g, "_")}.json`; a.click();
		showToast("Template exported!");
	};

	const importJSON = () => {
		try {
			const t = JSON.parse(importTxt);
			if (!t.layout) throw new Error();
			setRows(t.layout); setFormName(t.name || "Imported Form"); setSelCell(null);
			setShowImport(false); setImportTxt(""); showToast("Template loaded!");
		} catch { showToast("Invalid JSON", "err"); }
	};

	const selectedField = getField();
	const stats = { rows: rows.length, fields: allFields().length, required: allFields().filter(f => f.required).length };

	return (
		<div className="fb-page">

			{/* Top Bar */}
			<div className="fb-topbar">
				<img src={iptLogo} alt="IPT Logo" style={{ height: '30px' }} />
				<span className="fb-logo" style={{ marginLeft: '4px' }}>FORM<span className="fb-logo-separator">_</span>BUILDER</span>
				<div className="fb-topbar-divider" />
				<input value={formName} onChange={e => setFormName(e.target.value)} className="fb-form-name-input" />
				<div className="fb-topbar-actions">
					{["build", "preview"].map(t => <button key={t} onClick={() => setTab(t)} className={`fb-btn ${tab === t ? "active" : ""}`}>{t.toUpperCase()}</button>)}
					<button onClick={() => setShowImport(true)} className="fb-btn">IMPORT</button>
					<button onClick={exportJSON} className="fb-btn-primary">EXPORT JSON</button>
				</div>
			</div>

			<div className="fb-main">

				{/* Left Palette */}
				{tab === "build" && (
					<div className="fb-panel-left">

						<div className="fb-section-title">DRAG ELEMENTS</div>
						{PALETTE_ITEMS.map(item => (
							<div key={item.type} draggable onDragStart={() => { drag.current = { source: "palette", type: item.type }; }} className="fb-palette-item">
								<span className="fb-palette-icon">{item.icon}</span>
								{item.label}
							</div>
						))}

						<div className="fb-section-title" style={{ marginTop: "10px" }}>ADD ROW</div>
						{[1, 2, 3, 4].map(n => (
							<div key={n} onClick={() => addRow(n)} className="fb-add-row-item">
								<span className="fb-col-preview">
									{Array.from({ length: n }, (_, i) => <span key={i} style={{ width: `${Math.floor(36 / n)}px` }} />)}
								</span>
								<span>+ {n} col{n > 1 ? "s" : ""}</span>
							</div>
						))}

						<div className="fb-stats-box">
							<div className="fb-section-title" style={{ padding: "0 0 8px 0" }}>STATS</div>
							{[["Rows", stats.rows], ["Fields", stats.fields], ["Required", stats.required]].map(([k, v]) => (
								<div key={k} className="fb-stat-row">
									<span>{k}</span><span className="fb-stat-val">{v}</span>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Canvas */}
				<div className="fb-canvas" onClick={e => { if (e.target === e.currentTarget) setSelCell(null); }}>

					{tab === "build" && (
						<>
							{rows.map((row, ri) => (
								<RowComp key={row.id} row={row} rowIndex={ri} totalRows={rows.length}
									selectedCell={selCell}
									onSelectCell={(rid, cid) => setSelCell({ rowId: rid, colId: cid })}
									onDropOnCol={handleDropOnCol}
									onClearCol={handleClearCol}
									onMoveFieldOut={(rid, cid) => { drag.current = { source: "canvas", rowId: rid, colId: cid }; }}
									onDeleteRow={deleteRow}
									onMoveRow={moveRow}
									onSetCols={setRowCols}
								/>
							))}

							{/* Add row strip */}
							<div className="fb-canvas-add-row">
								<span className="fb-row-label">NEW ROW:</span>
								{[1, 2, 3, 4].map(n => (
									<button key={n} onClick={() => addRow(n)} className="fb-btn-add-row">
										<span className="fb-col-preview">
											{Array.from({ length: n }, (_, i) => <span key={i} style={{ width: "12px" }} />)}
										</span>
										<span>{n} col{n > 1 ? "s" : ""}</span>
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
										<div key={col.id} style={{ flex: 1, minWidth: 0 }}>
											{col.field ? <FieldPreview field={col.field} /> : null}
										</div>
									))}
								</div>
							))}
							{stats.fields > 0 && (
								<button className="fb-preview-submit">SUBMIT →</button>
							)}
							{stats.fields === 0 && <p style={{ color: "#a0aec0", fontSize: "14px", textAlign: "center" }}>No fields added yet.</p>}
						</div>
					)}
				</div>

				{/* Right Properties */}
				{tab === "build" && (
					<div className="fb-panel-right">
						<div className="fb-section-title">PROPERTIES</div>
						<PropsPanel field={selectedField} onChange={handleUpdateField} onDelete={handleDeleteField} />
					</div>
				)}
			</div>

			{/* Import Modal */}
			{showImport && (
				<div className="fb-modal-overlay">
					<div className="fb-modal">
						<div className="fb-modal-title">IMPORT TEMPLATE</div>
						<textarea value={importTxt} onChange={e => setImportTxt(e.target.value)} placeholder="Paste exported JSON here..." className="fb-textarea" style={{ height: "180px", resize: "vertical" }} />
						<div className="fb-modal-actions">
							<button onClick={() => { setShowImport(false); setImportTxt(""); }} className="fb-btn">CANCEL</button>
							<button onClick={importJSON} className="fb-btn-primary">LOAD</button>
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
