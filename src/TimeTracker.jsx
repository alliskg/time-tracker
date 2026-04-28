import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// ============================================================
// THEME
// ============================================================
const theme = {
  '--accent': '#E8672E',
  '--accent-soft': '#F4A47A',
  '--bg': '#FAF8F5',
  '--card-bg': '#FFFFFF',
  '--text': '#1A1714',
  '--text-muted': '#8C857A',
  '--border': '#E8E4DE',
  '--input-bg': '#FAF8F5',
  '--danger': '#C44536',
  '--success': '#5A8A5C',
  '--font-heading': "'DM Serif Display', Georgia, serif",
  '--font-body': "'DM Sans', -apple-system, system-ui, sans-serif",
};

// Default category colors for new nodes (cycle through these)
const DEFAULT_COLORS = [
  '#E8672E', '#5A8A5C', '#3D7A8C', '#A85B8B',
  '#C9A227', '#8B5E3C', '#6B6FB5', '#C44536',
];

// ============================================================
// HELPERS
// ============================================================
const uid = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const dateStr = (d) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const parseDate = (str) => {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const addDays = (str, n) => {
  const d = parseDate(str);
  d.setDate(d.getDate() + n);
  return dateStr(d);
};

// Monday of the week containing dateStr (locale-independent: ISO week)
const startOfWeek = (str) => {
  const d = parseDate(str);
  const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  return dateStr(d);
};

const startOfMonth = (str) => {
  const d = parseDate(str);
  d.setDate(1);
  return dateStr(d);
};

const endOfMonth = (str) => {
  const d = parseDate(str);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return dateStr(d);
};

const formatDuration = (ms) => {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const formatDurationShort = (ms) => {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

const formatTime = (ts) => {
  const d = new Date(ts);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')}${ampm}`;
};

const formatDateLong = (str) => {
  const d = parseDate(str);
  const today = todayStr();
  const yest = addDays(today, -1);
  if (str === today) return 'Today';
  if (str === yest) return 'Yesterday';
  const opts = { weekday: 'short', month: 'short', day: 'numeric' };
  return d.toLocaleDateString(undefined, opts);
};

// localStorage helpers, namespaced
const STORAGE_PREFIX = 'tt_';
const loadData = (key, fallback) => {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};
const saveData = (key, value) => {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.warn('save failed', e);
  }
};

// ============================================================
// DEFAULT TREE
// ============================================================
const makeDefaultNodes = () => {
  const work = uid();
  const personal = uid();
  const health = uid();
  const social = uid();
  const rest = uid();
  return [
    { id: work, parentId: null, name: 'Work', color: '#3D7A8C', icon: { type: 'emoji', value: '💼' }, dailyTargetMinutes: 480, weeklyTargetMinutes: 2400, hidden: false },
    { id: personal, parentId: null, name: 'Personal', color: '#A85B8B', icon: { type: 'emoji', value: '🏡' }, dailyTargetMinutes: 60, weeklyTargetMinutes: 420, hidden: false },
    { id: health, parentId: null, name: 'Health', color: '#5A8A5C', icon: { type: 'emoji', value: '🌿' }, dailyTargetMinutes: 60, weeklyTargetMinutes: 420, hidden: false },
    { id: social, parentId: null, name: 'Social', color: '#E8672E', icon: { type: 'emoji', value: '☕' }, dailyTargetMinutes: 60, weeklyTargetMinutes: 420, hidden: false },
    { id: rest, parentId: null, name: 'Rest', color: '#6B6FB5', icon: { type: 'emoji', value: '🌙' }, dailyTargetMinutes: 480, weeklyTargetMinutes: 3360, hidden: false },
  ];
};

const makeDefaultRoutines = () => [
  {
    id: uid(),
    name: 'Morning',
    timeOfDay: 'morning',
    tasks: [
      { id: uid(), label: 'Wake up & hydrate', nodeId: null, estimatedMinutes: 5 },
      { id: uid(), label: 'Stretch / movement', nodeId: null, estimatedMinutes: 10 },
      { id: uid(), label: 'Plan the day', nodeId: null, estimatedMinutes: 10 },
    ],
  },
  {
    id: uid(),
    name: 'Evening',
    timeOfDay: 'evening',
    tasks: [
      { id: uid(), label: 'Review the day', nodeId: null, estimatedMinutes: 5 },
      { id: uid(), label: 'Wind down', nodeId: null, estimatedMinutes: 15 },
    ],
  },
];

// ============================================================
// TREE UTILITIES
// ============================================================
const buildTree = (nodes) => {
  const byParent = new Map();
  nodes.forEach(n => {
    if (n.hidden) return;
    const list = byParent.get(n.parentId) || [];
    list.push(n);
    byParent.set(n.parentId, list);
  });
  const attach = (parentId) => {
    const kids = byParent.get(parentId) || [];
    return kids.map(k => ({ ...k, children: attach(k.id) }));
  };
  return attach(null);
};

const findNode = (nodes, id) => nodes.find(n => n.id === id) || null;

const getAncestorPath = (nodes, id) => {
  const path = [];
  let current = findNode(nodes, id);
  while (current) {
    path.unshift(current);
    current = current.parentId ? findNode(nodes, current.parentId) : null;
  }
  return path;
};

const getDescendantIds = (nodes, id) => {
  const out = new Set([id]);
  let added = true;
  while (added) {
    added = false;
    nodes.forEach(n => {
      if (n.parentId && out.has(n.parentId) && !out.has(n.id)) {
        out.add(n.id);
        added = true;
      }
    });
  }
  return out;
};

// Effective color = node's own, or nearest ancestor's
const effectiveColor = (nodes, id) => {
  if (!id) return '#8C857A';
  const path = getAncestorPath(nodes, id);
  for (let i = path.length - 1; i >= 0; i--) {
    if (path[i].color) return path[i].color;
  }
  return '#8C857A';
};

const nodeBreadcrumb = (nodes, id) => {
  if (!id) return 'Unlabeled';
  const path = getAncestorPath(nodes, id);
  return path.map(p => p.name).join(' › ');
};


// ============================================================
// ICON RENDERER
// ============================================================
const NodeIcon = ({ icon, size = 22, fallbackColor = '#8C857A' }) => {
  if (!icon) {
    return <span style={{ display: 'inline-block', width: size, height: size, borderRadius: '50%', background: fallbackColor }} />;
  }
  if (icon.type === 'emoji') {
    return <span style={{ fontSize: size * 0.9, lineHeight: 1, display: 'inline-block' }}>{icon.value}</span>;
  }
  if (icon.type === 'image') {
    return <img src={icon.value} alt="" style={{ width: size, height: size, borderRadius: 6, objectFit: 'cover' }} />;
  }
  if (icon.type === 'svg') {
    return <BuiltInIcon name={icon.value} size={size} color={fallbackColor} />;
  }
  return null;
};

const BuiltInIcon = ({ name, size = 22, color = 'currentColor' }) => {
  const paths = {
    work: 'M3 7h18v12H3z M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2',
    health: 'M12 21s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.5-7 10-7 10z',
    learn: 'M3 6l9-3 9 3-9 3-9-3z M3 6v8 M21 6v8 M7 10v6c0 1.5 2.2 3 5 3s5-1.5 5-3v-6',
    social: 'M17 11a4 4 0 100-8 4 4 0 000 8z M9 21v-2a4 4 0 014-4h2',
    creative: 'M12 19l7-7 3 3-7 7-3-3z M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z',
    home: 'M3 12l9-9 9 9 M5 10v10h14V10',
    rest: 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z',
    food: 'M12 2v8 M5 5l7 7 7-7 M3 14h18 M5 14l1 8h12l1-8',
    money: 'M12 1v22 M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',
    star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    book: 'M4 19.5A2.5 2.5 0 016.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z',
    music: 'M9 18V5l12-2v13 M9 18a3 3 0 11-3-3 M21 16a3 3 0 11-3-3',
  };
  const d = paths[name] || paths.star;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
};

const BUILTIN_ICON_NAMES = ['work', 'health', 'learn', 'social', 'creative', 'home', 'rest', 'food', 'money', 'star', 'book', 'music'];

// ============================================================
// MODAL
// ============================================================
const Modal = ({ open, onClose, title, children, maxHeight = '85vh' }) => {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(26,23,20,0.4)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'tt-fade-in 0.18s ease-out',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480, background: 'var(--card-bg)',
          borderRadius: '24px 24px 0 0',
          maxHeight, display: 'flex', flexDirection: 'column',
          paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
          animation: 'tt-slide-up 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <div style={{ padding: '10px 0 6px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>
        {title && (
          <div style={{ padding: '8px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 400, color: 'var(--text)' }}>{title}</h2>
            <button onClick={onClose} aria-label="Close" style={{
              width: 32, height: 32, border: 'none', background: 'var(--input-bg)',
              borderRadius: '50%', fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>×</button>
          </div>
        )}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>
      <style>{`
        @keyframes tt-fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes tt-slide-up { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </div>
  );
};

// ============================================================
// SHARED UI BITS
// ============================================================
const Button = ({ variant = 'primary', children, style, ...props }) => {
  const styles = {
    primary: { background: 'var(--accent)', color: '#fff' },
    secondary: { background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)' },
    ghost: { background: 'transparent', color: 'var(--text)' },
    danger: { background: 'var(--danger)', color: '#fff' },
  };
  return (
    <button
      {...props}
      style={{
        padding: '12px 20px', borderRadius: 12, border: 'none',
        fontSize: 15, fontWeight: 600, cursor: 'pointer',
        fontFamily: 'var(--font-body)',
        ...styles[variant],
        ...style,
      }}
    >{children}</button>
  );
};

const TextInput = ({ style, ...props }) => (
  <input
    {...props}
    style={{
      width: '100%', padding: '12px 14px', borderRadius: 10,
      border: '1px solid var(--border)', background: 'var(--input-bg)',
      fontSize: 16, color: 'var(--text)', fontFamily: 'var(--font-body)',
      ...style,
    }}
  />
);

const Label = ({ children, style }) => (
  <div style={{
    fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
    letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6, ...style,
  }}>{children}</div>
);

// ============================================================
// TREE PICKER (drill-down)
// ============================================================
const TreePicker = ({ nodes, selectedId, onSelect, allowClear = false, allowAny = false }) => {
  // expanded: set of nodeIds whose children are revealed
  const [expanded, setExpanded] = useState(() => {
    if (!selectedId) return new Set();
    const path = getAncestorPath(nodes, selectedId).map(n => n.id);
    return new Set(path);
  });
  const tree = useMemo(() => buildTree(nodes), [nodes]);

  const toggle = (id) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };

  const renderRow = (node, depth) => {
    const hasKids = node.children.length > 0;
    const isOpen = expanded.has(node.id);
    const isSelected = selectedId === node.id;
    const color = effectiveColor(nodes, node.id);
    return (
      <div key={node.id}>
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', paddingLeft: 12 + depth * 18,
            borderRadius: 10, cursor: 'pointer',
            background: isSelected ? 'rgba(232,103,46,0.10)' : 'transparent',
            border: isSelected ? '1px solid var(--accent)' : '1px solid transparent',
            marginBottom: 2,
          }}
          onClick={() => onSelect(node.id)}
        >
          {hasKids ? (
            <button
              onClick={e => { e.stopPropagation(); toggle(node.id); }}
              style={{
                width: 22, height: 22, border: 'none', background: 'transparent',
                color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0,
                transform: isOpen ? 'rotate(90deg)' : 'rotate(0)',
                transition: 'transform 0.15s', fontSize: 14,
              }}
            >▸</button>
          ) : (
            <span style={{ width: 22, flexShrink: 0 }} />
          )}
          <span style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
          <NodeIcon icon={node.icon} size={20} fallbackColor={color} />
          <span style={{ flex: 1, fontSize: 15, color: 'var(--text)', fontWeight: isSelected ? 600 : 500 }}>{node.name}</span>
        </div>
        {hasKids && isOpen && node.children.map(c => renderRow(c, depth + 1))}
      </div>
    );
  };

  return (
    <div>
      {allowClear && (
        <div
          onClick={() => onSelect(null)}
          style={{
            padding: '10px 12px', borderRadius: 10, marginBottom: 6, cursor: 'pointer',
            background: selectedId == null ? 'rgba(232,103,46,0.10)' : 'transparent',
            border: selectedId == null ? '1px solid var(--accent)' : '1px solid var(--border)',
            fontSize: 14, color: 'var(--text-muted)', fontStyle: 'italic',
          }}
        >Unlabeled (no category)</div>
      )}
      {tree.length === 0 && (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          No categories yet. Add some in Settings.
        </div>
      )}
      {tree.map(n => renderRow(n, 0))}
    </div>
  );
};


// ============================================================
// TIMER TAB
// ============================================================
// Stopwatch elapsed = accumulatedMs + (isRunning && !isPaused ? now - startTs : 0)
const stopwatchElapsed = (sw, now) => {
  const acc = sw.accumulatedMs || 0;
  if (sw.isRunning && !sw.isPaused && sw.startTs) {
    return acc + (now - sw.startTs);
  }
  return acc;
};

const TimerTab = ({ stopwatches, setStopwatches, nodes, onPushEntry }) => {
  const [now, setNow] = useState(Date.now());
  const [pushModal, setPushModal] = useState(null); // { stopwatchId } or null
  const [discardConfirm, setDiscardConfirm] = useState(null);

  // 1Hz tick for live elapsed display
  useEffect(() => {
    const anyRunning = stopwatches.some(s => s.isRunning && !s.isPaused);
    if (!anyRunning) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [stopwatches]);

  const addStopwatch = () => {
    const sw = {
      id: uid(),
      label: '',
      nodeId: null,
      startTs: null,
      accumulatedMs: 0,
      isRunning: false,
      isPaused: false,
      createdAt: Date.now(),
      // First-start timestamp tracked once user actually starts
      firstStartTs: null,
    };
    setStopwatches([...stopwatches, sw]);
  };

  const startSW = (id) => {
    setStopwatches(stopwatches.map(s => {
      if (s.id !== id) return s;
      const t = Date.now();
      return {
        ...s,
        startTs: t,
        isRunning: true,
        isPaused: false,
        firstStartTs: s.firstStartTs || t,
      };
    }));
  };

  const pauseSW = (id) => {
    setStopwatches(stopwatches.map(s => {
      if (s.id !== id) return s;
      const t = Date.now();
      const acc = (s.accumulatedMs || 0) + (s.startTs ? (t - s.startTs) : 0);
      return { ...s, accumulatedMs: acc, isPaused: true, startTs: null };
    }));
  };

  const resumeSW = (id) => {
    setStopwatches(stopwatches.map(s => {
      if (s.id !== id) return s;
      return { ...s, startTs: Date.now(), isPaused: false, isRunning: true };
    }));
  };

  const renameSW = (id, label) => {
    setStopwatches(stopwatches.map(s => s.id === id ? { ...s, label } : s));
  };

  const setNodeSW = (id, nodeId) => {
    setStopwatches(stopwatches.map(s => s.id === id ? { ...s, nodeId } : s));
  };

  const discardSW = (id) => {
    setStopwatches(stopwatches.filter(s => s.id !== id));
    setDiscardConfirm(null);
  };

  const requestPush = (id) => {
    const sw = stopwatches.find(s => s.id === id);
    if (!sw || !sw.firstStartTs) return; // never started
    const elapsed = stopwatchElapsed(sw, Date.now());
    if (elapsed < 1000) {
      // less than 1 sec — just discard
      discardSW(id);
      return;
    }
    setPushModal({ stopwatchId: id });
  };

  return (
    <div style={{ padding: '16px 16px 100px' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 400, color: 'var(--text)' }}>Timer</h1>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
          {stopwatches.length === 0 ? 'Start a stopwatch and label it any time.' : `${stopwatches.length} timer${stopwatches.length === 1 ? '' : 's'}`}
        </div>
      </div>

      {stopwatches.length === 0 && (
        <div style={{
          background: 'var(--card-bg)', borderRadius: 20, padding: 32,
          textAlign: 'center', border: '1px solid var(--border)',
        }}>
          <div style={{
            fontSize: 56, fontFamily: 'var(--font-heading)', color: 'var(--text)',
            letterSpacing: -1, marginBottom: 12, fontVariantNumeric: 'tabular-nums',
          }}>00:00:00</div>
          <Button onClick={addStopwatch} style={{ width: '100%', padding: '14px' }}>
            Start a stopwatch
          </Button>
        </div>
      )}

      {stopwatches.map(sw => (
        <StopwatchCard
          key={sw.id}
          sw={sw}
          now={now}
          nodes={nodes}
          onStart={() => startSW(sw.id)}
          onPause={() => pauseSW(sw.id)}
          onResume={() => resumeSW(sw.id)}
          onRename={(label) => renameSW(sw.id, label)}
          onSetNode={(nodeId) => setNodeSW(sw.id, nodeId)}
          onPush={() => requestPush(sw.id)}
          onDiscard={() => setDiscardConfirm(sw.id)}
        />
      ))}

      {stopwatches.length > 0 && (
        <button
          onClick={addStopwatch}
          style={{
            width: '100%', padding: '14px', marginTop: 8,
            background: 'transparent', border: '2px dashed var(--border)',
            borderRadius: 16, color: 'var(--text-muted)', fontSize: 15,
            fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}
        >+ New stopwatch</button>
      )}

      {pushModal && (
        <PushModal
          stopwatch={stopwatches.find(s => s.id === pushModal.stopwatchId)}
          nodes={nodes}
          onClose={() => setPushModal(null)}
          onConfirm={(entry) => {
            onPushEntry(entry);
            setStopwatches(stopwatches.filter(s => s.id !== pushModal.stopwatchId));
            setPushModal(null);
          }}
        />
      )}

      {discardConfirm && (
        <Modal open={true} onClose={() => setDiscardConfirm(null)} title="Discard timer?">
          <div style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 20 }}>
            This will delete the timer without saving. Use "Push to Log" if you want to keep the time.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="secondary" onClick={() => setDiscardConfirm(null)} style={{ flex: 1 }}>Cancel</Button>
            <Button variant="danger" onClick={() => discardSW(discardConfirm)} style={{ flex: 1 }}>Discard</Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

const StopwatchCard = ({ sw, now, nodes, onStart, onPause, onResume, onRename, onSetNode, onPush, onDiscard }) => {
  const elapsed = stopwatchElapsed(sw, now);
  const color = sw.nodeId ? effectiveColor(nodes, sw.nodeId) : 'var(--accent)';
  const node = sw.nodeId ? findNode(nodes, sw.nodeId) : null;
  const [showPicker, setShowPicker] = useState(false);
  const [editingLabel, setEditingLabel] = useState(false);
  const [tempLabel, setTempLabel] = useState(sw.label);

  useEffect(() => { setTempLabel(sw.label); }, [sw.label]);

  const isActive = sw.isRunning && !sw.isPaused;
  const hasStarted = !!sw.firstStartTs;

  return (
    <div style={{
      background: 'var(--card-bg)', borderRadius: 20, padding: 20, marginBottom: 12,
      border: `1px solid var(--border)`,
      boxShadow: isActive ? `0 0 0 2px ${color}, 0 4px 16px rgba(232,103,46,0.12)` : 'none',
      transition: 'box-shadow 0.2s',
    }}>
      {/* Top row: label + node */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        {editingLabel ? (
          <input
            autoFocus
            value={tempLabel}
            onChange={e => setTempLabel(e.target.value)}
            onBlur={() => { onRename(tempLabel.trim()); setEditingLabel(false); }}
            onKeyDown={e => { if (e.key === 'Enter') { onRename(tempLabel.trim()); setEditingLabel(false); } }}
            placeholder="What is this?"
            style={{
              flex: 1, minWidth: 0, padding: '8px 10px', border: '1px solid var(--border)',
              borderRadius: 8, fontSize: 15, background: 'var(--input-bg)', fontFamily: 'var(--font-body)',
            }}
          />
        ) : (
          <div
            onClick={() => setEditingLabel(true)}
            style={{
              flex: 1, minWidth: 0, fontSize: 16, fontWeight: 600,
              color: sw.label ? 'var(--text)' : 'var(--text-muted)',
              fontStyle: sw.label ? 'normal' : 'italic', cursor: 'text',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >{sw.label || 'Tap to label'}</div>
        )}
      </div>

      {/* Node badge */}
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={() => setShowPicker(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 12px', borderRadius: 999,
            background: node ? `${color}20` : 'var(--input-bg)',
            border: `1px solid ${node ? color : 'var(--border)'}`,
            color: node ? color : 'var(--text-muted)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}
        >
          {node ? <NodeIcon icon={node.icon} size={16} fallbackColor={color} /> : <span style={{ fontSize: 14 }}>+</span>}
          {node ? nodeBreadcrumb(nodes, node.id) : 'Assign category'}
        </button>
      </div>

      {/* Big timer */}
      <div style={{
        fontFamily: 'var(--font-heading)', fontSize: 48, lineHeight: 1.1,
        textAlign: 'center', color: 'var(--text)', letterSpacing: -1,
        fontVariantNumeric: 'tabular-nums', marginBottom: 16,
      }}>{formatDuration(elapsed)}</div>

      {/* Started at indicator */}
      {hasStarted && (
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
          Started {formatTime(sw.firstStartTs)}
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8 }}>
        {!hasStarted && (
          <Button onClick={onStart} style={{ flex: 1 }}>Start</Button>
        )}
        {hasStarted && isActive && (
          <Button variant="secondary" onClick={onPause} style={{ flex: 1 }}>Pause</Button>
        )}
        {hasStarted && !isActive && (
          <Button onClick={onResume} style={{ flex: 1 }}>Resume</Button>
        )}
        {hasStarted && (
          <Button onClick={onPush} style={{ flex: 1 }}>Push to Log</Button>
        )}
        <button
          onClick={onDiscard}
          aria-label="Discard"
          style={{
            width: 44, height: 44, border: '1px solid var(--border)',
            background: 'transparent', borderRadius: 12,
            color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18,
            flexShrink: 0,
          }}
        >×</button>
      </div>

      {/* Node picker modal */}
      <Modal open={showPicker} onClose={() => setShowPicker(false)} title="Assign category">
        <TreePicker
          nodes={nodes}
          selectedId={sw.nodeId}
          onSelect={(id) => { onSetNode(id); setShowPicker(false); }}
          allowClear={true}
        />
      </Modal>
    </div>
  );
};

// ============================================================
// PUSH MODAL — confirm and label before saving entry
// ============================================================
const PushModal = ({ stopwatch, nodes, onClose, onConfirm }) => {
  const elapsed = stopwatchElapsed(stopwatch, Date.now());
  const startTs = stopwatch.firstStartTs;
  const endTs = startTs + elapsed;

  const [nodeId, setNodeId] = useState(stopwatch.nodeId);
  const [label, setLabel] = useState(stopwatch.label);
  const [note, setNote] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  // Editable times (HH:MM)
  const tsToHM = (ts) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };
  const [startHM, setStartHM] = useState(tsToHM(startTs));
  const [endHM, setEndHM] = useState(tsToHM(endTs));

  const hmToTs = (refTs, hm) => {
    const ref = new Date(refTs);
    const [h, m] = hm.split(':').map(Number);
    ref.setHours(h, m, 0, 0);
    return ref.getTime();
  };

  const finalStart = hmToTs(startTs, startHM);
  let finalEnd = hmToTs(endTs, endHM);
  if (finalEnd < finalStart) finalEnd += 24 * 3600 * 1000; // crossed midnight
  const finalDuration = finalEnd - finalStart;

  const node = nodeId ? findNode(nodes, nodeId) : null;
  const color = nodeId ? effectiveColor(nodes, nodeId) : '#8C857A';

  const submit = (skipLabel = false) => {
    onConfirm({
      id: uid(),
      nodeId: skipLabel ? null : nodeId,
      label: skipLabel ? '' : label.trim(),
      startTs: finalStart,
      endTs: finalEnd,
      durationMs: finalDuration,
      date: dateStr(new Date(finalStart)),
      note: note.trim(),
    });
  };

  return (
    <Modal open={true} onClose={onClose} title="Push to Log">
      <div style={{ marginBottom: 16 }}>
        <Label>Duration</Label>
        <div style={{
          fontFamily: 'var(--font-heading)', fontSize: 32, color: 'var(--text)',
          fontVariantNumeric: 'tabular-nums',
        }}>{formatDuration(finalDuration)}</div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <Label>Start</Label>
          <TextInput type="time" value={startHM} onChange={e => setStartHM(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <Label>End</Label>
          <TextInput type="time" value={endHM} onChange={e => setEndHM(e.target.value)} />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Label>Category</Label>
        <button
          onClick={() => setShowPicker(true)}
          style={{
            width: '100%', padding: '12px 14px', borderRadius: 10,
            border: '1px solid var(--border)', background: 'var(--input-bg)',
            display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text)',
            textAlign: 'left',
          }}
        >
          <span style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
          {node ? <NodeIcon icon={node.icon} size={18} fallbackColor={color} /> : null}
          <span style={{ flex: 1 }}>{node ? nodeBreadcrumb(nodes, node.id) : 'Choose category…'}</span>
          <span style={{ color: 'var(--text-muted)' }}>›</span>
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Label>Label (optional)</Label>
        <TextInput
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="e.g. Q4 planning, jog"
        />
      </div>

      <div style={{ marginBottom: 24 }}>
        <Label>Note (optional)</Label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={2}
          placeholder="Anything to remember…"
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 10,
            border: '1px solid var(--border)', background: 'var(--input-bg)',
            fontSize: 15, color: 'var(--text)', fontFamily: 'var(--font-body)',
            resize: 'vertical',
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <Button variant="secondary" onClick={() => submit(true)} style={{ flex: 1 }}>
          Skip label
        </Button>
        <Button onClick={() => submit(false)} style={{ flex: 1 }}>
          Push
        </Button>
      </div>

      <Modal open={showPicker} onClose={() => setShowPicker(false)} title="Choose category">
        <TreePicker
          nodes={nodes}
          selectedId={nodeId}
          onSelect={(id) => { setNodeId(id); setShowPicker(false); }}
          allowClear={true}
        />
      </Modal>
    </Modal>
  );
};


// ============================================================
// LOG TAB — timeline + entry list, manual entry
// ============================================================
const LogTab = ({ entries, setEntries, nodes }) => {
  const [date, setDate] = useState(todayStr());
  const [editEntry, setEditEntry] = useState(null); // entry being edited
  const [showManual, setShowManual] = useState(false);

  const dayEntries = useMemo(
    () => entries
      .filter(e => e.date === date)
      .sort((a, b) => a.startTs - b.startTs),
    [entries, date]
  );

  const totalMs = dayEntries.reduce((sum, e) => sum + e.durationMs, 0);

  const upsert = (entry) => {
    setEntries(prev => {
      const exists = prev.some(e => e.id === entry.id);
      if (exists) return prev.map(e => e.id === entry.id ? entry : e);
      return [...prev, entry];
    });
  };

  const remove = (id) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  return (
    <div style={{ padding: '16px 16px 100px' }}>
      <h1 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 400, color: 'var(--text)' }}>Log</h1>

      {/* Date nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 18px' }}>
        <button
          onClick={() => setDate(addDays(date, -1))}
          style={{ width: 36, height: 36, border: '1px solid var(--border)', background: 'var(--card-bg)', borderRadius: 10, fontSize: 16, cursor: 'pointer', color: 'var(--text)' }}
        >‹</button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
          {formatDateLong(date)}
        </div>
        <button
          onClick={() => setDate(addDays(date, 1))}
          disabled={date >= todayStr()}
          style={{
            width: 36, height: 36, border: '1px solid var(--border)', background: 'var(--card-bg)',
            borderRadius: 10, fontSize: 16, cursor: 'pointer',
            color: date >= todayStr() ? 'var(--border)' : 'var(--text)',
          }}
        >›</button>
        {date !== todayStr() && (
          <button
            onClick={() => setDate(todayStr())}
            style={{
              padding: '8px 14px', border: 'none', background: 'var(--accent)',
              color: '#fff', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >Today</button>
        )}
      </div>

      {/* Day total */}
      <div style={{
        background: 'var(--card-bg)', borderRadius: 16, padding: 14, marginBottom: 16,
        border: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Tracked</div>
        <div style={{ fontSize: 22, fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>
          {formatDurationShort(totalMs) || '0m'}
        </div>
      </div>

      {/* Timeline */}
      <Label>Timeline</Label>
      <Timeline entries={dayEntries} nodes={nodes} date={date} onTapEntry={setEditEntry} />

      {/* Entry list */}
      <Label style={{ marginTop: 24 }}>Entries</Label>
      {dayEntries.length === 0 ? (
        <div style={{
          background: 'var(--card-bg)', borderRadius: 14, padding: 24,
          textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, border: '1px solid var(--border)',
        }}>
          No entries yet. Use the Timer tab to track time, or add one manually below.
        </div>
      ) : dayEntries.map(e => (
        <EntryRow key={e.id} entry={e} nodes={nodes} onTap={() => setEditEntry(e)} />
      ))}

      <button
        onClick={() => setShowManual(true)}
        style={{
          width: '100%', padding: '14px', marginTop: 14,
          background: 'transparent', border: '2px dashed var(--border)',
          borderRadius: 14, color: 'var(--text-muted)', fontSize: 15,
          fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
        }}
      >+ Add manual entry</button>

      {showManual && (
        <EntryEditor
          mode="create"
          initialDate={date}
          nodes={nodes}
          onClose={() => setShowManual(false)}
          onSave={(e) => { upsert(e); setShowManual(false); }}
        />
      )}

      {editEntry && (
        <EntryEditor
          mode="edit"
          entry={editEntry}
          nodes={nodes}
          onClose={() => setEditEntry(null)}
          onSave={(e) => { upsert(e); setEditEntry(null); }}
          onDelete={() => { remove(editEntry.id); setEditEntry(null); }}
        />
      )}
    </div>
  );
};

const Timeline = ({ entries, nodes, date, onTapEntry }) => {
  // Show 24-hour strip from the local midnight of `date`.
  const dayStart = parseDate(date).getTime();
  const dayEnd = dayStart + 24 * 3600 * 1000;
  const totalMs = 24 * 3600 * 1000;

  const containerStyle = {
    position: 'relative', height: 64, background: 'var(--card-bg)',
    border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden',
  };

  return (
    <div>
      <div style={containerStyle}>
        {/* Hour ticks every 3 hours */}
        {[3, 6, 9, 12, 15, 18, 21].map(h => (
          <div key={h} style={{
            position: 'absolute', left: `${(h / 24) * 100}%`, top: 0, bottom: 0,
            width: 1, background: 'var(--border)',
          }} />
        ))}
        {/* Entries */}
        {entries.map(e => {
          const start = Math.max(dayStart, e.startTs);
          const end = Math.min(dayEnd, e.endTs);
          if (end <= start) return null;
          const left = ((start - dayStart) / totalMs) * 100;
          const width = ((end - start) / totalMs) * 100;
          const color = e.nodeId ? effectiveColor(nodes, e.nodeId) : '#8C857A';
          return (
            <button
              key={e.id}
              onClick={() => onTapEntry(e)}
              style={{
                position: 'absolute', top: 6, bottom: 6,
                left: `${left}%`, width: `${Math.max(width, 0.5)}%`,
                background: color, border: 'none', borderRadius: 4,
                cursor: 'pointer', padding: 0, opacity: e.nodeId ? 1 : 0.45,
              }}
              aria-label={`${e.label || nodeBreadcrumb(nodes, e.nodeId)}`}
            />
          );
        })}
      </div>
      {/* Hour labels */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 10, color: 'var(--text-muted)', marginTop: 4, padding: '0 2px',
      }}>
        <span>12a</span><span>6a</span><span>12p</span><span>6p</span><span>12a</span>
      </div>
    </div>
  );
};

const EntryRow = ({ entry, nodes, onTap }) => {
  const color = entry.nodeId ? effectiveColor(nodes, entry.nodeId) : '#8C857A';
  const node = entry.nodeId ? findNode(nodes, entry.nodeId) : null;
  const title = entry.label || (node ? nodeBreadcrumb(nodes, node.id) : 'Unlabeled');
  const subtitle = entry.label && node ? nodeBreadcrumb(nodes, node.id) : '';
  return (
    <button
      onClick={onTap}
      style={{
        width: '100%', textAlign: 'left',
        background: 'var(--card-bg)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '12px 14px', marginBottom: 8,
        display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
        fontFamily: 'var(--font-body)',
      }}
    >
      <div style={{ width: 4, alignSelf: 'stretch', background: color, borderRadius: 2 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 15, fontWeight: 600, color: entry.nodeId || entry.label ? 'var(--text)' : 'var(--text-muted)',
          fontStyle: !entry.nodeId && !entry.label ? 'italic' : 'normal',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
          {formatTime(entry.startTs)} – {formatTime(entry.endTs)}
          {subtitle && ` · ${subtitle}`}
        </div>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
        {formatDurationShort(entry.durationMs)}
      </div>
    </button>
  );
};

const EntryEditor = ({ mode, entry, initialDate, nodes, onClose, onSave, onDelete }) => {
  const today = todayStr();
  const init = entry || {
    id: uid(),
    nodeId: null,
    label: '',
    note: '',
  };

  const [nodeId, setNodeId] = useState(init.nodeId);
  const [label, setLabel] = useState(init.label || '');
  const [note, setNote] = useState(init.note || '');
  const [date, setDate] = useState(entry ? entry.date : (initialDate || today));

  // For the time inputs: HH:MM strings.
  const tsToHM = (ts) => {
    if (!ts) return '12:00';
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };
  const [startHM, setStartHM] = useState(entry ? tsToHM(entry.startTs) : '09:00');
  const [endHM, setEndHM] = useState(entry ? tsToHM(entry.endTs) : '10:00');

  const [showPicker, setShowPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const buildTs = (dateStr, hm) => {
    const d = parseDate(dateStr);
    const [h, m] = hm.split(':').map(Number);
    d.setHours(h, m, 0, 0);
    return d.getTime();
  };

  const startTs = buildTs(date, startHM);
  let endTs = buildTs(date, endHM);
  if (endTs < startTs) endTs += 24 * 3600 * 1000;
  const durationMs = endTs - startTs;

  const node = nodeId ? findNode(nodes, nodeId) : null;
  const color = nodeId ? effectiveColor(nodes, nodeId) : '#8C857A';

  const submit = () => {
    if (durationMs <= 0) return;
    onSave({
      id: init.id,
      nodeId,
      label: label.trim(),
      startTs,
      endTs,
      durationMs,
      date: dateStr(new Date(startTs)),
      note: note.trim(),
    });
  };

  return (
    <Modal open={true} onClose={onClose} title={mode === 'create' ? 'New entry' : 'Edit entry'}>
      <div style={{ marginBottom: 14 }}>
        <Label>Date</Label>
        <TextInput type="date" value={date} onChange={e => setDate(e.target.value)} />
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <Label>Start</Label>
          <TextInput type="time" value={startHM} onChange={e => setStartHM(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <Label>End</Label>
          <TextInput type="time" value={endHM} onChange={e => setEndHM(e.target.value)} />
        </div>
      </div>

      <div style={{ marginBottom: 14, fontSize: 13, color: 'var(--text-muted)' }}>
        Duration: <strong style={{ color: 'var(--text)' }}>{formatDurationShort(durationMs)}</strong>
      </div>

      <div style={{ marginBottom: 14 }}>
        <Label>Category</Label>
        <button
          onClick={() => setShowPicker(true)}
          style={{
            width: '100%', padding: '12px 14px', borderRadius: 10,
            border: '1px solid var(--border)', background: 'var(--input-bg)',
            display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text)',
            textAlign: 'left',
          }}
        >
          <span style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
          {node ? <NodeIcon icon={node.icon} size={18} fallbackColor={color} /> : null}
          <span style={{ flex: 1 }}>{node ? nodeBreadcrumb(nodes, node.id) : 'Choose category…'}</span>
          <span style={{ color: 'var(--text-muted)' }}>›</span>
        </button>
      </div>

      <div style={{ marginBottom: 14 }}>
        <Label>Label (optional)</Label>
        <TextInput value={label} onChange={e => setLabel(e.target.value)} placeholder="What was this?" />
      </div>

      <div style={{ marginBottom: 20 }}>
        <Label>Note</Label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={2}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 10,
            border: '1px solid var(--border)', background: 'var(--input-bg)',
            fontSize: 15, color: 'var(--text)', fontFamily: 'var(--font-body)', resize: 'vertical',
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        {mode === 'edit' && (
          <Button variant="secondary" onClick={() => setConfirmDelete(true)} style={{ flex: 1, color: 'var(--danger)' }}>
            Delete
          </Button>
        )}
        <Button onClick={submit} style={{ flex: mode === 'edit' ? 2 : 1 }}>
          {mode === 'create' ? 'Save' : 'Update'}
        </Button>
      </div>

      <Modal open={showPicker} onClose={() => setShowPicker(false)} title="Choose category">
        <TreePicker nodes={nodes} selectedId={nodeId} onSelect={(id) => { setNodeId(id); setShowPicker(false); }} allowClear={true} />
      </Modal>

      {confirmDelete && (
        <Modal open={true} onClose={() => setConfirmDelete(false)} title="Delete entry?">
          <div style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 20 }}>
            This will permanently remove this entry from the log.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)} style={{ flex: 1 }}>Cancel</Button>
            <Button variant="danger" onClick={onDelete} style={{ flex: 1 }}>Delete</Button>
          </div>
        </Modal>
      )}
    </Modal>
  );
};


// ============================================================
// STATS TAB
// ============================================================
const StatsTab = ({ entries, nodes }) => {
  const [period, setPeriod] = useState('day'); // 'day' | 'week' | 'month'
  const [anchor, setAnchor] = useState(todayStr());
  const [drillId, setDrillId] = useState(null); // top-level node currently drilled into

  // Window
  const { rangeStart, rangeEnd, label } = useMemo(() => {
    if (period === 'day') {
      return { rangeStart: anchor, rangeEnd: anchor, label: formatDateLong(anchor) };
    }
    if (period === 'week') {
      const start = startOfWeek(anchor);
      const end = addDays(start, 6);
      return {
        rangeStart: start, rangeEnd: end,
        label: `${parseDate(start).toLocaleDateString(undefined, {month:'short',day:'numeric'})} – ${parseDate(end).toLocaleDateString(undefined, {month:'short',day:'numeric'})}`,
      };
    }
    const start = startOfMonth(anchor);
    const end = endOfMonth(anchor);
    return {
      rangeStart: start, rangeEnd: end,
      label: parseDate(start).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
    };
  }, [period, anchor]);

  const inWindow = useMemo(
    () => entries.filter(e => e.date >= rangeStart && e.date <= rangeEnd),
    [entries, rangeStart, rangeEnd]
  );

  // Aggregate ms per node, then roll up: each entry counts toward its node and all ancestors.
  const totalsByNode = useMemo(() => {
    const map = new Map();
    inWindow.forEach(e => {
      if (!e.nodeId) {
        map.set('__unlabeled__', (map.get('__unlabeled__') || 0) + e.durationMs);
        return;
      }
      const path = getAncestorPath(nodes, e.nodeId).map(n => n.id);
      path.forEach(id => map.set(id, (map.get(id) || 0) + e.durationMs));
    });
    return map;
  }, [inWindow, nodes]);

  const totalMs = inWindow.reduce((s, e) => s + e.durationMs, 0);

  // What slices to show: drill or top-level
  const slices = useMemo(() => {
    if (drillId) {
      const drillNode = findNode(nodes, drillId);
      if (!drillNode) return [];
      const kids = nodes.filter(n => n.parentId === drillId && !n.hidden);
      const items = kids.map(n => ({
        id: n.id, name: n.name, color: effectiveColor(nodes, n.id),
        icon: n.icon, ms: totalsByNode.get(n.id) || 0,
        targetMin: period === 'week' ? n.weeklyTargetMinutes : (period === 'day' ? n.dailyTargetMinutes : null),
      })).filter(s => s.ms > 0);
      // remainder = drill total minus children total
      const drillTotal = totalsByNode.get(drillId) || 0;
      const childSum = items.reduce((s, i) => s + i.ms, 0);
      if (drillTotal - childSum > 0) {
        items.push({ id: drillId + '__direct', name: '(direct)', color: effectiveColor(nodes, drillId), ms: drillTotal - childSum, direct: true });
      }
      return items.sort((a, b) => b.ms - a.ms);
    }
    const tops = nodes.filter(n => n.parentId == null && !n.hidden);
    const items = tops.map(n => ({
      id: n.id, name: n.name, color: effectiveColor(nodes, n.id), icon: n.icon,
      ms: totalsByNode.get(n.id) || 0,
      targetMin: period === 'week' ? n.weeklyTargetMinutes : (period === 'day' ? n.dailyTargetMinutes : null),
    })).filter(s => s.ms > 0);
    const unlabeled = totalsByNode.get('__unlabeled__') || 0;
    if (unlabeled > 0) items.push({ id: '__unlabeled__', name: 'Unlabeled', color: '#8C857A', ms: unlabeled });
    return items.sort((a, b) => b.ms - a.ms);
  }, [drillId, nodes, totalsByNode, period]);

  const slicesTotal = slices.reduce((s, i) => s + i.ms, 0);

  // Multiplier for monthly target rollups (rough: days in window / 1)
  const periodDays = period === 'day' ? 1 : (period === 'week' ? 7 : (parseDate(rangeEnd).getDate()));

  const periodLabel = period === 'day' ? 'today' : (period === 'week' ? 'this week' : 'this month');

  const navAnchor = (delta) => {
    if (period === 'day') setAnchor(addDays(anchor, delta));
    else if (period === 'week') setAnchor(addDays(anchor, delta * 7));
    else {
      const d = parseDate(anchor);
      d.setMonth(d.getMonth() + delta);
      setAnchor(dateStr(d));
    }
  };

  return (
    <div style={{ padding: '16px 16px 100px' }}>
      <h1 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 400, color: 'var(--text)' }}>Stats</h1>

      {/* Period toggle */}
      <div style={{
        display: 'flex', gap: 4, padding: 4, marginTop: 14,
        background: 'var(--input-bg)', borderRadius: 12, border: '1px solid var(--border)',
      }}>
        {['day', 'week', 'month'].map(p => (
          <button
            key={p}
            onClick={() => { setPeriod(p); setDrillId(null); }}
            style={{
              flex: 1, padding: '10px', border: 'none', cursor: 'pointer',
              borderRadius: 8, fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)',
              background: period === p ? 'var(--card-bg)' : 'transparent',
              color: period === p ? 'var(--text)' : 'var(--text-muted)',
              boxShadow: period === p ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              textTransform: 'capitalize',
            }}
          >{p}</button>
        ))}
      </div>

      {/* Range nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 18px' }}>
        <button onClick={() => navAnchor(-1)} style={{ width: 36, height: 36, border: '1px solid var(--border)', background: 'var(--card-bg)', borderRadius: 10, fontSize: 16, cursor: 'pointer' }}>‹</button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
        <button onClick={() => navAnchor(1)} disabled={rangeEnd >= todayStr()} style={{ width: 36, height: 36, border: '1px solid var(--border)', background: 'var(--card-bg)', borderRadius: 10, fontSize: 16, cursor: 'pointer', color: rangeEnd >= todayStr() ? 'var(--border)' : 'var(--text)' }}>›</button>
      </div>

      {/* Total tracked */}
      <div style={{
        background: 'var(--card-bg)', borderRadius: 16, padding: 16, marginBottom: 16,
        border: '1px solid var(--border)', textAlign: 'center',
      }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Total tracked {periodLabel}</div>
        <div style={{ fontSize: 32, fontFamily: 'var(--font-heading)', color: 'var(--text)', marginTop: 4 }}>
          {formatDurationShort(totalMs) || '0m'}
        </div>
      </div>

      {totalMs === 0 ? (
        <div style={{
          background: 'var(--card-bg)', borderRadius: 14, padding: 24,
          textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, border: '1px solid var(--border)',
        }}>
          No time tracked in this period.
        </div>
      ) : (
        <>
          {drillId && (
            <button
              onClick={() => setDrillId(null)}
              style={{
                background: 'transparent', border: 'none', color: 'var(--accent)',
                fontSize: 14, fontWeight: 600, padding: '4px 0 12px', cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >‹ Back to all categories</button>
          )}

          {/* Pie chart */}
          <div style={{ background: 'var(--card-bg)', borderRadius: 16, padding: 16, marginBottom: 16, border: '1px solid var(--border)' }}>
            <Label>By category</Label>
            <PieChart slices={slices} total={slicesTotal} onSliceTap={(id) => {
              if (drillId) return; // already drilled
              if (id === '__unlabeled__') return;
              const node = findNode(nodes, id);
              if (node && nodes.some(n => n.parentId === id && !n.hidden)) setDrillId(id);
            }} />
            <div style={{ marginTop: 16 }}>
              {slices.map(s => (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 0', borderBottom: '1px solid var(--border)',
                  cursor: !drillId && s.id !== '__unlabeled__' && nodes.some(n => n.parentId === s.id && !n.hidden) ? 'pointer' : 'default',
                }}
                onClick={() => {
                  if (drillId) return;
                  if (s.id === '__unlabeled__') return;
                  if (nodes.some(n => n.parentId === s.id && !n.hidden)) setDrillId(s.id);
                }}
                >
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                  {s.icon && <NodeIcon icon={s.icon} size={16} fallbackColor={s.color} />}
                  <span style={{ flex: 1, fontSize: 14, color: 'var(--text)' }}>{s.name}</span>
                  <span style={{ fontSize: 14, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                    {formatDurationShort(s.ms)} · {Math.round((s.ms / slicesTotal) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Targets bar chart */}
          {period !== 'month' && (
            <div style={{ background: 'var(--card-bg)', borderRadius: 16, padding: 16, marginBottom: 16, border: '1px solid var(--border)' }}>
              <Label>vs. targets</Label>
              {nodes.filter(n => n.parentId == null && !n.hidden && (period === 'day' ? n.dailyTargetMinutes : n.weeklyTargetMinutes)).map(n => {
                const targetMin = period === 'day' ? n.dailyTargetMinutes : n.weeklyTargetMinutes;
                if (!targetMin) return null;
                const actualMs = totalsByNode.get(n.id) || 0;
                const targetMs = targetMin * 60 * 1000;
                const pct = Math.min(100, (actualMs / targetMs) * 100);
                const color = effectiveColor(nodes, n.id);
                const over = actualMs > targetMs;
                return (
                  <div key={n.id} style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: 'var(--text)', fontWeight: 600 }}>{n.name}</span>
                      <span style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                        {formatDurationShort(actualMs)} / {formatDurationShort(targetMs)}
                      </span>
                    </div>
                    <div style={{ height: 8, background: 'var(--input-bg)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                      <div style={{
                        width: `${pct}%`, height: '100%',
                        background: over ? 'var(--accent)' : color,
                        transition: 'width 0.3s',
                      }} />
                    </div>
                  </div>
                );
              })}
              {nodes.filter(n => n.parentId == null && !n.hidden && (period === 'day' ? n.dailyTargetMinutes : n.weeklyTargetMinutes)).length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '12px 0' }}>
                  No targets set. Add them in Settings.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const PieChart = ({ slices, total, onSliceTap }) => {
  const size = 200;
  const radius = 80;
  const cx = size / 2, cy = size / 2;
  const innerR = 50;

  if (total === 0 || slices.length === 0) {
    return (
      <div style={{ height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        No data
      </div>
    );
  }

  let cumAngle = -Math.PI / 2;
  const arcs = slices.map(s => {
    const angle = (s.ms / total) * Math.PI * 2;
    const a0 = cumAngle;
    const a1 = cumAngle + angle;
    cumAngle = a1;
    const large = angle > Math.PI ? 1 : 0;
    const x0 = cx + Math.cos(a0) * radius;
    const y0 = cy + Math.sin(a0) * radius;
    const x1 = cx + Math.cos(a1) * radius;
    const y1 = cy + Math.sin(a1) * radius;
    const ix0 = cx + Math.cos(a0) * innerR;
    const iy0 = cy + Math.sin(a0) * innerR;
    const ix1 = cx + Math.cos(a1) * innerR;
    const iy1 = cy + Math.sin(a1) * innerR;
    const d = `M ${x0} ${y0} A ${radius} ${radius} 0 ${large} 1 ${x1} ${y1} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${large} 0 ${ix0} ${iy0} Z`;
    return { d, color: s.color, id: s.id };
  });

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
      <svg width={size} height={size}>
        {arcs.map(a => (
          <path
            key={a.id}
            d={a.d}
            fill={a.color}
            onClick={() => onSliceTap(a.id)}
            style={{ cursor: 'pointer' }}
          />
        ))}
        <text
          x={cx} y={cy - 6} textAnchor="middle"
          style={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: 0.5 }}
        >Total</text>
        <text
          x={cx} y={cy + 14} textAnchor="middle"
          style={{ fontSize: 18, fill: 'var(--text)', fontFamily: 'var(--font-heading)', fontWeight: 400 }}
        >{formatDurationShort(total)}</text>
      </svg>
    </div>
  );
};


// ============================================================
// ROUTINES TAB
// ============================================================
const RoutinesTab = ({ routines, setRoutines, routineLogs, setRoutineLogs, nodes, onAutoLogEntry }) => {
  const [editing, setEditing] = useState(null); // routine being edited
  const [creating, setCreating] = useState(false);
  const today = todayStr();

  const todayLog = (routineId) => {
    return routineLogs.find(l => l.routineId === routineId && l.date === today)
      || { id: uid(), routineId, date: today, completedTaskIds: [] };
  };

  const upsertLog = (log) => {
    setRoutineLogs(prev => {
      const idx = prev.findIndex(l => l.routineId === log.routineId && l.date === log.date);
      if (idx === -1) return [...prev, log];
      const next = [...prev];
      next[idx] = log;
      return next;
    });
  };

  const toggleTask = (routine, task) => {
    const log = todayLog(routine.id);
    const has = log.completedTaskIds.includes(task.id);
    const completedTaskIds = has
      ? log.completedTaskIds.filter(id => id !== task.id)
      : [...log.completedTaskIds, task.id];
    upsertLog({ ...log, completedTaskIds });

    // Auto-log entry if task has nodeId + estimatedMinutes and is being checked
    if (!has && task.nodeId && task.estimatedMinutes) {
      const endTs = Date.now();
      const startTs = endTs - task.estimatedMinutes * 60 * 1000;
      onAutoLogEntry({
        id: uid(),
        nodeId: task.nodeId,
        label: task.label,
        startTs,
        endTs,
        durationMs: endTs - startTs,
        date: dateStr(new Date(startTs)),
        note: 'Auto-logged from routine',
      });
    }
  };

  // Streak: consecutive days back from today where the routine was 100% completed
  const computeStreak = (routine) => {
    let streak = 0;
    let d = today;
    while (true) {
      const log = routineLogs.find(l => l.routineId === routine.id && l.date === d);
      const allDone = log && routine.tasks.length > 0 && routine.tasks.every(t => log.completedTaskIds.includes(t.id));
      if (!allDone) break;
      streak++;
      d = addDays(d, -1);
      if (streak > 365) break;
    }
    return streak;
  };

  const order = { morning: 0, anytime: 1, evening: 2 };
  const sortedRoutines = [...routines].sort((a, b) => (order[a.timeOfDay] ?? 1) - (order[b.timeOfDay] ?? 1));

  return (
    <div style={{ padding: '16px 16px 100px' }}>
      <h1 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 400, color: 'var(--text)' }}>Routines</h1>
      <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4, marginBottom: 18 }}>{formatDateLong(today)}</div>

      {sortedRoutines.length === 0 && (
        <div style={{
          background: 'var(--card-bg)', borderRadius: 14, padding: 24,
          textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, border: '1px solid var(--border)',
        }}>
          No routines yet. Create one to track daily habits.
        </div>
      )}

      {sortedRoutines.map(r => {
        const log = todayLog(r.id);
        const done = log.completedTaskIds.length;
        const total = r.tasks.length;
        const pct = total === 0 ? 0 : (done / total);
        const streak = computeStreak(r);
        return (
          <div key={r.id} style={{
            background: 'var(--card-bg)', borderRadius: 18, padding: 16, marginBottom: 14,
            border: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              {/* Completion ring */}
              <RoutineRing pct={pct} done={done} total={total} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, color: 'var(--text)' }}>{r.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {r.timeOfDay} {streak > 0 && ` · 🔥 ${streak} day${streak === 1 ? '' : 's'}`}
                </div>
              </div>
              <button
                onClick={() => setEditing(r)}
                style={{
                  width: 32, height: 32, border: '1px solid var(--border)',
                  background: 'transparent', borderRadius: 8, cursor: 'pointer',
                  color: 'var(--text-muted)', fontSize: 14,
                }}
                aria-label="Edit"
              >✎</button>
            </div>
            {r.tasks.map(t => {
              const checked = log.completedTaskIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => toggleTask(r, t)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 0', border: 'none', background: 'transparent',
                    cursor: 'pointer', fontFamily: 'var(--font-body)', textAlign: 'left',
                  }}
                >
                  <span style={{
                    width: 22, height: 22, borderRadius: 6,
                    border: `2px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
                    background: checked ? 'var(--accent)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 14, flexShrink: 0,
                  }}>{checked ? '✓' : ''}</span>
                  <span style={{
                    flex: 1, fontSize: 15,
                    color: checked ? 'var(--text-muted)' : 'var(--text)',
                    textDecoration: checked ? 'line-through' : 'none',
                  }}>{t.label}</span>
                  {t.estimatedMinutes ? (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.estimatedMinutes}m</span>
                  ) : null}
                </button>
              );
            })}
            {r.tasks.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0', textAlign: 'center' }}>
                No tasks yet — tap edit to add some.
              </div>
            )}
          </div>
        );
      })}

      <button
        onClick={() => setCreating(true)}
        style={{
          width: '100%', padding: '14px', marginTop: 8,
          background: 'transparent', border: '2px dashed var(--border)',
          borderRadius: 14, color: 'var(--text-muted)', fontSize: 15,
          fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
        }}
      >+ New routine</button>

      {(editing || creating) && (
        <RoutineEditor
          routine={editing}
          nodes={nodes}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={(r) => {
            setRoutines(prev => {
              const exists = prev.some(x => x.id === r.id);
              return exists ? prev.map(x => x.id === r.id ? r : x) : [...prev, r];
            });
            setEditing(null); setCreating(false);
          }}
          onDelete={editing ? () => {
            setRoutines(prev => prev.filter(x => x.id !== editing.id));
            setEditing(null);
          } : null}
        />
      )}
    </div>
  );
};

const RoutineRing = ({ pct, done, total }) => {
  const size = 56, stroke = 5, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--input-bg)" strokeWidth={stroke} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke="var(--accent)" strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset 0.3s' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700, color: 'var(--text)',
      }}>{done}/{total}</div>
    </div>
  );
};

const RoutineEditor = ({ routine, nodes, onClose, onSave, onDelete }) => {
  const init = routine || { id: uid(), name: '', timeOfDay: 'morning', tasks: [] };
  const [name, setName] = useState(init.name);
  const [timeOfDay, setTimeOfDay] = useState(init.timeOfDay);
  const [tasks, setTasks] = useState(init.tasks);
  const [pickerForTask, setPickerForTask] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const updateTask = (id, patch) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, ...patch } : t));
  };
  const removeTask = (id) => setTasks(tasks.filter(t => t.id !== id));
  const addTask = () => setTasks([...tasks, { id: uid(), label: '', nodeId: null, estimatedMinutes: 0 }]);
  const moveTask = (id, dir) => {
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) return;
    const j = idx + dir;
    if (j < 0 || j >= tasks.length) return;
    const next = [...tasks];
    [next[idx], next[j]] = [next[j], next[idx]];
    setTasks(next);
  };

  const submit = () => {
    if (!name.trim()) return;
    const cleaned = tasks
      .filter(t => t.label.trim())
      .map(t => ({
        ...t,
        label: t.label.trim(),
        estimatedMinutes: t.estimatedMinutes ? Number(t.estimatedMinutes) : 0,
      }));
    onSave({ id: init.id, name: name.trim(), timeOfDay, tasks: cleaned });
  };

  return (
    <Modal open={true} onClose={onClose} title={routine ? 'Edit routine' : 'New routine'}>
      <div style={{ marginBottom: 14 }}>
        <Label>Name</Label>
        <TextInput value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Morning" />
      </div>
      <div style={{ marginBottom: 18 }}>
        <Label>Time of day</Label>
        <div style={{ display: 'flex', gap: 6 }}>
          {['morning', 'anytime', 'evening'].map(t => (
            <button
              key={t}
              onClick={() => setTimeOfDay(t)}
              style={{
                flex: 1, padding: '10px', border: '1px solid var(--border)',
                background: timeOfDay === t ? 'var(--accent)' : 'var(--input-bg)',
                color: timeOfDay === t ? '#fff' : 'var(--text)',
                borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                textTransform: 'capitalize', fontFamily: 'var(--font-body)',
              }}
            >{t}</button>
          ))}
        </div>
      </div>
      <Label>Tasks</Label>
      {tasks.map((t, i) => {
        const node = t.nodeId ? findNode(nodes, t.nodeId) : null;
        return (
          <div key={t.id} style={{
            background: 'var(--input-bg)', borderRadius: 12, padding: 10,
            marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                value={t.label}
                onChange={e => updateTask(t.id, { label: e.target.value })}
                placeholder="Task name"
                style={{
                  flex: 1, padding: '8px 10px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--card-bg)',
                  fontSize: 14, fontFamily: 'var(--font-body)',
                }}
              />
              <button
                onClick={() => moveTask(t.id, -1)}
                disabled={i === 0}
                style={{ width: 28, height: 32, border: 'none', background: 'transparent', color: i === 0 ? 'var(--border)' : 'var(--text-muted)', cursor: i === 0 ? 'default' : 'pointer', fontSize: 14 }}
              >↑</button>
              <button
                onClick={() => moveTask(t.id, 1)}
                disabled={i === tasks.length - 1}
                style={{ width: 28, height: 32, border: 'none', background: 'transparent', color: i === tasks.length - 1 ? 'var(--border)' : 'var(--text-muted)', cursor: i === tasks.length - 1 ? 'default' : 'pointer', fontSize: 14 }}
              >↓</button>
              <button
                onClick={() => removeTask(t.id)}
                style={{ width: 28, height: 32, border: 'none', background: 'transparent', color: 'var(--danger)', cursor: 'pointer', fontSize: 14 }}
              >×</button>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                onClick={() => setPickerForTask(t.id)}
                style={{
                  flex: 1, padding: '8px 10px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--card-bg)',
                  fontSize: 13, fontFamily: 'var(--font-body)', cursor: 'pointer',
                  textAlign: 'left', color: node ? 'var(--text)' : 'var(--text-muted)',
                }}
              >{node ? `→ ${nodeBreadcrumb(nodes, node.id)}` : '→ Link to category (optional)'}</button>
              <input
                type="number"
                inputMode="numeric"
                value={t.estimatedMinutes || ''}
                onChange={e => updateTask(t.id, { estimatedMinutes: e.target.value })}
                placeholder="min"
                style={{
                  width: 60, padding: '8px 10px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--card-bg)',
                  fontSize: 13, fontFamily: 'var(--font-body)', textAlign: 'center',
                }}
              />
            </div>
            {pickerForTask === t.id && (
              <Modal open={true} onClose={() => setPickerForTask(null)} title="Link to category">
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                  Checking off this task will auto-log time to this category.
                </div>
                <TreePicker
                  nodes={nodes}
                  selectedId={t.nodeId}
                  onSelect={(id) => { updateTask(t.id, { nodeId: id }); setPickerForTask(null); }}
                  allowClear={true}
                />
              </Modal>
            )}
          </div>
        );
      })}
      <button
        onClick={addTask}
        style={{
          width: '100%', padding: '10px', marginTop: 4, marginBottom: 18,
          background: 'transparent', border: '2px dashed var(--border)',
          borderRadius: 10, color: 'var(--text-muted)', fontSize: 14,
          fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
        }}
      >+ Add task</button>

      <div style={{ display: 'flex', gap: 10 }}>
        {routine && (
          <Button variant="secondary" onClick={() => setConfirmDelete(true)} style={{ flex: 1, color: 'var(--danger)' }}>Delete</Button>
        )}
        <Button onClick={submit} style={{ flex: routine ? 2 : 1 }}>{routine ? 'Save' : 'Create'}</Button>
      </div>

      {confirmDelete && (
        <Modal open={true} onClose={() => setConfirmDelete(false)} title="Delete routine?">
          <div style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 20 }}>
            This will remove the routine and its history. Time entries already logged are kept.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)} style={{ flex: 1 }}>Cancel</Button>
            <Button variant="danger" onClick={onDelete} style={{ flex: 1 }}>Delete</Button>
          </div>
        </Modal>
      )}
    </Modal>
  );
};


// ============================================================
// SETTINGS TAB
// ============================================================
const SettingsTab = ({ nodes, setNodes, exportAll, importAll, resetAll }) => {
  const [editingNode, setEditingNode] = useState(null);
  const [creatingUnder, setCreatingUnder] = useState(undefined); // undefined=closed, null=root, id=under that node
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef(null);

  const visibleTree = useMemo(() => buildTree(nodes), [nodes]);

  const addNode = (parentId, data) => {
    const colorIdx = nodes.filter(n => !n.parentId).length % DEFAULT_COLORS.length;
    const newNode = {
      id: uid(),
      parentId,
      name: data.name,
      color: data.color || (parentId ? null : DEFAULT_COLORS[colorIdx]),
      icon: data.icon || null,
      dailyTargetMinutes: data.dailyTargetMinutes || 0,
      weeklyTargetMinutes: data.weeklyTargetMinutes || 0,
      hidden: false,
    };
    setNodes([...nodes, newNode]);
  };

  const updateNode = (id, patch) => {
    setNodes(nodes.map(n => n.id === id ? { ...n, ...patch } : n));
  };

  const hideNode = (id) => {
    // soft-delete: mark this node and all descendants hidden
    const ids = getDescendantIds(nodes, id);
    setNodes(nodes.map(n => ids.has(n.id) ? { ...n, hidden: true } : n));
  };

  const onExport = () => {
    const data = exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = todayStr();
    a.href = url;
    a.download = `timetracker-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const onImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        const ok = importAll(data);
        alert(ok ? 'Backup imported successfully.' : 'Import failed: invalid file format.');
      } catch {
        alert('Import failed: could not parse file.');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const renderTreeRow = (node, depth) => {
    const color = effectiveColor(nodes, node.id);
    return (
      <div key={node.id}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', paddingLeft: 12 + depth * 16,
          borderRadius: 10, background: 'var(--card-bg)',
          border: '1px solid var(--border)', marginBottom: 6,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
          <NodeIcon icon={node.icon} size={20} fallbackColor={color} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, color: 'var(--text)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.name}</div>
            {(node.dailyTargetMinutes || node.weeklyTargetMinutes) ? (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {node.dailyTargetMinutes ? `${formatDurationShort(node.dailyTargetMinutes * 60000)}/day` : ''}
                {node.dailyTargetMinutes && node.weeklyTargetMinutes ? ' · ' : ''}
                {node.weeklyTargetMinutes ? `${formatDurationShort(node.weeklyTargetMinutes * 60000)}/wk` : ''}
              </div>
            ) : null}
          </div>
          <button
            onClick={() => setCreatingUnder(node.id)}
            aria-label="Add child"
            style={{ width: 30, height: 30, border: 'none', background: 'var(--input-bg)', borderRadius: 8, color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer' }}
          >+</button>
          <button
            onClick={() => setEditingNode(node)}
            aria-label="Edit"
            style={{ width: 30, height: 30, border: 'none', background: 'var(--input-bg)', borderRadius: 8, color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}
          >✎</button>
        </div>
        {node.children.map(c => renderTreeRow(c, depth + 1))}
      </div>
    );
  };

  return (
    <div style={{ padding: '16px 16px 100px' }}>
      <h1 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 400, color: 'var(--text)' }}>Settings</h1>

      <div style={{ marginTop: 24, marginBottom: 12 }}>
        <Label>Categories &amp; activities</Label>
      </div>
      {visibleTree.length === 0 ? (
        <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 14, textAlign: 'center' }}>
          No categories yet.
        </div>
      ) : (
        visibleTree.map(n => renderTreeRow(n, 0))
      )}
      <button
        onClick={() => setCreatingUnder(null)}
        style={{
          width: '100%', padding: '12px', marginTop: 6,
          background: 'transparent', border: '2px dashed var(--border)',
          borderRadius: 12, color: 'var(--text-muted)', fontSize: 14,
          fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
        }}
      >+ Add top-level category</button>

      <div style={{ marginTop: 32, marginBottom: 12 }}>
        <Label>Backup &amp; restore</Label>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <Button variant="secondary" onClick={onExport} style={{ flex: 1 }}>Export JSON</Button>
        <Button variant="secondary" onClick={() => fileRef.current?.click()} style={{ flex: 1 }}>Import JSON</Button>
        <input ref={fileRef} type="file" accept="application/json" onChange={onImportFile} style={{ display: 'none' }} />
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
        Backups include all categories, entries, routines, routine logs, and active timers. Importing replaces all current data.
      </div>

      <div style={{ marginTop: 32, marginBottom: 12 }}>
        <Label style={{ color: 'var(--danger)' }}>Danger zone</Label>
      </div>
      <Button variant="secondary" onClick={() => setConfirmReset(true)} style={{ width: '100%', color: 'var(--danger)' }}>
        Reset all data
      </Button>

      <div style={{ textAlign: 'center', marginTop: 32, fontSize: 11, color: 'var(--text-muted)' }}>
        Time Tracker · v1.0
      </div>

      {(editingNode || creatingUnder !== undefined) && (
        <NodeEditor
          node={editingNode}
          parentId={creatingUnder !== undefined ? creatingUnder : (editingNode ? editingNode.parentId : null)}
          existingNodes={nodes}
          isCreate={!editingNode}
          onClose={() => { setEditingNode(null); setCreatingUnder(undefined); }}
          onSave={(data) => {
            if (editingNode) {
              updateNode(editingNode.id, data);
            } else {
              addNode(creatingUnder, data);
            }
            setEditingNode(null);
            setCreatingUnder(undefined);
          }}
          onDelete={editingNode ? () => {
            hideNode(editingNode.id);
            setEditingNode(null);
          } : null}
        />
      )}

      {confirmReset && (
        <Modal open={true} onClose={() => setConfirmReset(false)} title="Reset all data?">
          <div style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 8 }}>
            This will permanently delete everything: categories, entries, routines, and active timers.
          </div>
          <div style={{ color: 'var(--danger)', fontSize: 13, fontWeight: 600, marginBottom: 20 }}>
            This cannot be undone. Export a backup first if you might want it back.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="secondary" onClick={() => setConfirmReset(false)} style={{ flex: 1 }}>Cancel</Button>
            <Button variant="danger" onClick={() => { resetAll(); setConfirmReset(false); }} style={{ flex: 1 }}>Reset everything</Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ============================================================
// NODE EDITOR (categories) — emoji / svg / image icons
// ============================================================
const NodeEditor = ({ node, parentId, existingNodes, isCreate, onClose, onSave, onDelete }) => {
  const init = node || { name: '', color: DEFAULT_COLORS[0], icon: null, dailyTargetMinutes: 0, weeklyTargetMinutes: 0 };
  const [name, setName] = useState(init.name);
  const [color, setColor] = useState(init.color || DEFAULT_COLORS[0]);
  const [icon, setIcon] = useState(init.icon);
  // store as strings to avoid the "0.3 → 3" issue
  const [daily, setDaily] = useState(String(init.dailyTargetMinutes || ''));
  const [weekly, setWeekly] = useState(String(init.weeklyTargetMinutes || ''));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [iconTab, setIconTab] = useState(icon?.type || 'emoji');
  const [emojiInput, setEmojiInput] = useState(icon?.type === 'emoji' ? icon.value : '');
  const fileRef = useRef(null);

  const parentNode = parentId ? findNode(existingNodes, parentId) : null;
  const inheritedColor = parentNode ? effectiveColor(existingNodes, parentId) : null;

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      // Resize to 96x96 via canvas
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 96;
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        // crop to square center
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setIcon({ type: 'image', value: dataUrl });
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const submit = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      color,
      icon,
      dailyTargetMinutes: daily ? Math.max(0, parseInt(daily, 10) || 0) : 0,
      weeklyTargetMinutes: weekly ? Math.max(0, parseInt(weekly, 10) || 0) : 0,
    });
  };

  return (
    <Modal open={true} onClose={onClose} title={isCreate ? (parentNode ? `New under ${parentNode.name}` : 'New category') : 'Edit category'}>
      <div style={{ marginBottom: 14 }}>
        <Label>Name</Label>
        <TextInput value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Deep Work" autoFocus />
      </div>

      <div style={{ marginBottom: 14 }}>
        <Label>Color</Label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {DEFAULT_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: 36, height: 36, borderRadius: 10, border: 'none',
                background: c, cursor: 'pointer',
                outline: color === c ? '3px solid var(--text)' : 'none',
                outlineOffset: 2,
              }}
              aria-label={c}
            />
          ))}
          {inheritedColor && (
            <button
              onClick={() => setColor(null)}
              style={{
                padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border)',
                background: 'var(--input-bg)', color: 'var(--text-muted)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
                outline: color == null ? '2px solid var(--text)' : 'none', outlineOffset: 2,
              }}
            >Inherit</button>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <Label>Icon</Label>
        <div style={{
          display: 'flex', gap: 4, padding: 4, marginBottom: 10,
          background: 'var(--input-bg)', borderRadius: 10, border: '1px solid var(--border)',
        }}>
          {['emoji', 'svg', 'image', 'none'].map(t => (
            <button
              key={t}
              onClick={() => {
                setIconTab(t);
                if (t === 'none') setIcon(null);
              }}
              style={{
                flex: 1, padding: '8px', border: 'none', cursor: 'pointer',
                borderRadius: 6, fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
                background: iconTab === t ? 'var(--card-bg)' : 'transparent',
                color: iconTab === t ? 'var(--text)' : 'var(--text-muted)',
                textTransform: 'capitalize',
              }}
            >{t}</button>
          ))}
        </div>

        {iconTab === 'emoji' && (
          <div>
            <input
              value={emojiInput}
              onChange={e => {
                const v = e.target.value;
                // keep just the latest character
                const arr = Array.from(v);
                const last = arr.length ? arr[arr.length - 1] : '';
                setEmojiInput(last);
                if (last) setIcon({ type: 'emoji', value: last });
                else setIcon(null);
              }}
              placeholder="Type or paste an emoji"
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                border: '1px solid var(--border)', background: 'var(--input-bg)',
                fontSize: 24, textAlign: 'center', fontFamily: 'var(--font-body)',
              }}
            />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {['💼','📚','🌿','🏃','☕','🎨','🧘','🍳','📞','✍️','🎵','🌙','🛠️','💰','🧠','🎯','🏡','📺'].map(e => (
                <button
                  key={e}
                  onClick={() => { setEmojiInput(e); setIcon({ type: 'emoji', value: e }); }}
                  style={{
                    width: 40, height: 40, fontSize: 22, border: '1px solid var(--border)',
                    background: emojiInput === e ? 'rgba(232,103,46,0.10)' : 'var(--card-bg)',
                    borderRadius: 8, cursor: 'pointer',
                  }}
                >{e}</button>
              ))}
            </div>
          </div>
        )}

        {iconTab === 'svg' && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {BUILTIN_ICON_NAMES.map(n => (
              <button
                key={n}
                onClick={() => setIcon({ type: 'svg', value: n })}
                style={{
                  width: 44, height: 44, border: '1px solid var(--border)',
                  background: icon?.type === 'svg' && icon.value === n ? 'rgba(232,103,46,0.10)' : 'var(--card-bg)',
                  borderRadius: 8, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                aria-label={n}
              >
                <BuiltInIcon name={n} size={22} color="var(--text)" />
              </button>
            ))}
          </div>
        )}

        {iconTab === 'image' && (
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
            {icon?.type === 'image' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <img src={icon.value} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--border)' }} />
                <button
                  onClick={() => setIcon(null)}
                  style={{ padding: '8px 12px', border: '1px solid var(--border)', background: 'var(--input-bg)', borderRadius: 8, fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                >Remove</button>
              </div>
            )}
            <Button variant="secondary" onClick={() => fileRef.current?.click()} style={{ width: '100%' }}>
              {icon?.type === 'image' ? 'Choose different image' : 'Choose from photos'}
            </Button>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
              Image is resized to 96×96 and stored locally as base64.
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <Label>Daily target (min)</Label>
          <TextInput
            inputMode="numeric"
            value={daily}
            onChange={e => setDaily(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="0"
          />
        </div>
        <div style={{ flex: 1 }}>
          <Label>Weekly target (min)</Label>
          <TextInput
            inputMode="numeric"
            value={weekly}
            onChange={e => setWeekly(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="0"
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        {!isCreate && (
          <Button variant="secondary" onClick={() => setConfirmDelete(true)} style={{ flex: 1, color: 'var(--danger)' }}>Delete</Button>
        )}
        <Button onClick={submit} style={{ flex: isCreate ? 1 : 2 }}>{isCreate ? 'Create' : 'Save'}</Button>
      </div>

      {confirmDelete && (
        <Modal open={true} onClose={() => setConfirmDelete(false)} title="Delete category?">
          <div style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 20 }}>
            This category and any sub-categories will be hidden. Time entries that referenced them will keep their history but show as "(removed)".
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)} style={{ flex: 1 }}>Cancel</Button>
            <Button variant="danger" onClick={onDelete} style={{ flex: 1 }}>Delete</Button>
          </div>
        </Modal>
      )}
    </Modal>
  );
};


// ============================================================
// TAB BAR
// ============================================================
const TAB_ICONS = {
  timer: 'M12 2v2 M12 20v2 M2 12h2 M20 12h2 M4.93 4.93l1.41 1.41 M17.66 17.66l1.41 1.41 M4.93 19.07l1.41-1.41 M17.66 6.34l1.41-1.41 M12 7v5l3 3',
  log: 'M3 5h18 M3 12h18 M3 19h18',
  stats: 'M3 21V11 M9 21V3 M15 21V14 M21 21V8',
  routines: 'M9 11l3 3 8-8 M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h.01a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.01a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z',
};

const TabBar = ({ activeTab, onChange }) => {
  const tabs = [
    { id: 'timer', label: 'Timer' },
    { id: 'log', label: 'Log' },
    { id: 'stats', label: 'Stats' },
    { id: 'routines', label: 'Routines' },
    { id: 'settings', label: 'Settings' },
  ];
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      display: 'flex', justifyContent: 'center',
      background: 'var(--card-bg)',
      borderTop: '1px solid var(--border)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      zIndex: 100,
    }}>
      <div style={{
        display: 'flex', width: '100%', maxWidth: 480,
      }}>
        {tabs.map(t => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              style={{
                flex: 1, padding: '10px 0 8px', border: 'none',
                background: 'transparent', cursor: 'pointer',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 4,
                color: active ? 'var(--accent)' : 'var(--text-muted)',
                fontFamily: 'var(--font-body)',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={TAB_ICONS[t.id]} />
              </svg>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.3 }}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

// ============================================================
// ROOT
// ============================================================
const STORAGE_VERSION = 1;

export default function TimeTracker() {
  const [nodes, setNodes] = useState(() => loadData('nodes', null) || makeDefaultNodes());
  const [entries, setEntries] = useState(() => loadData('entries', []));
  const [stopwatches, setStopwatches] = useState(() => loadData('stopwatches', []));
  const [routines, setRoutines] = useState(() => loadData('routines', null) || makeDefaultRoutines());
  const [routineLogs, setRoutineLogs] = useState(() => loadData('routineLogs', []));
  const [dayPlans, setDayPlans] = useState(() => loadData('dayPlans', [])); // stub for future
  const [activeTab, setActiveTab] = useState('timer');

  // Persistence
  useEffect(() => { saveData('nodes', nodes); }, [nodes]);
  useEffect(() => { saveData('entries', entries); }, [entries]);
  useEffect(() => { saveData('stopwatches', stopwatches); }, [stopwatches]);
  useEffect(() => { saveData('routines', routines); }, [routines]);
  useEffect(() => { saveData('routineLogs', routineLogs); }, [routineLogs]);
  useEffect(() => { saveData('dayPlans', dayPlans); }, [dayPlans]);

  // Inject CSS variables on root
  useEffect(() => {
    const root = document.documentElement;
    Object.entries(theme).forEach(([k, v]) => root.style.setProperty(k, v));
  }, []);

  const onPushEntry = useCallback((entry) => {
    setEntries(prev => [...prev, entry]);
  }, []);

  const exportAll = () => ({
    version: STORAGE_VERSION,
    exportedAt: new Date().toISOString(),
    nodes, entries, stopwatches, routines, routineLogs, dayPlans,
  });

  const importAll = (data) => {
    if (!data || typeof data !== 'object') return false;
    if (!Array.isArray(data.nodes) || !Array.isArray(data.entries)) return false;
    setNodes(data.nodes || []);
    setEntries(data.entries || []);
    setStopwatches(data.stopwatches || []);
    setRoutines(data.routines || []);
    setRoutineLogs(data.routineLogs || []);
    setDayPlans(data.dayPlans || []);
    return true;
  };

  const resetAll = () => {
    setNodes(makeDefaultNodes());
    setEntries([]);
    setStopwatches([]);
    setRoutines(makeDefaultRoutines());
    setRoutineLogs([]);
    setDayPlans([]);
  };

  return (
    <div style={{
      maxWidth: 480, margin: '0 auto',
      paddingTop: 'env(safe-area-inset-top)',
      minHeight: '100vh',
      background: 'var(--bg)',
    }}>
      {activeTab === 'timer' && (
        <TimerTab
          stopwatches={stopwatches}
          setStopwatches={setStopwatches}
          nodes={nodes}
          onPushEntry={onPushEntry}
        />
      )}
      {activeTab === 'log' && (
        <LogTab entries={entries} setEntries={setEntries} nodes={nodes} />
      )}
      {activeTab === 'stats' && (
        <StatsTab entries={entries} nodes={nodes} />
      )}
      {activeTab === 'routines' && (
        <RoutinesTab
          routines={routines}
          setRoutines={setRoutines}
          routineLogs={routineLogs}
          setRoutineLogs={setRoutineLogs}
          nodes={nodes}
          onAutoLogEntry={onPushEntry}
        />
      )}
      {activeTab === 'settings' && (
        <SettingsTab
          nodes={nodes}
          setNodes={setNodes}
          exportAll={exportAll}
          importAll={importAll}
          resetAll={resetAll}
        />
      )}
      <TabBar activeTab={activeTab} onChange={setActiveTab} />
    </div>
  );
}
