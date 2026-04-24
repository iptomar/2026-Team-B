import { useState, useRef, useCallback, useEffect } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const NODE_W = 210;
const NODE_H = 76;
const HR = 7;

const NODE_DEFS = {
  start:    { label: "Start",    color: "#16a34a", border: "#15803d", icon: "▶", hint: "Who can submit" },
  approval: { label: "Approval", color: "#2563eb", border: "#1d4ed8", icon: "✓", hint: "Requires sign-off" },
  end:      { label: "End",      color: "#dc2626", border: "#b91c1c", icon: "■", hint: "Terminal state" },
};

// ─── Initial State ────────────────────────────────────────────────────────────
export const INIT_FLOW_NODES = [
  {
    id: "n1", type: "start", x: 60, y: 240,
    data: { label: "Form Submitted", allowedRoles: [] },
  }
];

export const INIT_FLOW_EDGES = [];

let _ctr = 20;
export const uidNode = () => `n${++_ctr}`;
export const uidEdge = () => `e${++_ctr}`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const outPt = (n) => ({ x: n.x + NODE_W, y: n.y + NODE_H / 2 });
const inPt  = (n) => ({ x: n.x,          y: n.y + NODE_H / 2 });

function bezier(x1, y1, x2, y2) {
  const c = Math.abs(x2 - x1) * 0.55;
  return `M ${x1} ${y1} C ${x1 + c} ${y1} ${x2 - c} ${y2} ${x2} ${y2}`;
}

function edgeStroke(label = "") {
  const l = label.toLowerCase();
  if (l.includes("approv") || l.includes("yes") || l.includes("complet") || l.includes("accept") || l.includes("paid")) return "#16a34a";
  if (l.includes("den") || l.includes("reject") || l.includes("no"))      return "#dc2626";
  return "#4b5563";
}



// ─── Shared style atoms ───────────────────────────────────────────────────────
const INPUT_S = {
  width: "100%", background: "#ffffff", border: "1px solid #d1d5db",
  borderRadius: 5, padding: "6px 9px", color: "#374151",
  fontSize: 13, fontFamily: "inherit", marginBottom: 10,
  boxSizing: "border-box", outline: "none",
};
const LABEL_S = {
  fontSize: 10, letterSpacing: "0.18em", color: "#6b7280",
  display: "block", marginBottom: 5, textTransform: "uppercase",
};
const SEC_S = { borderBottom: "1px solid #e5e7eb", marginBottom: 12, paddingBottom: 12 };

// ─── RoleCheckboxes ───────────────────────────────────────────────────────────
function RoleCheckboxes({ roles = [], selected = [], onChange, single = false }) {
  const toggle = (roleId) => {
    if (single) { onChange(selected.includes(roleId) ? [] : [roleId]); return; }
    const next = selected.includes(roleId)
      ? selected.filter(r => r !== roleId)
      : [...selected, roleId];
    onChange(next);
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
      {roles.map(role => {
        const on = selected.includes(role._id);
        return (
          <button key={role._id} onClick={() => toggle(role._id)}
            style={{
              background: on ? "#eff6ff" : "#ffffff",
              border: `1px solid ${on ? "#60a5fa" : "#d1d5db"}`,
              borderRadius: 4, padding: "3px 7px", cursor: "pointer",
              color: on ? "#1d4ed8" : "#374151", fontSize: 11,
              fontFamily: "inherit", transition: "all 0.12s",
            }}>
            {on ? "✓ " : ""}{role.name}
          </button>
        );
      })}
    </div>
  );
}

// ─── UserList ─────────────────────────────────────────────────────────────────
function UserList({ users = [], onChange }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v || users.includes(v)) return;
    onChange([...users, v]);
    setDraft("");
  };
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", gap: 5, marginBottom: 6 }}>
        <input placeholder="user@org.edu" value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === "Enter" && add()}
          style={{ ...INPUT_S, marginBottom: 0, flex: 1 }} />
        <button onClick={add}
          style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: 5, padding: "0 10px", cursor: "pointer", color: "#16a34a", fontSize: 16, fontFamily: "inherit" }}>
          +
        </button>
      </div>
      {users.map(u => (
        <div key={u} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 4, padding: "4px 8px", marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: "#374151" }}>{u}</span>
          <button onClick={() => onChange(users.filter(x => x !== u))}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
        </div>
      ))}
      {users.length === 0 && <div style={{ fontSize: 10, color: "#9ca3af", fontStyle: "italic" }}>No specific users — press Enter or + to add</div>}
    </div>
  );
}

// ─── NodeCard ─────────────────────────────────────────────────────────────────
function NodeCard({ node, availableRoles, isSelected, isConnectSource, onMouseDown, onOutputClick, onInputClick }) {
  const def = NODE_DEFS[node.type];

  const summary = (() => {
    if (node.type === "start") {
      const rIds = node.data.allowedRoles || [];
      const rNames = rIds.map(id => availableRoles.find(r => r._id === id)?.name).filter(Boolean);
      return rNames.length ? rNames.join(", ") : "no roles set";
    }
    if (node.type === "approval") {
      const rIds = node.data.assignedRoles || [];
      const rNames = rIds.map(id => availableRoles.find(r => r._id === id)?.name).filter(Boolean);
      const roles = rNames.join(", ") || "—";
      const users = node.data.specificUsers?.length ? ` +${node.data.specificUsers.length}u` : "";
      const mode = node.data.approvalMode === "all" ? "all:" : "any:";
      return `${mode} ${roles}${users}`;
    }
    return null;
  })();

  return (
    <div onMouseDown={onMouseDown} onClick={e => e.stopPropagation()}
      style={{
        position: "absolute", left: node.x, top: node.y,
        width: NODE_W, height: NODE_H,
        background: "#ffffff",
        border: `1px solid ${isSelected ? "#f59e0b" : def.border + "55"}`,
        borderLeft: `3px solid ${def.color}`,
        borderRadius: 8,
        boxShadow: isSelected ? `0 0 0 2px #f0a50066, 0 12px 32px #00000015` : "0 2px 8px #0000000a",
        cursor: "grab", userSelect: "none",
        zIndex: isSelected ? 10 : 2,
        transition: "box-shadow 0.12s, border-color 0.12s",
        display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "0 16px", boxSizing: "border-box",
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ color: def.color, fontSize: 13 }}>{def.icon}</span>
        <span style={{ fontSize: 10, letterSpacing: "0.18em", color: def.color, textTransform: "uppercase", fontWeight: 700 }}>{def.label}</span>
        {node.type === "approval" && node.data.requiredApprovals > 1 && (
          <span style={{ fontSize: 9, background: def.color + "22", color: def.color, borderRadius: 3, padding: "1px 5px" }}>{node.data.requiredApprovals}×</span>
        )}
      </div>
      <div style={{ fontSize: 13, color: "#374151", marginTop: 3, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {node.data.label}
      </div>
      {summary && (
        <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {summary}
        </div>
      )}

      {node.type !== "start" && (
        <div onMouseDown={e => e.stopPropagation()} onClick={onInputClick}
          style={{ position: "absolute", left: -HR, top: NODE_H / 2 - HR, width: HR * 2, height: HR * 2, borderRadius: "50%", background: "#ffffff", border: `2px solid ${def.color}`, cursor: "crosshair", zIndex: 20 }} />
      )}
      {node.type !== "end" && (
        <div onMouseDown={e => e.stopPropagation()} onClick={onOutputClick}
          style={{ position: "absolute", right: -HR, top: NODE_H / 2 - HR, width: HR * 2, height: HR * 2, borderRadius: "50%", background: isConnectSource ? "#f59e0b" : "#ffffff", border: `2px solid ${isConnectSource ? "#f59e0b" : def.color}`, cursor: "crosshair", zIndex: 20, transition: "background 0.15s" }} />
      )}
    </div>
  );
}

// ─── ConfigPanel ──────────────────────────────────────────────────────────────
function ConfigPanel({ nodes, edges, availableRoles, selectedNodeId, selectedEdgeId, onUpdateNode, onDeleteNode, onUpdateEdgeLabel, onDeleteEdge }) {
  const node = nodes.find(n => n.id === selectedNodeId);
  const edge = edges.find(e => e.id === selectedEdgeId);

  if (node) {
    const def = NODE_DEFS[node.type];
    return (
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.2em", color: "#6b7280", marginBottom: 10, textTransform: "uppercase" }}>Configure Node</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, ...SEC_S }}>
          <div style={{ width: 3, height: 14, background: def.color, borderRadius: 2 }} />
          <span style={{ fontSize: 11, color: def.color, letterSpacing: "0.1em" }}>{def.label.toUpperCase()}</span>
        </div>

        <div style={SEC_S}>
          <label style={LABEL_S}>Label</label>
          <input value={node.data.label} onChange={e => onUpdateNode("label", e.target.value)} style={INPUT_S} />
        </div>

        {node.type === "start" && (
          <div style={SEC_S}>
            <label style={LABEL_S}>Who can submit</label>
            <RoleCheckboxes roles={availableRoles} selected={node.data.allowedRoles || []} onChange={v => onUpdateNode("allowedRoles", v)} />
          </div>
        )}

        {node.type === "approval" && (<>
          <div style={SEC_S}>
            <label style={LABEL_S}>Approval mode</label>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {[["any", "Any one"], ["all", "All must"]].map(([mode, label]) => {
                const on = node.data.approvalMode === mode;
                return (
                  <button key={mode} onClick={() => onUpdateNode("approvalMode", mode)}
                    style={{ flex: 1, background: on ? "#eff6ff" : "#ffffff", border: `1px solid ${on ? "#60a5fa" : "#d1d5db"}`, borderRadius: 5, padding: "5px 0", cursor: "pointer", color: on ? "#1d4ed8" : "#374151", fontSize: 11, fontFamily: "inherit" }}>
                    {label}
                  </button>
                );
              })}
            </div>
            <label style={LABEL_S}>Required count</label>
            <input type="number" min={1} value={node.data.requiredApprovals}
              onChange={e => onUpdateNode("requiredApprovals", parseInt(e.target.value) || 1)} style={INPUT_S} />
          </div>

          <div style={SEC_S}>
            <label style={LABEL_S}>Assigned roles</label>
            <RoleCheckboxes roles={availableRoles} selected={node.data.assignedRoles || []} onChange={v => onUpdateNode("assignedRoles", v)} />
          </div>

          <div style={SEC_S}>
            <label style={LABEL_S}>Specific users</label>
            <UserList users={node.data.specificUsers || []} onChange={v => onUpdateNode("specificUsers", v)} />
          </div>
        </>)}

        <button onClick={onDeleteNode}
          style={{ width: "100%", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 5, padding: "7px", cursor: "pointer", color: "#dc2626", fontSize: 11, letterSpacing: "0.1em", fontFamily: "inherit" }}>
          DELETE NODE
        </button>
      </div>
    );
  }

  if (edge) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.2em", color: "#6b7280", marginBottom: 12, textTransform: "uppercase" }}>Configure Edge</div>
        <div style={SEC_S}>
          <label style={LABEL_S}>Condition label</label>
          <input placeholder="approved · denied…"
            value={edge.label} onChange={e => onUpdateEdgeLabel(edge.id, e.target.value)} style={INPUT_S} />
          <div style={{ fontSize: 10, color: "#6b7280", lineHeight: 2 }}>
            <span style={{ color: "#16a34a" }}>■</span> approved / accepted / paid<br />
            <span style={{ color: "#dc2626" }}>■</span> denied / rejected / no
          </div>
        </div>
        <button onClick={() => onDeleteEdge(edge.id)}
          style={{ width: "100%", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 5, padding: "7px", cursor: "pointer", color: "#dc2626", fontSize: 11, letterSpacing: "0.1em", fontFamily: "inherit" }}>
          DELETE EDGE
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 10, letterSpacing: "0.18em", color: "#6b7280", marginBottom: 16, textTransform: "uppercase" }}>Properties</div>
      <div style={{ fontSize: 11, color: "#6b7280", lineHeight: 2.1 }}>
        Click a node or edge<br />to configure it.<br /><br />
        ◎ Right handle → start edge<br />
        ◎ Left handle → connect<br />
        ◎ DEL → remove selected
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function FlowEditor({ nodes, setNodes, edges, setEdges }) {
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);
  const [connecting, setConnecting] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(null);
  const [availableRoles, setAvailableRoles] = useState([]);
  const canvasRef = useRef(null);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const apiUrl = process.env.REACT_APP_API_URL || '';
        const res = await fetch(`${apiUrl}/roles`);
        if (res.ok) {
          const data = await res.json();
          setAvailableRoles(data);
        }
      } catch (err) {
        console.error("Failed to fetch roles", err);
      }
    };
    fetchRoles();
  }, []);

  const getNode = (id) => nodes.find(n => n.id === id);

  const handleMouseMove = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    setMousePos({ x: mx, y: my });
    if (dragging) {
      setNodes(prev => prev.map(n =>
        n.id === dragging.nodeId ? { ...n, x: mx - dragging.ox, y: my - dragging.oy } : n
      ));
    }
  }, [dragging, setNodes]);

  const handleMouseUp = useCallback(() => setDragging(null), []);

  const startDrag = useCallback((e, nodeId) => {
    e.stopPropagation();
    const rect = canvasRef.current?.getBoundingClientRect();
    const node = nodes.find(n => n.id === nodeId);
    setDragging({ nodeId, ox: e.clientX - rect.left - node.x, oy: e.clientY - rect.top - node.y });
    setSelectedNodeId(nodeId);
    setSelectedEdgeId(null);
    setConnecting(null);
  }, [nodes]);

  const startConnect = useCallback((e, nodeId) => {
    e.stopPropagation();
    setConnecting({ fromNodeId: nodeId });
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, []);

  const finishConnect = useCallback((e, toNodeId) => {
    e.stopPropagation();
    if (!connecting || connecting.fromNodeId === toNodeId) { setConnecting(null); return; }
    const exists = edges.some(e => e.source === connecting.fromNodeId && e.target === toNodeId);
    if (!exists) setEdges(prev => [...prev, { id: uidEdge(), source: connecting.fromNodeId, target: toNodeId, label: "" }]);
    setConnecting(null);
  }, [connecting, edges, setEdges]);

  const handleCanvasClick = useCallback(() => {
    setSelectedNodeId(null); setSelectedEdgeId(null); setConnecting(null);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) return;
      if (selectedNodeId) {
        setNodes(p => p.filter(n => n.id !== selectedNodeId));
        setEdges(p => p.filter(edge => edge.source !== selectedNodeId && edge.target !== selectedNodeId));
        setSelectedNodeId(null);
      }
      if (selectedEdgeId) { setEdges(p => p.filter(edge => edge.id !== selectedEdgeId)); setSelectedEdgeId(null); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedNodeId, selectedEdgeId, setNodes, setEdges]);

  const addNode = (type) => {
    const id = uidNode();
    const defaults = {
      start:    { label: "Form Submitted",  allowedRoles: [] },
      approval: { label: "Approval Step",   requiredApprovals: 1, approvalMode: "any", assignedRoles: [], specificUsers: [] },
      end:      { label: "End" },
    };
    setNodes(prev => [...prev, { id, type, x: 260 + Math.random() * 200, y: 150 + Math.random() * 200, data: defaults[type] }]);
    setSelectedNodeId(id);
    setSelectedEdgeId(null);
  };

  const updateNode = (field, value) =>
    setNodes(prev => prev.map(n => n.id === selectedNodeId ? { ...n, data: { ...n.data, [field]: value } } : n));

  const deleteNode = () => {
    setNodes(p => p.filter(n => n.id !== selectedNodeId));
    setEdges(p => p.filter(edge => edge.source !== selectedNodeId && edge.target !== selectedNodeId));
    setSelectedNodeId(null);
  };

  const updateEdgeLabel = (id, label) => setEdges(prev => prev.map(edge => edge.id === id ? { ...edge, label } : edge));
  const deleteEdge = (id) => { setEdges(p => p.filter(edge => edge.id !== id)); setSelectedEdgeId(null); };

  return (
    <div style={{ display: "flex", flex: 1, fontFamily: "'DM Mono', 'Fira Code', 'Courier New', monospace", background: "#f9fafb", color: "#374151", overflow: "hidden" }}>

      {/* Palette */}
      <div style={{ width: 188, flexShrink: 0, background: "#ffffff", borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column", padding: "18px 10px 14px" }}>
        <div style={{ fontSize: 10, letterSpacing: "0.25em", color: "#6b7280", marginBottom: 12, paddingLeft: 4, textTransform: "uppercase" }}>Node Palette</div>
        {Object.entries(NODE_DEFS).map(([type, def]) => (
          <button key={type} onClick={() => addNode(type)}
            style={{ background: "#ffffff", border: `1px solid #e5e7eb`, borderLeft: `3px solid ${def.color}`, borderRadius: 7, padding: "9px 10px", cursor: "pointer", textAlign: "left", color: "#374151", marginBottom: 6, transition: "background 0.12s", fontFamily: "inherit" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#f3f4f6"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#ffffff"; }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: def.color, marginBottom: 2 }}>{def.icon} {def.label}</div>
            <div style={{ fontSize: 10, color: "#9ca3af" }}>{def.hint}</div>
          </button>
        ))}
        <div style={{ marginTop: "auto" }}>
          <div style={{ fontSize: 10, color: "#9ca3af", lineHeight: 1.9, paddingLeft: 2 }}>
            DEL · remove selected<br />drag handles · connect
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div ref={canvasRef}
        style={{ flex: 1, position: "relative", overflow: "hidden", cursor: connecting ? "crosshair" : "default" }}
        onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onClick={handleCanvasClick}>

        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
          <defs>
            <pattern id="dots" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.2" fill="#d1d5db" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>

        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
          <defs>
            {["#16a34a","#dc2626","#4b5563","#f59e0b"].map(c => (
              <marker key={c} id={`arr-${c.slice(1)}`} markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill={c} opacity="0.85" />
              </marker>
            ))}
          </defs>
          {edges.map(edge => {
            const src = getNode(edge.source), tgt = getNode(edge.target);
            if (!src || !tgt) return null;
            const s = outPt(src), t = inPt(tgt);
            const path = bezier(s.x, s.y, t.x, t.y);
            const stroke = edge.id === selectedEdgeId ? "#f59e0b" : edgeStroke(edge.label);
            const mx = (s.x + t.x) / 2, my = (s.y + t.y) / 2 - 6;
            return (
              <g key={edge.id} style={{ cursor: "pointer" }}
                onClick={e => { e.stopPropagation(); setSelectedEdgeId(edge.id); setSelectedNodeId(null); }}>
                <path d={path} fill="none" stroke="transparent" strokeWidth={14} />
                <path d={path} fill="none" stroke={stroke} strokeWidth={edge.id === selectedEdgeId ? 2.5 : 1.5}
                  opacity={0.8} markerEnd={`url(#arr-${stroke.slice(1)})`} strokeDasharray={edge.label ? "none" : "6 3"} />
                {edge.label && (
                  <g>
                    <rect x={mx - 44} y={my - 12} width={88} height={22} rx={5} fill="#ffffff" stroke={stroke} strokeWidth={1} opacity={0.95} />
                    <text x={mx} y={my + 4} textAnchor="middle" fill={stroke} fontSize={11} fontFamily="monospace" opacity={0.95}>{edge.label}</text>
                  </g>
                )}
              </g>
            );
          })}
          {connecting && (() => {
            const src = getNode(connecting.fromNodeId);
            if (!src) return null;
            const s = outPt(src);
            return <path d={bezier(s.x, s.y, mousePos.x, mousePos.y)} fill="none" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="6 3" opacity={0.6} />;
          })()}
        </svg>

        {nodes.map(node => (
          <NodeCard key={node.id} node={node} availableRoles={availableRoles}
            isSelected={node.id === selectedNodeId}
            isConnectSource={connecting?.fromNodeId === node.id}
            onMouseDown={e => startDrag(e, node.id)}
            onOutputClick={e => startConnect(e, node.id)}
            onInputClick={e => finishConnect(e, node.id)}
          />
        ))}
      </div>

      {/* Config panel */}
      <div style={{ width: 224, flexShrink: 0, background: "#ffffff", borderLeft: "1px solid #e5e7eb", overflowY: "auto" }}>
        <ConfigPanel nodes={nodes} edges={edges} availableRoles={availableRoles}
          selectedNodeId={selectedNodeId} selectedEdgeId={selectedEdgeId}
          onUpdateNode={updateNode} onDeleteNode={deleteNode}
          onUpdateEdgeLabel={updateEdgeLabel} onDeleteEdge={deleteEdge} />
      </div>

    </div>
  );
}
