import { useState, useRef } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const PALETTE_ITEMS = [
  { type: "heading",  label: "Heading",     icon: "H1" },
  { type: "label",    label: "Paragraph",   icon: "¶"  },
  { type: "text",     label: "Text Input",  icon: "[ ]"},
  { type: "email",    label: "Email",       icon: "@"  },
  { type: "number",   label: "Number",      icon: "##" },
  { type: "textarea", label: "Text Area",   icon: "≡"  },
  { type: "dropdown", label: "Dropdown",    icon: "▾"  },
  { type: "radio",    label: "Radio Group", icon: "◉"  },
  { type: "checkbox", label: "Checkboxes",  icon: "☑"  },
  { type: "date",     label: "Date Picker", icon: "▦"  },
  { type: "file",     label: "File Upload", icon: "↑"  },
  { type: "divider",  label: "Divider",     icon: "—"  },
];

const FIELD_DEFAULTS = {
  heading:  { label: "Section Title", level: "h2" },
  label:    { label: "Paragraph text goes here." },
  text:     { label: "Text Field",    placeholder: "Enter text...",       required: false },
  email:    { label: "Email Address", placeholder: "you@example.com",     required: false },
  number:   { label: "Number",        placeholder: "0", required: false,  min: "", max: "" },
  textarea: { label: "Message",       placeholder: "Write something...",  required: false, rows: 3 },
  dropdown: { label: "Select Option", required: false, options: ["Option A","Option B","Option C"] },
  radio:    { label: "Choose One",    required: false, options: ["Choice 1","Choice 2","Choice 3"] },
  checkbox: { label: "Select All",    required: false, options: ["Item 1","Item 2","Item 3"] },
  date:     { label: "Date",          required: false },
  file:     { label: "Upload File",   required: false, accept: "*", multiple: false },
  divider:  {},
};

const C = {
  bg:      "#020817",
  panel:   "#080f1e",
  card:    "#0b1426",
  border:  "#1a2744",
  border2: "#0f1f3d",
  accent:  "#f59e0b",
  text:    "#e2e8f0",
  muted:   "#475569",
  muted2:  "#2d3f5a",
  green:   "#22c55e",
  red:     "#ef4444",
};

let _id = 1;
const uid  = () => `f${_id++}`;
const urow = () => `r${_id++}`;
const ucol = () => `c${_id++}`;

const mkField = (type) => ({ id: uid(), type, ...JSON.parse(JSON.stringify(FIELD_DEFAULTS[type])) });
const mkCol   = (field = null) => ({ id: ucol(), field });
const mkRow   = (cols = 1) => ({ id: urow(), columns: Array.from({ length: cols }, () => mkCol()) });

const inp = {
  width: "100%", background: "#060e1c", border: `1px solid ${C.border}`,
  borderRadius: "4px", padding: "7px 10px", color: C.text, fontSize: "12px",
  outline: "none", boxSizing: "border-box", fontFamily: "'Courier New', monospace",
};
const lbl = {
  display: "block", fontSize: "9px", color: C.muted, fontFamily: "'Courier New', monospace",
  letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "5px", marginTop: "14px",
};
const btnStyle = (active) => ({
  background: active ? C.accent : "none",
  border: `1px solid ${active ? C.accent : C.border}`,
  color: active ? "#000" : C.muted,
  borderRadius: "3px", padding: "4px 10px", fontSize: "10px",
  cursor: "pointer", fontFamily: "'Courier New', monospace",
  letterSpacing: "0.08em", fontWeight: active ? 700 : 400,
});

// ─── Field Preview ────────────────────────────────────────────────────────────
function FieldPreview({ field, compact }) {
  const fl = { display: "block", marginBottom: "5px", fontSize: "11px", color: "#7899c0", fontFamily: "'Courier New', monospace", letterSpacing: "0.05em" };
  const fi = { ...inp, fontSize: "11px", padding: compact ? "5px 8px" : "7px 10px" };
  const req = field.required ? <span style={{ color: C.accent, marginLeft: "3px" }}>*</span> : null;

  switch (field.type) {
    case "heading": {
      const sz = { h1: "20px", h2: "15px", h3: "13px" }[field.level] || "15px";
      return <div style={{ color: C.text, fontFamily: "'Courier New', monospace", fontSize: sz, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{field.label}</div>;
    }
    case "label":
      return <p style={{ margin: 0, color: "#4f6a8a", fontSize: "11px", lineHeight: 1.6 }}>{field.label}</p>;
    case "text": case "email": case "number":
      return <div><label style={fl}>{field.label}{req}</label><input type={field.type} placeholder={field.placeholder} style={fi} /></div>;
    case "textarea":
      return <div><label style={fl}>{field.label}{req}</label><textarea placeholder={field.placeholder} rows={compact ? 2 : field.rows} style={{ ...fi, resize: "none" }} /></div>;
    case "dropdown":
      return <div><label style={fl}>{field.label}{req}</label><select style={{ ...fi, cursor: "pointer" }}>{field.options.map((o, i) => <option key={i}>{o}</option>)}</select></div>;
    case "radio":
      return <div><label style={fl}>{field.label}{req}</label>{field.options.slice(0, compact ? 2 : 99).map((o, i) => <label key={i} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px", color: "#7899c0", fontSize: "11px" }}><input type="radio" name={field.id} style={{ accentColor: C.accent }} />{o}</label>)}{compact && field.options.length > 2 && <span style={{ color: C.muted, fontSize: "10px" }}>+{field.options.length - 2} more</span>}</div>;
    case "checkbox":
      return <div><label style={fl}>{field.label}{req}</label>{field.options.slice(0, compact ? 2 : 99).map((o, i) => <label key={i} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px", color: "#7899c0", fontSize: "11px" }}><input type="checkbox" style={{ accentColor: C.accent }} />{o}</label>)}{compact && field.options.length > 2 && <span style={{ color: C.muted, fontSize: "10px" }}>+{field.options.length - 2} more</span>}</div>;
    case "date":
      return <div><label style={fl}>{field.label}{req}</label><input type="date" style={fi} /></div>;
    case "file":
      return <div><label style={fl}>{field.label}{req}</label><input type="file" accept={field.accept} multiple={field.multiple} style={{ ...fi, padding: compact ? "4px 8px" : "5px 10px" }} /></div>;
    case "divider":
      return <hr style={{ border: "none", borderTop: `1px solid ${C.border}`, margin: "6px 0" }} />;
    default: return null;
  }
}

// ─── Properties Panel ─────────────────────────────────────────────────────────
function PropsPanel({ field, onChange, onDelete }) {
  if (!field) return (
    <div style={{ padding: "40px 16px", textAlign: "center", color: C.muted2 }}>
      <div style={{ fontSize: "28px", marginBottom: "10px", opacity: 0.4 }}>◧</div>
      <div style={{ fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase" }}>Click a field<br />to edit</div>
    </div>
  );

  const upd = (patch) => onChange({ ...field, ...patch });
  const updOpts = (raw) => upd({ options: raw.split("\n") });

  return (
    <div style={{ padding: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <span style={{ fontSize: "9px", color: C.accent, letterSpacing: "0.15em" }}>{"// " + field.type.toUpperCase()}</span>
        <button onClick={onDelete} style={{ background: "none", border: `1px solid #3a1010`, color: C.red, borderRadius: "3px", padding: "2px 8px", fontSize: "9px", cursor: "pointer", fontFamily: "'Courier New',monospace" }}>✕ DEL</button>
      </div>

      {field.type !== "divider" && (<><label style={lbl}>Label</label><input style={inp} value={field.label} onChange={e => upd({ label: e.target.value })} /></>)}
      {field.type === "heading" && (<><label style={lbl}>Level</label><select style={inp} value={field.level} onChange={e => upd({ level: e.target.value })}><option value="h1">H1 — Large</option><option value="h2">H2 — Medium</option><option value="h3">H3 — Small</option></select></>)}
      {["text","email","number","textarea"].includes(field.type) && (<><label style={lbl}>Placeholder</label><input style={inp} value={field.placeholder} onChange={e => upd({ placeholder: e.target.value })} /></>)}
      {field.type === "textarea" && (<><label style={lbl}>Rows</label><input type="number" style={inp} value={field.rows} min={2} max={10} onChange={e => upd({ rows: +e.target.value || 3 })} /></>)}
      {field.type === "number" && (<><label style={lbl}>Min</label><input type="number" style={inp} value={field.min} onChange={e => upd({ min: e.target.value })} /><label style={lbl}>Max</label><input type="number" style={inp} value={field.max} onChange={e => upd({ max: e.target.value })} /></>)}
      {["dropdown","radio","checkbox"].includes(field.type) && (<><label style={lbl}>Options (one per line)</label><textarea style={{ ...inp, resize: "vertical", minHeight: "80px" }} value={field.options.join("\n")} onChange={e => updOpts(e.target.value)} /></>)}
      {field.type === "file" && (
        <>
          <label style={lbl}>Accept</label><input style={inp} value={field.accept} placeholder="*  or  image/*  or  .pdf" onChange={e => upd({ accept: e.target.value })} />
          <label style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "14px", cursor: "pointer" }}>
            <input type="checkbox" checked={field.multiple} onChange={e => upd({ multiple: e.target.checked })} style={{ accentColor: C.accent }} />
            <span style={{ fontSize: "10px", color: C.muted, letterSpacing: "0.08em" }}>MULTIPLE FILES</span>
          </label>
        </>
      )}
      {!["heading","label","divider"].includes(field.type) && (
        <label style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "14px", cursor: "pointer" }}>
          <input type="checkbox" checked={field.required} onChange={e => upd({ required: e.target.checked })} style={{ accentColor: C.accent }} />
          <span style={{ fontSize: "10px", color: C.muted, letterSpacing: "0.08em" }}>REQUIRED</span>
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
    <div style={{ flex: 1, minWidth: 0, position: "relative" }}
      onDragOver={e => { e.preventDefault(); e.stopPropagation(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); e.stopPropagation(); setOver(false); onDrop(rowId, col.id); }}>

      {isEmpty ? (
        <div style={{
          height: "72px", borderRadius: "5px", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: "4px",
          border: `2px dashed ${over ? C.accent : C.border2}`,
          color: over ? C.accent : C.muted2, background: over ? "#0f1f3d22" : "transparent",
          transition: "all 0.15s", cursor: "default", fontSize: "9px", letterSpacing: "0.1em",
        }}>
          <span style={{ fontSize: "16px", opacity: 0.4 }}>⊕</span>
          {over ? "DROP HERE" : `COL ${colIndex + 1} / ${totalCols}`}
        </div>
      ) : (
        <div onClick={() => onSelect(rowId, col.id)}
          style={{
            padding: "10px 12px", borderRadius: "5px", cursor: "pointer", position: "relative",
            border: `1px solid ${selected ? C.accent : C.border}`,
            background: selected ? "#0d1e3a" : C.card,
            boxShadow: selected ? `0 0 0 1px ${C.accent}22, 0 0 12px ${C.accent}11` : "none",
            outline: over ? `2px solid ${C.accent}55` : "none",
            transition: "all 0.15s",
          }}
          draggable onDragStart={e => { e.stopPropagation(); onMoveOut(rowId, col.id); }}>
          <div style={{ pointerEvents: "none" }}><FieldPreview field={col.field} compact /></div>
          {selected && (
            <button onClick={e => { e.stopPropagation(); onClear(rowId, col.id); }}
              style={{ position: "absolute", top: "6px", right: "6px", background: "#1a0a0a", border: `1px solid #3a1010`, color: C.red, borderRadius: "3px", padding: "1px 6px", fontSize: "9px", cursor: "pointer", fontFamily: "inherit" }}>✕</button>
          )}
          {selected && <div style={{ position: "absolute", top: "6px", left: "8px", fontSize: "8px", color: C.accent, letterSpacing: "0.1em" }}>✦</div>}
        </div>
      )}
    </div>
  );
}

// ─── Row Component ────────────────────────────────────────────────────────────
function RowComp({ row, rowIndex, totalRows, selectedCell, onSelectCell, onDropOnCol, onClearCol,
                   onMoveFieldOut, onDeleteRow, onMoveRow, onSetCols }) {
  return (
    <div style={{ marginBottom: "10px" }}>
      {/* Row toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "5px" }}>
        <span style={{ fontSize: "9px", color: C.muted2, letterSpacing: "0.1em", marginRight: "2px" }}>ROW {rowIndex + 1}</span>
        <span style={{ fontSize: "9px", color: C.muted2, marginRight: "2px" }}>│</span>
        <span style={{ fontSize: "9px", color: C.muted2 }}>COLS:</span>
        {[1,2,3,4].map(n => (
          <button key={n} onClick={() => onSetCols(row.id, n)}
            style={{ ...btnStyle(row.columns.length === n), padding: "2px 7px", fontSize: "9px" }}>{n}</button>
        ))}
        <div style={{ flex: 1 }} />
        <button disabled={rowIndex === 0} onClick={() => onMoveRow(row.id, -1)}
          style={{ background: "none", border: "none", color: rowIndex === 0 ? C.border : C.muted, cursor: rowIndex === 0 ? "default" : "pointer", fontSize: "13px", lineHeight: 1, padding: "0 2px" }}>↑</button>
        <button disabled={rowIndex === totalRows - 1} onClick={() => onMoveRow(row.id, 1)}
          style={{ background: "none", border: "none", color: rowIndex === totalRows - 1 ? C.border : C.muted, cursor: rowIndex === totalRows - 1 ? "default" : "pointer", fontSize: "13px", lineHeight: 1, padding: "0 2px" }}>↓</button>
        <button onClick={() => onDeleteRow(row.id)}
          style={{ background: "none", border: `1px solid #1a0808`, color: "#3a1818", borderRadius: "3px", padding: "2px 8px", fontSize: "9px", cursor: "pointer", fontFamily: "inherit" }}
          onMouseEnter={e => { e.currentTarget.style.color = C.red; e.currentTarget.style.borderColor = "#4a1010"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#3a1818"; e.currentTarget.style.borderColor = "#1a0808"; }}>
          ✕ ROW
        </button>
      </div>

      {/* Column slots */}
      <div style={{ display: "flex", gap: "8px" }}>
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
  const [rows, setRows]         = useState([mkRow(1)]);
  const [formName, setFormName] = useState("Untitled Form");
  const [selCell, setSelCell]   = useState(null);
  const [tab, setTab]           = useState("build");
  const [toast, setToast]       = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [importTxt, setImportTxt]   = useState("");
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
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${formName.replace(/\s+/g,"_")}.json`; a.click();
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
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: C.bg, color: C.text, fontFamily: "'Courier New', monospace", overflow: "hidden" }}>

      {/* Top Bar */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "0 18px", height: "50px", background: C.panel, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <span style={{ color: C.accent, fontSize: "13px", fontWeight: 700, letterSpacing: "0.12em", whiteSpace: "nowrap" }}>FORM<span style={{ color: C.border }}>_</span>BUILDER</span>
        <div style={{ width: "1px", height: "22px", background: C.border }} />
        <input value={formName} onChange={e => setFormName(e.target.value)} style={{ background: "none", border: "none", color: C.text, fontSize: "13px", outline: "none", flex: 1, fontFamily: "inherit" }} />
        <div style={{ display: "flex", gap: "6px", marginLeft: "auto" }}>
          {["build","preview"].map(t => <button key={t} onClick={() => setTab(t)} style={btnStyle(tab === t)}>{t.toUpperCase()}</button>)}
          <button onClick={() => setShowImport(true)} style={btnStyle(false)}>IMPORT</button>
          <button onClick={exportJSON} style={{ ...btnStyle(true), paddingLeft: "14px", paddingRight: "14px" }}>EXPORT JSON</button>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Left Palette */}
        {tab === "build" && (
          <div style={{ width: "172px", flexShrink: 0, background: C.panel, borderRight: `1px solid ${C.border}`, overflowY: "auto", userSelect: "none" }}>

            <div style={{ padding: "12px 14px 6px", fontSize: "9px", color: C.muted, letterSpacing: "0.15em" }}>{"// DRAG ELEMENTS"}</div>
            {PALETTE_ITEMS.map(item => (
              <div key={item.type} draggable onDragStart={() => { drag.current = { source: "palette", type: item.type }; }}
                style={{ display: "flex", alignItems: "center", gap: "9px", padding: "8px 14px", cursor: "grab", borderLeft: "2px solid transparent", fontSize: "11px", color: "#7899c0", transition: "all 0.12s" }}
                onMouseEnter={e => { e.currentTarget.style.background="#0b1830"; e.currentTarget.style.borderLeftColor=C.accent; e.currentTarget.style.color=C.text; }}
                onMouseLeave={e => { e.currentTarget.style.background="none"; e.currentTarget.style.borderLeftColor="transparent"; e.currentTarget.style.color="#7899c0"; }}>
                <span style={{ fontSize: "10px", color: C.accent, width: "20px", textAlign: "center", fontWeight: 700 }}>{item.icon}</span>
                {item.label}
              </div>
            ))}

            <div style={{ padding: "18px 14px 8px", fontSize: "9px", color: C.muted, letterSpacing: "0.15em" }}>{"// ADD ROW"}</div>
            {[1,2,3,4].map(n => (
              <div key={n} onClick={() => addRow(n)}
                style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 14px", cursor: "pointer", fontSize: "10px", color: C.muted, transition: "color 0.12s" }}
                onMouseEnter={e => e.currentTarget.style.color = C.accent}
                onMouseLeave={e => e.currentTarget.style.color = C.muted}>
                <span style={{ display: "flex", gap: "2px" }}>
                  {Array.from({ length: n }, (_, i) => <span key={i} style={{ display: "inline-block", width: `${Math.floor(36/n)}px`, height: "10px", border: "1px solid currentColor", borderRadius: "1px" }} />)}
                </span>
                <span>+ {n} col{n > 1 ? "s" : ""}</span>
              </div>
            ))}

            <div style={{ margin: "18px 14px 0", padding: "10px", background: "#060e1c", borderRadius: "4px", border: `1px solid ${C.border2}` }}>
              <div style={{ fontSize: "9px", color: C.muted2, letterSpacing: "0.1em", marginBottom: "6px" }}>{"// STATS"}</div>
              {[["rows", stats.rows], ["fields", stats.fields], ["required", stats.required]].map(([k,v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: C.muted, marginBottom: "2px" }}>
                  <span>{k}</span><span style={{ color: C.accent }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Canvas */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", background: C.bg }}
          onClick={e => { if (e.target === e.currentTarget) setSelCell(null); }}>

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
              <div style={{ display: "flex", gap: "8px", marginTop: "16px", padding: "14px 16px", border: `1px dashed ${C.border2}`, borderRadius: "6px", alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: "9px", color: C.muted2, letterSpacing: "0.12em", marginRight: "4px" }}>+ NEW ROW:</span>
                {[1,2,3,4].map(n => (
                  <button key={n} onClick={() => addRow(n)}
                    style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: "3px", padding: "5px 12px", fontSize: "9px", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: "5px", transition: "all 0.12s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}>
                    {Array.from({ length: n }, (_, i) => <span key={i} style={{ display: "inline-block", width: "14px", height: "8px", border: "1px solid currentColor", borderRadius: "1px" }} />)}
                    <span>{n} col{n > 1 ? "s" : ""}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {tab === "preview" && (
            <div style={{ maxWidth: "680px", margin: "0 auto", background: C.card, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "36px 40px" }}>
              <h2 style={{ margin: "0 0 28px", color: C.accent, fontFamily: "inherit", fontSize: "14px", letterSpacing: "0.18em", textTransform: "uppercase", borderBottom: `1px solid ${C.border}`, paddingBottom: "16px" }}>{formName}</h2>
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
                <button style={{ marginTop: "8px", background: C.accent, border: "none", color: "#000", padding: "10px 28px", borderRadius: "4px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.12em", fontWeight: 700 }}>SUBMIT →</button>
              )}
              {stats.fields === 0 && <p style={{ color: C.muted, fontSize: "12px" }}>No fields added yet.</p>}
            </div>
          )}
        </div>

        {/* Right Properties */}
        {tab === "build" && (
          <div style={{ width: "210px", flexShrink: 0, background: C.panel, borderLeft: `1px solid ${C.border}`, overflowY: "auto" }}>
            <div style={{ padding: "12px 16px 0", fontSize: "9px", color: C.muted, letterSpacing: "0.15em" }}>{"// PROPERTIES"}</div>
            <PropsPanel field={selectedField} onChange={handleUpdateField} onDelete={handleDeleteField} />
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImport && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "24px", width: "480px", maxWidth: "90vw" }}>
            <div style={{ fontSize: "10px", color: C.accent, letterSpacing: "0.15em", marginBottom: "14px" }}>{"// IMPORT TEMPLATE"}</div>
            <textarea value={importTxt} onChange={e => setImportTxt(e.target.value)} placeholder="Paste exported JSON here..." style={{ ...inp, height: "180px", resize: "vertical" }} />
            <div style={{ display: "flex", gap: "8px", marginTop: "12px", justifyContent: "flex-end" }}>
              <button onClick={() => { setShowImport(false); setImportTxt(""); }} style={btnStyle(false)}>CANCEL</button>
              <button onClick={importJSON} style={btnStyle(true)}>LOAD</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: "20px", right: "20px", background: toast.type === "err" ? "#1a0505" : "#051a0e", border: `1px solid ${toast.type === "err" ? C.red : C.green}`, color: toast.type === "err" ? "#fca5a5" : "#86efac", borderRadius: "4px", padding: "9px 16px", fontSize: "11px", letterSpacing: "0.08em", zIndex: 200 }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
