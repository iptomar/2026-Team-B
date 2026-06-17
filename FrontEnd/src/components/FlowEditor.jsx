import { useState, useRef, useCallback, useEffect } from "react";
import { useLanguage } from '../contexts/LanguageContext';
import { getLocalizedName } from '../utils/localization';

// ─── Constants ────────────────────────────────────────────────────────────────
const NODE_W = 210;
const NODE_H = 76;
const HR = 7;

const NODE_DEFS = {
	start: { label: "Start", color: "var(--color-flow-start)", border: "var(--color-flow-start-border)", icon: "▶", hint: "Who can submit" },
	approval: { label: "Approval", color: "var(--color-flow-approval)", border: "var(--color-flow-approval-border)", icon: "✓", hint: "Requires sign-off" },
	end: { label: "End", color: "var(--color-flow-end)", border: "var(--color-flow-end-border)", icon: "■", hint: "Terminal state" },
};

// ─── Initial State ────────────────────────────────────────────────────────────
export const INIT_FLOW_NODES = [
	{
		id: "n1", type: "start", x: 60, y: 240,
		data: { label: "Form Submitted", allowedSubmitRoles: [] },
	}
];

export const INIT_FLOW_EDGES = [];

let _ctr = 20;
export const uidNode = () => `n${++_ctr}`;
export const uidEdge = () => `e${++_ctr}`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const outPt = (n) => ({ x: n.x + NODE_W, y: n.y + NODE_H / 2 });
const inPt = (n) => ({ x: n.x, y: n.y + NODE_H / 2 });

function bezier(x1, y1, x2, y2) {
	const c = Math.abs(x2 - x1) * 0.55;
	return `M ${x1} ${y1} C ${x1 + c} ${y1} ${x2 - c} ${y2} ${x2} ${y2}`;
}

function edgeStroke(label = "") {
	const l = label.toLowerCase();
	if (l.includes("approv") || l.includes("yes") || l.includes("complet") || l.includes("accept") || l.includes("paid")) return "var(--color-flow-edge-approve)";
	if (l.includes("den") || l.includes("reject") || l.includes("no")) return "var(--color-flow-edge-deny)";
	return "var(--color-flow-edge-default)";
}



// ─── Shared style atoms ───────────────────────────────────────────────────────
const INPUT_S = {
	width: "100%", background: "var(--color-bg-input)", border: "1px solid var(--color-border-input)",
	borderRadius: 5, padding: "6px 9px", color: "var(--color-text)",
	fontSize: 13, fontFamily: "inherit", marginBottom: 10,
	boxSizing: "border-box", outline: "none",
};
const LABEL_S = {
	fontSize: 10, letterSpacing: "0.18em", color: "var(--color-text-muted)",
	display: "block", marginBottom: 5, textTransform: "uppercase",};
const SEC_S = { borderBottom: "1px solid var(--color-border)", marginBottom: 12, paddingBottom: 12 };

// ─── RoleCheckboxes ───────────────────────────────────────────────────────────
function RoleCheckboxes({ roles = [], selected = [], onChange, single = false }) {
	const { language } = useLanguage();
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
							background: on ? "var(--color-blue-bg)" : "var(--color-bg-input)",
							border: `1px solid ${on ? "var(--color-blue-border)" : "var(--color-border-input)"}`,
							borderRadius: 4, padding: "3px 7px", cursor: "pointer",
							color: on ? "var(--color-blue-text)" : "var(--color-text)",
							fontSize: 11,
							fontFamily: "inherit", transition: "all 0.12s",
						}}>
						{on ? "✓ " : ""}{getLocalizedName(role, language)}
					</button>
				);
			})}
		</div>
	);
}

// ─── UserList ─────────────────────────────────────────────────────────────────
function UserList({ users = [], onChange }) {
	const [draft, setDraft] = useState("");
	const { t } = useLanguage();
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
					style={{ background: "var(--color-flow-start-bg)", border: "1px solid var(--color-flow-start-bg-border)", borderRadius: 5, padding: "0 10px", cursor: "pointer", color: "var(--color-flow-start)", fontSize: 16, fontFamily: "inherit" }}>
					+
				</button>
			</div>
			{users.map(u => (
				<div key={u} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--color-bg-alt)", border: "1px solid var(--color-border)", borderRadius: 4, padding: "4px 8px", marginBottom: 4 }}>
					<span style={{ fontSize: 11, color: "var(--color-text)" }}>{u}</span>
					<button onClick={() => onChange(users.filter(x => x !== u))}
						style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-danger)", fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
				</div>
			))}
			{users.length === 0 && <div style={{ fontSize: 10, color: "var(--color-text-placeholder)", fontStyle: "italic" }}>{t('noSpecificUsers')}</div>}
		</div>
	);
}

// ─── NodeCard ─────────────────────────────────────────────────────────────────
function NodeCard({ node, availableRoles, isSelected, isConnectSource, onMouseDown, onTouchStart, onOutputClick, onInputClick, onClick }) {
	const { t } = useLanguage();
	const def = NODE_DEFS[node.type];

	const summary = (() => {
		if (node.type === "start") {
			const rIds = node.data.allowedSubmitRoles || [];
			const rNames = rIds.map(id => availableRoles.find(r => r._id === id)?.name).filter(Boolean);
			let text = rNames.length ? rNames.join(", ") : t('noRolesSet');
			// Currently not displaying units in summary to save space, but can be added.
			return text;
		}
		if (node.type === "approval") {
			const rIds = node.data.assignedRoles || [];
			const uIds = node.data.assignedUnits || [];
			const rNames = rIds.map(id => availableRoles.find(r => r._id === id)?.name).filter(Boolean);
			// Currently not displaying units in summary to save space, but can be added.
			const roles = rNames.join(", ") || "—";
			const units = uIds.length ? ` +${uIds.length}unit` : "";
			const users = node.data.specificUsers?.length ? ` +${node.data.specificUsers.length}u` : "";
			const mode = node.data.approvalMode === "all" ? "all:" : "any:";
			return `${mode} ${roles}${units}${users}`;
		}
		return null;
	})();

	return (
		<div onMouseDown={onMouseDown} onTouchStart={onTouchStart} onClick={e => { e.stopPropagation(); if (onClick) onClick(e); }}
			style={{
				position: "absolute", left: node.x, top: node.y,
				width: NODE_W, height: NODE_H,
				background: "var(--color-bg-elevated)",
				border: `1px solid ${isSelected ? "var(--color-amber)" : def.border + "55"}`,
				borderLeft: `3px solid ${def.color}`,
				borderRadius: 8,
				boxShadow: isSelected ? `0 0 0 2px var(--color-amber), 0 12px 32px #00000015` : "0 2px 8px #0000000a",
				cursor: "grab", userSelect: "none",
				zIndex: isSelected ? 10 : 2,
				transition: "box-shadow 0.12s, border-color 0.12s",
				display: "flex", flexDirection: "column", justifyContent: "center",
				padding: "0 16px", boxSizing: "border-box",
			}}>
			<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
				<span style={{ color: def.color, fontSize: 13 }}>{def.icon}</span>
				<span style={{ fontSize: 10, letterSpacing: "0.18em", color: def.color, textTransform: "uppercase", fontWeight: 700 }}>
					{node.type === 'start' ? t('startNode') : node.type === 'approval' ? t('approvalNode') : t('endNode')}
				</span>
				{node.type === "approval" && node.data.requiredApprovals > 1 && (
					<span style={{ fontSize: 9, background: def.color + "22", color: def.color, borderRadius: 3, padding: "1px 5px" }}>{node.data.requiredApprovals}×</span>
				)}
			</div>
			<div style={{ fontSize: 13, color: "var(--color-text)", marginTop: 3, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
				{node.data.label}
			</div>
			{summary && (
				<div style={{ fontSize: 10, color: "var(--color-text-muted)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
					{summary}
				</div>
			)}

			{node.type !== "start" && (
				<div onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} onClick={onInputClick}
					style={{ position: "absolute", left: -HR, top: NODE_H / 2 - HR, width: HR * 2, height: HR * 2, borderRadius: "50%", background: "var(--color-bg-elevated)", border: `2px solid ${def.color}`, cursor: "crosshair", zIndex: 20 }} />
			)}
			{node.type !== "end" && (
				<div onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} onClick={onOutputClick}
					style={{ position: "absolute", right: -HR, top: NODE_H / 2 - HR, width: HR * 2, height: HR * 2, borderRadius: "50%", background: isConnectSource ? "var(--color-amber)" : "var(--color-bg-elevated)", border: `2px solid ${isConnectSource ? "var(--color-amber)" : def.color}`, cursor: "crosshair", zIndex: 20, transition: "background 0.15s" }} />
			)}
		</div>
	);
}

// ─── ConfigPanel ──────────────────────────────────────────────────────────────
function ConfigPanel({ nodes, edges, availableRoles, availableUnits, selectedNodeId, selectedEdgeId, onUpdateNode, onDeleteNode, onUpdateEdgeLabel, onDeleteEdge }) {
	const { t } = useLanguage();
	const node = nodes.find(n => n.id === selectedNodeId);
	const edge = edges.find(e => e.id === selectedEdgeId);

	if (node) {
		const def = NODE_DEFS[node.type];
		return (
			<div style={{ padding: 16 }}>
				<div style={{ fontSize: 10, letterSpacing: "0.2em", color: "var(--color-text-muted)", marginBottom: 10, textTransform: "uppercase" }}>{t('configureNode')}</div>
				<div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, ...SEC_S }}>
					<div style={{ width: 3, height: 14, background: def.color, borderRadius: 2 }} />
					<span style={{ fontSize: 11, color: def.color, letterSpacing: "0.1em" }}>
						{node.type === 'start' ? t('startNode').toUpperCase() : node.type === 'approval' ? t('approvalNode').toUpperCase() : t('endNode').toUpperCase()}
					</span>
				</div>

				<div style={SEC_S}>
					<label style={LABEL_S}>{t('labelProp')}</label>
					<input value={node.data.label} onChange={e => onUpdateNode("label", e.target.value)} style={INPUT_S} />
				</div>

				{node.type === "start" && (
					<>
						<div style={SEC_S}>
							<label style={LABEL_S}>{t('whoCanSubmitRoles')}</label>
							<RoleCheckboxes roles={availableRoles} selected={node.data.allowedSubmitRoles || []} onChange={v => onUpdateNode("allowedSubmitRoles", v)} />
						</div>
						<div style={SEC_S}>
							<label style={LABEL_S}>{t('whoCanSubmitUnits')}</label>
							<RoleCheckboxes roles={availableUnits} selected={node.data.allowedSubmitUnits || []} onChange={v => onUpdateNode("allowedSubmitUnits", v)} />
						</div>
						<div style={SEC_S}>
							<label style={LABEL_S}>{t('timeSpan')}</label>
							<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
								<div>
									<div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{t('availableFrom')}</div>
									<input type="datetime-local" style={INPUT_S} value={node.data.availableFrom || ''} onChange={e => onUpdateNode("availableFrom", e.target.value)} />
								</div>
								<div>
									<div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{t('availableTo')}</div>
									<input type="datetime-local" style={INPUT_S} value={node.data.availableTo || ''} onChange={e => onUpdateNode("availableTo", e.target.value)} />
								</div>
							</div>
						</div>
					</>
				)}

				{node.type === "approval" && (<>
					<div style={SEC_S}>
						<label style={LABEL_S}>{t('approvalMode')}</label>
						<div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
							{[["any", t('anyOne')], ["all", t('allMust')]].map(([mode, label]) => {
								const on = node.data.approvalMode === mode;
								return (
									<button key={mode} onClick={() => onUpdateNode("approvalMode", mode)}
										style={{ flex: 1, background: on ? "var(--color-blue-bg)" : "var(--color-bg-input)", border: `1px solid ${on ? "var(--color-blue-border)" : "var(--color-border-input)"}`, borderRadius: 5, padding: "5px 0", cursor: "pointer", color: on ? "var(--color-blue-text)" : "var(--color-text)", fontSize: 11, fontFamily: "inherit" }}>
										{label}
									</button>
								);
							})}
						</div>
						<label style={LABEL_S}>{t('requiredCount')}</label>
						<input type="number" min={1} value={node.data.requiredApprovals}
							disabled={node.data.approvalMode === 'all'}
							onChange={e => onUpdateNode("requiredApprovals", parseInt(e.target.value) || 1)} style={{ ...INPUT_S, opacity: node.data.approvalMode === 'all' ? 0.5 : 1 }} />
						{node.data.approvalMode === 'all' && (
							<div style={{ fontSize: 10, color: 'var(--color-text-placeholder)', fontStyle: 'italic', marginTop: -6 }}>
								{t('requiredCountDisabledHint') || 'Ignored in "All must" mode — every role must approve.'}
							</div>
						)}
					</div>

					<div style={SEC_S}>
						<label style={LABEL_S}>Denial Mode</label>
						<div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
							{[["any", "Any One"], ["all", "All Must"]].map(([mode, label]) => {
								const on = (node.data.denyMode || node.data.approvalMode || 'any') === mode;
								return (
									<button key={mode} onClick={() => onUpdateNode("denyMode", mode)}
										style={{ flex: 1, background: on ? "var(--color-red-bg, #fee2e2)" : "var(--color-bg-input)", border: `1px solid ${on ? "var(--color-red-border, #ef4444)" : "var(--color-border-input)"}`, borderRadius: 5, padding: "5px 0", cursor: "pointer", color: on ? "var(--color-red-text, #b91c1c)" : "var(--color-text)", fontSize: 11, fontFamily: "inherit" }}>
										{label}
									</button>
								);
							})}
						</div>
						<label style={LABEL_S}>Required Denials</label>
						<input type="number" min={1} value={node.data.requiredDenials || node.data.requiredApprovals || 1}
							disabled={(node.data.denyMode || node.data.approvalMode || 'any') === 'all'}
							onChange={e => onUpdateNode("requiredDenials", parseInt(e.target.value) || 1)} style={{ ...INPUT_S, opacity: (node.data.denyMode || node.data.approvalMode || 'any') === 'all' ? 0.5 : 1 }} />
					</div>

					<div style={SEC_S}>
						<label style={LABEL_S}>{t('assignedRoles')}</label>
						<RoleCheckboxes roles={availableRoles} selected={node.data.assignedRoles || []} onChange={v => onUpdateNode("assignedRoles", v)} />
					</div>

					<div style={SEC_S}>
						<label style={LABEL_S}>{t('assignedUnits') || 'Assigned Units'}</label>
						<RoleCheckboxes roles={availableUnits} selected={node.data.assignedUnits || []} onChange={v => onUpdateNode("assignedUnits", v)} />
					</div>

					<div style={SEC_S}>
						<label style={LABEL_S}>{t('specificUsers')}</label>
						<UserList users={node.data.specificUsers || []} onChange={v => onUpdateNode("specificUsers", v)} />
					</div>
				</>)}

				{node.type !== 'start' && (
					<button onClick={onDeleteNode}
						style={{ width: "100%", background: "var(--color-danger-bg)", border: "1px solid var(--color-danger-border)", borderRadius: 5, padding: "7px", cursor: "pointer", color: "var(--color-danger)", fontSize: 11, letterSpacing: "0.1em", fontFamily: "inherit" }}>
						{t('deleteNode')}
					</button>
				)}
			</div>
		);
	}

	if (edge) {
		return (
			<div style={{ padding: 16 }}>
				<div style={{ fontSize: 10, letterSpacing: "0.2em", color: "var(--color-text-muted)", marginBottom: 12, textTransform: "uppercase" }}>{t('configureEdge')}</div>
				<div style={SEC_S}>
					<label style={LABEL_S}>{t('conditionLabel')}</label>
					<input placeholder="approved · denied…"
						value={edge.label} onChange={e => onUpdateEdgeLabel(edge.id, e.target.value)} style={INPUT_S} />
					<div style={{ fontSize: 10, color: "var(--color-text-muted)", lineHeight: 2 }}>
						<span style={{ color: "var(--color-flow-edge-approve)" }}>■</span> approved / accepted / paid<br />
						<span style={{ color: "var(--color-flow-edge-deny)" }}>■</span> denied / rejected / no
					</div>
				</div>
				<button onClick={() => onDeleteEdge(edge.id)}
					style={{ width: "100%", background: "var(--color-danger-bg)", border: "1px solid var(--color-danger-border)", borderRadius: 5, padding: "7px", cursor: "pointer", color: "var(--color-danger)", fontSize: 11, letterSpacing: "0.1em", fontFamily: "inherit" }}>
					{t('deleteEdge')}
				</button>
			</div>
		);
	}

	return (
		<div style={{ padding: 16 }}>
			<div style={{ fontSize: 10, letterSpacing: "0.18em", color: "var(--color-text-muted)", marginBottom: 16, textTransform: "uppercase" }}>{t('properties')}</div>
			<div style={{ fontSize: 11, color: "var(--color-text-muted)", lineHeight: 2.1 }}>
				{t('clickNodeOrEdge')}<br />{t('toConfigureIt')}<br /><br />
				{t('flowHelp1')}<br />
				{t('flowHelp2')}<br />
				{t('flowHelp3')}
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
	const [availableUnits, setAvailableUnits] = useState([]);
	const [showConfigModal, setShowConfigModal] = useState(false);
	const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches);
	const canvasRef = useRef(null);
	const hasDraggedRef = useRef(false);
	const { t } = useLanguage();

	// Track mobile breakpoint
	useEffect(() => {
		const mql = window.matchMedia('(max-width: 768px)');
		const handler = (e) => setIsMobile(e.matches);
		mql.addEventListener('change', handler);
		return () => mql.removeEventListener('change', handler);
	}, []);

	useEffect(() => {
		const fetchRolesAndUnits = async () => {
			try {
				const apiUrl = process.env.REACT_APP_API_URL || '';
				const [rolesRes, unitsRes] = await Promise.all([
					fetch(`${apiUrl}/roles`),
					fetch(`${apiUrl}/units`)
				]);
				if (rolesRes.ok) {
					const data = await rolesRes.json();
					setAvailableRoles(data);
				}
				if (unitsRes.ok) {
					const data = await unitsRes.json();
					setAvailableUnits(data);
				}
			} catch (err) {
				console.error("Failed to fetch roles or units", err);
			}
		};
		fetchRolesAndUnits();
	}, []);

	const getNode = (id) => nodes.find(n => n.id === id);

	const handleMouseMove = useCallback((e) => {
		const rect = canvasRef.current?.getBoundingClientRect();
		if (!rect) return;
		
		const clientX = e.touches ? e.touches[0].clientX : e.clientX;
		const clientY = e.touches ? e.touches[0].clientY : e.clientY;

		const mx = clientX - rect.left;
		const my = clientY - rect.top;
		setMousePos({ x: mx, y: my });
		if (dragging) {
			hasDraggedRef.current = true;
			setNodes(prev => prev.map(n => {
				if (n.id === dragging.nodeId) {
					const newX = Math.max(0, Math.min(rect.width - NODE_W, mx - dragging.ox));
					const newY = Math.max(0, Math.min(rect.height - NODE_H, my - dragging.oy));
					return { ...n, x: newX, y: newY };
				}
				return n;
			}));
		}
	}, [dragging, setNodes]);

	const handleMouseUp = useCallback(() => setDragging(null), []);

	const startDrag = useCallback((e, nodeId) => {
		e.stopPropagation();
		const rect = canvasRef.current?.getBoundingClientRect();
		const node = nodes.find(n => n.id === nodeId);
		
		const clientX = e.touches ? e.touches[0].clientX : e.clientX;
		const clientY = e.touches ? e.touches[0].clientY : e.clientY;

		hasDraggedRef.current = false;
		setDragging({ nodeId, ox: clientX - rect.left - node.x, oy: clientY - rect.top - node.y });
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
				// Prevent deletion of Start node
				const nodeToDelete = nodes.find(n => n.id === selectedNodeId);
				if (nodeToDelete && nodeToDelete.type === 'start') return;
				setNodes(p => p.filter(n => n.id !== selectedNodeId));
				setEdges(p => p.filter(edge => edge.source !== selectedNodeId && edge.target !== selectedNodeId));
				setSelectedNodeId(null);
			}
			if (selectedEdgeId) { setEdges(p => p.filter(edge => edge.id !== selectedEdgeId)); setSelectedEdgeId(null); }
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedNodeId, selectedEdgeId, setNodes, setEdges]);

	const addNode = (type) => {
		const id = uidNode();
		const defaults = {
			start: { label: t('defStartNodeLabel') || "Form Submitted", allowedSubmitRoles: [] },
			approval: { label: t('defApprovalNodeLabel') || "Approval Step", requiredApprovals: 1, approvalMode: "any", assignedRoles: [], assignedUnits: [], specificUsers: [] },
			end: { label: t('defEndNodeLabel') || "End" },
		};
		const rect = canvasRef.current?.getBoundingClientRect();
		const cw = rect ? Math.max(rect.width, 300) : 300;
		const ch = rect ? Math.max(rect.height, 300) : 300;
		const maxX = Math.max(0, cw - NODE_W - 20);
		const maxY = Math.max(0, ch - NODE_H - 20);
		const x = 20 + Math.random() * Math.min(200, maxX);
		const y = 20 + Math.random() * Math.min(200, maxY);
		
		setNodes(prev => [...prev, { id, type, x, y, data: defaults[type] }]);
		setSelectedNodeId(id);
		setSelectedEdgeId(null);
		if (isMobile) setShowConfigModal(true);
	};

	const updateNode = (field, value) =>
		setNodes(prev => prev.map(n => n.id === selectedNodeId ? { ...n, data: { ...n.data, [field]: value } } : n));

	const deleteNode = () => {
		// Prevent deletion of Start node
		const nodeToDelete = nodes.find(n => n.id === selectedNodeId);
		if (nodeToDelete && nodeToDelete.type === 'start') return;
		setNodes(p => p.filter(n => n.id !== selectedNodeId));
		setEdges(p => p.filter(edge => edge.source !== selectedNodeId && edge.target !== selectedNodeId));
		setSelectedNodeId(null);
	};

	const updateEdgeLabel = (id, label) => setEdges(prev => prev.map(edge => edge.id === id ? { ...edge, label } : edge));
	const deleteEdge = (id) => { setEdges(p => p.filter(edge => edge.id !== id)); setSelectedEdgeId(null); };

	return (
		<div style={{ display: "flex", flexDirection: "column", flex: 1, fontFamily: "'DM Mono', 'Fira Code', 'Courier New', monospace", background: "var(--color-flow-canvas-bg)", color: "var(--color-text)", overflow: "hidden" }}>

			{/* Top Bar for Flow Editor Palette */}
			<div style={{ display: "flex", alignItems: "center", padding: "10px 16px", background: "var(--color-flow-panel-bg)", borderBottom: "1px solid var(--color-border)", gap: "12px", overflowX: "auto" }}>
				<div style={{ fontSize: 10, letterSpacing: "0.25em", color: "var(--color-text-muted)", textTransform: "uppercase", marginRight: 8, whiteSpace: "nowrap" }}>{t('nodePalette')}</div>
				{Object.entries(NODE_DEFS).filter(([type]) => type !== 'start' && type !== 'end').map(([type, def]) => (
					<button key={type} onClick={() => addNode(type)}
						style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--color-bg-elevated)", border: `1px solid var(--color-border)`, borderLeft: `3px solid ${def.color}`, borderRadius: 7, padding: "6px 12px", cursor: "pointer", color: "var(--color-text)", transition: "background 0.12s", fontFamily: "inherit", whiteSpace: "nowrap" }}
						onMouseEnter={e => { e.currentTarget.style.background = "var(--color-bg-hover)"; }}
						onMouseLeave={e => { e.currentTarget.style.background = "var(--color-bg-elevated)"; }}>
						<span style={{ fontSize: 12, fontWeight: 700, color: def.color }}>{def.icon}</span>
						<span style={{ fontSize: 12, fontWeight: 600 }}>{type === 'start' ? t('startNode') : type === 'approval' ? t('approvalNode') : t('endNode')}</span>
					</button>
				))}
				<div style={{ flex: 1 }} />
				{!isMobile && (
					<div style={{ fontSize: 10, color: "var(--color-text-placeholder)", textAlign: "right", whiteSpace: "nowrap" }}>
						{t('delRemoveSelected')} | {t('dragHandlesConnect')}
					</div>
				)}
			</div>

			<div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
				{/* Canvas */}
				<div ref={canvasRef}
					style={{ flex: 1, position: "relative", overflow: "hidden", cursor: connecting ? "crosshair" : "default", touchAction: "none" }}
					onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onClick={handleCanvasClick}
					onTouchMove={handleMouseMove} onTouchEnd={handleMouseUp} onTouchCancel={handleMouseUp}>

					<svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
						<defs>
							<pattern id="dots" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
								<circle cx="1.5" cy="1.5" r="1.2" fill="var(--color-flow-canvas-dots)" />
							</pattern>
						</defs>
						<rect width="100%" height="100%" fill="url(#dots)" />
					</svg>

					<svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
						<defs>
							{["var(--color-flow-edge-approve)", "var(--color-flow-edge-deny)", "var(--color-flow-edge-default)", "var(--color-amber)"].map(c => (
								<marker key={c} id={`arr-${c.replace(/[^a-zA-Z0-9]/g, '')}`} markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
									<path d="M0,0 L0,6 L8,3 z" fill={c} opacity="0.85" />
								</marker>
							))}
						</defs>
						{edges.map(edge => {
							const src = getNode(edge.source), tgt = getNode(edge.target);
							if (!src || !tgt) return null;
							const s = outPt(src), t = inPt(tgt);
							const path = bezier(s.x, s.y, t.x, t.y);
							const stroke = edge.id === selectedEdgeId ? "var(--color-amber)" : edgeStroke(edge.label);
							const mx = (s.x + t.x) / 2, my = (s.y + t.y) / 2 - 6;
							const strokeClean = stroke.replace(/[^a-zA-Z0-9]/g, '');
							return (
								<g key={edge.id} style={{ cursor: "pointer" }}
									onClick={e => { e.stopPropagation(); setSelectedEdgeId(edge.id); setSelectedNodeId(null); if (isMobile) setShowConfigModal(true); }}>
									<path d={path} fill="none" stroke="transparent" strokeWidth={14} />
									<path d={path} fill="none" stroke={stroke} strokeWidth={edge.id === selectedEdgeId ? 2.5 : 1.5}
										opacity={0.8} markerEnd={`url(#arr-${strokeClean})`} strokeDasharray={edge.label ? "none" : "6 3"} />
									{edge.label && (
										<g>
											<rect x={mx - 44} y={my - 12} width={88} height={22} rx={5} fill="var(--color-bg-elevated)" stroke={stroke} strokeWidth={1} opacity={0.95} />
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
							return <path d={bezier(s.x, s.y, mousePos.x, mousePos.y)} fill="none" stroke="var(--color-amber)" strokeWidth={1.5} strokeDasharray="6 3" opacity={0.6} />;
						})()}
					</svg>

					{nodes.map(node => (
						<NodeCard key={node.id} node={node} availableRoles={availableRoles} availableUnits={availableUnits}
							isSelected={node.id === selectedNodeId}
							isConnectSource={connecting?.fromNodeId === node.id}
							onMouseDown={e => startDrag(e, node.id)}
							onTouchStart={e => startDrag(e, node.id)}
							onClick={e => { setSelectedNodeId(node.id); setSelectedEdgeId(null); if (isMobile && !hasDraggedRef.current) setShowConfigModal(true); }}
							onOutputClick={e => startConnect(e, node.id)}
							onInputClick={e => finishConnect(e, node.id)}
						/>
					))}
				</div>

				{/* Config panel (Desktop Only) */}
				{!isMobile && (
					<div style={{ width: 224, flexShrink: 0, background: "var(--color-flow-panel-bg)", borderLeft: "1px solid var(--color-border)", overflowY: "auto" }}>
						<ConfigPanel nodes={nodes} edges={edges} availableRoles={availableRoles} availableUnits={availableUnits}
							selectedNodeId={selectedNodeId} selectedEdgeId={selectedEdgeId}
							onUpdateNode={updateNode} onDeleteNode={deleteNode}
							onUpdateEdgeLabel={updateEdgeLabel} onDeleteEdge={deleteEdge} />
					</div>
				)}
			</div>

			{/* Mobile Config Overlay Modal */}
			{isMobile && showConfigModal && (selectedNodeId || selectedEdgeId) && (
				<div className="fb-props-modal-overlay" onClick={() => setShowConfigModal(false)} style={{ zIndex: 1000, position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
					<div className="fb-props-modal" onClick={e => e.stopPropagation()} style={{ background: 'var(--color-bg-glass-heavy)', border: '1px solid var(--color-border-light)', borderRadius: '12px', padding: '0', width: '90vw', maxWidth: '400px', maxHeight: '85vh', overflowY: 'auto', boxShadow: 'var(--shadow-modal)', position: 'relative' }}>
						<div className="fb-props-modal-header" style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--color-bg-glass-heavy)', backdropFilter: 'blur(10px)', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-light)' }}>
							<div style={{ fontSize: 12, color: 'var(--color-accent-light)', letterSpacing: '0.1em', fontWeight: 700, textTransform: 'uppercase' }}>{t('properties')}</div>
							<button onClick={() => setShowConfigModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-placeholder)', cursor: 'pointer', fontSize: '18px' }}>✕</button>
						</div>
						<ConfigPanel nodes={nodes} edges={edges} availableRoles={availableRoles} availableUnits={availableUnits}
							selectedNodeId={selectedNodeId} selectedEdgeId={selectedEdgeId}
							onUpdateNode={updateNode} onDeleteNode={(id) => { deleteNode(id); setShowConfigModal(false); }}
							onUpdateEdgeLabel={updateEdgeLabel} onDeleteEdge={(id) => { deleteEdge(id); setShowConfigModal(false); }} />
					</div>
				</div>
			)}
		</div>
	);
}
