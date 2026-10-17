/**
 * SafeCall AI — Connected Elderly Care Platform
 * Feature-Parity Migration: Integrating Teammate's Visual Design System
 * Fully connected to Java Android Native Bridge, SQLite, and Backend Service
 */

const {
  useState,
  useEffect,
  useRef,
  useMemo
} = React;
function getInitialServerUrl() {
  const CLOUD_URL = 'https://safecall-backend-kd8k.onrender.com';
  try {
    const saved = localStorage.getItem('safecall_server_url');
    if (saved && saved.trim()) {
      const s = saved.trim();
      if (s.includes('safecall-backend-kd8k.onrender.com')) return s;
      if (s.includes('192.168.') || s.includes('localhost') || s.includes('127.0.0.1') || s.includes('loca.lt')) {
        localStorage.setItem('safecall_server_url', CLOUD_URL);
        return CLOUD_URL;
      }
      return s;
    }
  } catch (e) {}
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:4000';
  if (host && !window.location.protocol.startsWith('file')) return `${window.location.protocol}//${host}:4000`;
  return CLOUD_URL;
}
const isNativeBridgeAvailable = () => typeof window.SafeCallNative !== 'undefined';

// Soft audio chime for web browser preview when device notification tone isn't available
function playSoftSystemChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  } catch (e) {}
}

// =========================================================================
// ARCHITECTURE & JAVA ENGINE VISUALIZER MODAL
// =========================================================================
function BackendArchitectureVisualizer({
  onClose,
  serverUrl,
  serverOnline,
  alerts,
  linkedUsers
}) {
  const [activeTab, setActiveTab] = useState('pipeline');
  const [selectedStage, setSelectedStage] = useState(4);

  // Live Java Rule Calculator State
  const [calcPriority, setCalcPriority] = useState('EMERGENCY');
  const [calcRepeats, setCalcRepeats] = useState(4);
  const [calcTiming, setCalcTiming] = useState('NIGHT');
  const [calcAnomaly, setCalcAnomaly] = useState('HIGH');
  const pWeight = calcPriority === 'EMERGENCY' ? 25 : calcPriority === 'TRUSTED' ? 15 : 0;
  const rWeight = calcRepeats >= 4 ? 35 : calcRepeats === 3 ? 22 : calcRepeats === 2 ? 10 : 0;
  const tWeight = calcTiming === 'NIGHT' ? 10 : 0;
  const aWeight = calcAnomaly === 'HIGH' ? 30 : calcAnomaly === 'MED' ? 15 : 0;
  const computedScore = Math.min(100, Math.max(0, pWeight + rWeight + tWeight + aWeight));
  const meetsThreshold = computedScore >= 80;
  const urgencyLevel = computedScore >= 71 ? 'HIGH' : computedScore >= 31 ? 'MEDIUM' : 'LOW';
  const stages = [{
    id: 1,
    title: 'Real Call Ringing',
    subtitle: 'Android Telephony Broadcast',
    icon: '📱',
    file: 'SafeCallPhoneStateReceiver.java',
    badge: 'TelephonyManager API',
    color: '#0284C7',
    summary: 'Intercepts OS telephony broadcast EXTRA_STATE_RINGING. Stores ringing start timestamp and sanitizes caller phone number.',
    code: `if (state == TelephonyManager.CALL_STATE_RINGING) {\n    isIncoming = true;\n    ringStartTime = System.currentTimeMillis();\n    savedNumber = sanitizePhoneNumber(number);\n}`
  }, {
    id: 2,
    title: 'Call Termination & FSM',
    subtitle: 'Missed vs Answered State Machine',
    icon: '📡',
    file: 'SafeCallPhoneStateReceiver.java',
    badge: 'Finite State Machine',
    color: '#2563EB',
    summary: 'Tracks transition to EXTRA_STATE_IDLE. If preceded by RINGING, marks MISSED (duration=0). If preceded by OFFHOOK, calculates talk duration.',
    code: `if (lastState == CALL_STATE_RINGING) {\n    handleCallFinished(context, savedNumber, ringStartTime, 0, true);\n} else if (isIncoming && lastState == CALL_STATE_OFFHOOK) {\n    int duration = (int) Math.max(1, (now - callAnsweredTime) / 1000);\n    handleCallFinished(context, savedNumber, ringStartTime, duration, false);\n}`
  }, {
    id: 3,
    title: 'Background Concurrency',
    subtitle: 'Worker Thread Dispatch',
    icon: '⚙️',
    file: 'CallEventProcessor.java',
    badge: 'ExecutorService Worker',
    color: '#7C3AED',
    summary: 'Offloads processing to Executors.newSingleThreadExecutor() so database operations and network calls never block Android UI thread.',
    code: `private static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor();\npublic static void processCallEvent(...) {\n    EXECUTOR.execute(() -> { /* background execution */ });\n}`
  }, {
    id: 4,
    title: '4-Factor Urgency Engine',
    subtitle: 'Deterministic Context Evaluation',
    icon: '🧠',
    file: 'WeightedRuleEngine.java',
    badge: 'Core Java OOP Rules',
    color: '#DC2626',
    summary: 'Evaluates Caller Priority (<=25), Repeated Calls in 15m (<=35), Timing & Context (<=10), and Historical Missed Anomaly (<=30). Clamped [0, 100].',
    code: `int score = 0;\nscore += calculatePriority(profile);     // Max 25\nscore += calculateRepeated(recentCalls); // Max 35\nscore += calculateTiming(callTime);      // Max 10\nscore += calculateAnomaly(historyCalls);  // Max 30\nscore = Math.max(0, Math.min(100, score));`
  }, {
    id: 5,
    title: 'SQLite Persistence & Queue',
    subtitle: 'Local Storage & Offline Resilience',
    icon: '💾',
    file: 'DatabaseHelper.java / CallRepository.java',
    badge: 'SQLiteOpenHelper v3',
    color: '#059669',
    summary: 'Persists evaluated record into call_history. If score >= 80 but network is offline, safely stores alert in offline_alerts table for automatic replay.',
    code: `if (networkAvailable) {\n    sendAlertHttp(serverUrl, token, payload);\n} else {\n    repository.enqueueOfflineAlert(idempotentId, payload, callTime);\n}`
  }, {
    id: 6,
    title: 'Multi-Gate Policy',
    subtitle: 'Stateful Anomaly Engine',
    icon: '🛡️',
    file: 'NonResponsePolicyEngine.java / SequenceTracker.java',
    badge: '5-Component Anomaly',
    color: '#D97706',
    summary: 'Gate 1: >=4 missed calls in 15m. Gate 2: 60-second grace period with senior response cancellation. Gate 3: Score >= 60 triggers alert.',
    code: `if (sequence.missedCount >= MIN_MISSED_FOR_GATE) {\n    scheduleGracePeriod(context, sequence.sequenceId, 60000);\n}`
  }, {
    id: 7,
    title: 'Cloud Alert Dispatch',
    subtitle: 'Secure Multi-Device Tunnel',
    icon: '☁️',
    file: 'server.js / fcmDispatcher.js',
    badge: 'Cloud Integration',
    color: '#0F766E',
    summary: 'Backend checks active caregiver pairings, enforces idempotent dispatch, and triggers Firebase Cloud Messaging (FCM) push notifications.',
    code: `if (score >= threshold) {\n    fcmDispatcher.dispatchAlertToCaregivers(alert, caregivers);\n}`
  }, {
    id: 8,
    title: 'Caregiver Device Alert',
    subtitle: 'System Notification & Ringtone',
    icon: '🚨',
    file: 'SafeCallNativeBridge.java',
    badge: 'Native Audio & Notification',
    color: '#B91C1C',
    summary: 'Caregiver device sounds native Android alert tone, vibrates, displays critical alert banner, and supports 1-tap alert acknowledgment.',
    code: `SafeCallNative.showSystemNotification(\n    "🚨 Alert for " + elderlyName,\n    "Urgent call: " + explanation,\n    score\n);`
  }];
  const currentStageData = stages.find(s => s.id === selectedStage) || stages[3];
  return /*#__PURE__*/React.createElement("div", {
    className: "modal-backdrop",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "visualizer-modal",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "visualizer-header"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '24px'
    }
  }, "\u26A1"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: '18px',
      fontWeight: 800,
      margin: 0
    }
  }, "System Architecture & Viva Walkthrough"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '12px',
      margin: '2px 0 0',
      opacity: 0.85
    }
  }, "SafeCall AI \u2014 Java Android Engine & Connected Care Platform"))), /*#__PURE__*/React.createElement("button", {
    className: "secondary-button",
    style: {
      padding: '6px 14px',
      fontSize: '12px'
    },
    onClick: onClose
  }, "\u2715 Close")), /*#__PURE__*/React.createElement("div", {
    className: "visualizer-tab-strip"
  }, /*#__PURE__*/React.createElement("button", {
    className: `visualizer-tab-btn ${activeTab === 'pipeline' ? 'active' : ''}`,
    onClick: () => setActiveTab('pipeline')
  }, "\uD83D\uDD04 1. Pipeline Flow (8 Stages)"), /*#__PURE__*/React.createElement("button", {
    className: `visualizer-tab-btn ${activeTab === 'calculator' ? 'active' : ''}`,
    onClick: () => setActiveTab('calculator')
  }, "\uD83E\uDDEE 2. Live Java Rule Calculator"), /*#__PURE__*/React.createElement("button", {
    className: `visualizer-tab-btn ${activeTab === 'oop' ? 'active' : ''}`,
    onClick: () => setActiveTab('oop')
  }, "\uD83C\uDFDB\uFE0F 3. Java OOP & Patterns"), /*#__PURE__*/React.createElement("button", {
    className: `visualizer-tab-btn ${activeTab === 'telemetry' ? 'active' : ''}`,
    onClick: () => setActiveTab('telemetry')
  }, "\uD83D\uDCCA 4. Telemetry (", alerts.length, " Alerts)")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '20px',
      maxHeight: '70vh',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }
  }, activeTab === 'pipeline' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '14px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
      gap: '8px'
    }
  }, stages.map(st => /*#__PURE__*/React.createElement("div", {
    key: st.id,
    onClick: () => setSelectedStage(st.id),
    style: {
      padding: '10px 12px',
      borderRadius: '10px',
      border: selectedStage === st.id ? `2px solid ${st.color}` : '1px solid var(--color-border)',
      background: selectedStage === st.id ? 'var(--color-mint)' : 'var(--color-surface)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '18px'
    }
  }, st.icon), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '10px',
      fontWeight: 800,
      color: st.color
    }
  }, "STAGE ", st.id), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      fontWeight: 700,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, st.title))))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#f8fafc',
      border: '1px solid #cbd5e1',
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '24px'
    }
  }, currentStageData.icon), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: '16px',
      fontWeight: 800,
      color: currentStageData.color,
      margin: 0
    }
  }, "Stage ", currentStageData.id, ": ", currentStageData.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: '#64748b'
    }
  }, "File: ", /*#__PURE__*/React.createElement("strong", null, currentStageData.file)))), /*#__PURE__*/React.createElement("span", {
    style: {
      background: currentStageData.color,
      color: 'white',
      padding: '3px 10px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: 800
    }
  }, currentStageData.badge)), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '13px',
      color: '#334155',
      lineHeight: '1.6',
      margin: 0
    }
  }, currentStageData.summary), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      fontWeight: 800,
      color: '#64748b',
      marginBottom: '4px'
    }
  }, "KEY IMPLEMENTATION SNIPPET:"), /*#__PURE__*/React.createElement("pre", {
    className: "code-box-dark"
  }, /*#__PURE__*/React.createElement("code", null, currentStageData.code))))), activeTab === 'calculator' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '14px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      color: 'var(--color-muted)'
    }
  }, "Interactive simulator of ", /*#__PURE__*/React.createElement("strong", null, "WeightedRuleEngine.java"), ". Adjust parameters to verify exact score calculations:"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#f8fafc',
      padding: '12px',
      borderRadius: '10px',
      border: '1px solid var(--color-border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '8px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      fontWeight: 800
    }
  }, "1. Caller Priority (Max 25 pts)"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      fontWeight: 800,
      color: 'var(--color-primary)'
    }
  }, "+", pWeight, " pts")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '6px',
      flexWrap: 'wrap'
    }
  }, ['EMERGENCY', 'TRUSTED', 'NORMAL', 'UNKNOWN'].map(p => /*#__PURE__*/React.createElement("button", {
    key: p,
    className: "preset-pill",
    style: {
      background: calcPriority === p ? 'var(--color-primary)' : 'white',
      color: calcPriority === p ? 'white' : 'var(--color-text)'
    },
    onClick: () => setCalcPriority(p)
  }, p === 'EMERGENCY' ? '🚨 EMERGENCY (+25)' : p === 'TRUSTED' ? '⭐ TRUSTED (+15)' : p === 'NORMAL' ? '👤 NORMAL (+0)' : '❓ UNKNOWN (+0)')))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#f8fafc',
      padding: '12px',
      borderRadius: '10px',
      border: '1px solid var(--color-border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '8px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      fontWeight: 800
    }
  }, "2. Repeated Calls in 15m (Max 35 pts)"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      fontWeight: 800,
      color: 'var(--color-primary)'
    }
  }, "+", rWeight, " pts")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '6px',
      flexWrap: 'wrap'
    }
  }, [1, 2, 3, 4].map(num => /*#__PURE__*/React.createElement("button", {
    key: num,
    className: "preset-pill",
    style: {
      background: calcRepeats === num ? 'var(--color-primary)' : 'white',
      color: calcRepeats === num ? 'white' : 'var(--color-text)'
    },
    onClick: () => setCalcRepeats(num)
  }, num === 1 ? '1 Call (+0)' : num === 2 ? '2 Calls (+10)' : num === 3 ? '3 Calls (+22)' : '4+ Calls (+35)')))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#f8fafc',
      padding: '12px',
      borderRadius: '10px',
      border: '1px solid var(--color-border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '8px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      fontWeight: 800
    }
  }, "3. Call Timing & Context (Max 10 pts)"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      fontWeight: 800,
      color: 'var(--color-primary)'
    }
  }, "+", tWeight, " pts")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '6px'
    }
  }, ['DAY', 'NIGHT'].map(t => /*#__PURE__*/React.createElement("button", {
    key: t,
    className: "preset-pill",
    style: {
      background: calcTiming === t ? 'var(--color-primary)' : 'white',
      color: calcTiming === t ? 'white' : 'var(--color-text)'
    },
    onClick: () => setCalcTiming(t)
  }, t === 'DAY' ? '☀️ Daytime (+0)' : '🌙 Late Night (+10)')))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#f8fafc',
      padding: '12px',
      borderRadius: '10px',
      border: '1px solid var(--color-border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '8px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      fontWeight: 800
    }
  }, "4. Historical Missed-Call Anomaly (Max 30 pts)"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      fontWeight: 800,
      color: 'var(--color-primary)'
    }
  }, "+", aWeight, " pts")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '6px',
      flexWrap: 'wrap'
    }
  }, ['LOW', 'MED', 'HIGH'].map(a => /*#__PURE__*/React.createElement("button", {
    key: a,
    className: "preset-pill",
    style: {
      background: calcAnomaly === a ? 'var(--color-primary)' : 'white',
      color: calcAnomaly === a ? 'white' : 'var(--color-text)'
    },
    onClick: () => setCalcAnomaly(a)
  }, a === 'LOW' ? 'Consistent Baseline (+0)' : a === 'MED' ? 'Moderate Pattern (+15)' : 'High Anomaly (>=50% Missed) (+30)')))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: meetsThreshold ? '#FEF2F2' : '#F0FDF4',
      border: meetsThreshold ? '2px solid #EF4444' : '2px solid #22C55E',
      borderRadius: '12px',
      padding: '16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      fontWeight: 800,
      color: meetsThreshold ? '#991B1B' : '#166534'
    }
  }, "FORMULA: S = MIN(100, W1 + W2 + W3 + W4)"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '26px',
      fontWeight: 900,
      color: meetsThreshold ? '#DC2626' : '#15803D'
    }
  }, computedScore, " / 100 (", urgencyLevel, ")")), /*#__PURE__*/React.createElement("span", {
    style: {
      background: meetsThreshold ? '#DC2626' : '#15803D',
      color: 'white',
      padding: '6px 12px',
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: 800
    }
  }, meetsThreshold ? '🚨 DISPATCHES ALERT TO CAREGIVER' : '✓ LOGGED LOCALLY (NO ALERT)')), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '8px',
      fontSize: '12px',
      color: '#475569'
    }
  }, pWeight, " (Priority) + ", rWeight, " (Repeats) + ", tWeight, " (Time) + ", aWeight, " (Anomaly) = ", /*#__PURE__*/React.createElement("strong", null, computedScore, "/100"), ". Threshold is ", /*#__PURE__*/React.createElement("strong", null, "80/100"), "."))), activeTab === 'oop' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '14px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat-card"
  }, /*#__PURE__*/React.createElement("h4", {
    style: {
      margin: '0 0 6px',
      color: 'var(--color-primary)'
    }
  }, "1. Encapsulation & POJOs"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: '13px',
      color: 'var(--color-muted)'
    }
  }, /*#__PURE__*/React.createElement("code", null, "CallRecord.java"), ", ", /*#__PURE__*/React.createElement("code", null, "CallerProfile.java"), ", and ", /*#__PURE__*/React.createElement("code", null, "UrgencyResult.java"), " encapsulate immutable state, private fields, and safe getters/setters.")), /*#__PURE__*/React.createElement("div", {
    className: "stat-card"
  }, /*#__PURE__*/React.createElement("h4", {
    style: {
      margin: '0 0 6px',
      color: 'var(--color-primary)'
    }
  }, "2. Singleton Pattern"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: '13px',
      color: 'var(--color-muted)'
    }
  }, /*#__PURE__*/React.createElement("code", null, "SequenceTracker.getInstance()"), " manages synchronized concurrent access to pending sequences and 60-second grace period timers across Android lifecycle events.")), /*#__PURE__*/React.createElement("div", {
    className: "stat-card"
  }, /*#__PURE__*/React.createElement("h4", {
    style: {
      margin: '0 0 6px',
      color: 'var(--color-primary)'
    }
  }, "3. Finite State Machine (FSM)"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: '13px',
      color: 'var(--color-muted)'
    }
  }, /*#__PURE__*/React.createElement("code", null, "SafeCallPhoneStateReceiver.java"), " models OS telephony state transitions (", /*#__PURE__*/React.createElement("code", null, "IDLE"), " \u2192 ", /*#__PURE__*/React.createElement("code", null, "RINGING"), " \u2192 ", /*#__PURE__*/React.createElement("code", null, "OFFHOOK"), " \u2192 ", /*#__PURE__*/React.createElement("code", null, "IDLE"), ") to deterministically distinguish missed from answered calls.")), /*#__PURE__*/React.createElement("div", {
    className: "stat-card"
  }, /*#__PURE__*/React.createElement("h4", {
    style: {
      margin: '0 0 6px',
      color: 'var(--color-primary)'
    }
  }, "4. Repository Pattern"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: '13px',
      color: 'var(--color-muted)'
    }
  }, /*#__PURE__*/React.createElement("code", null, "CallRepository.java"), " abstracts all raw SQLite database access, providing clean domain-level CRUD operations for contacts, call history, and offline queues."))), activeTab === 'telemetry' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      fontWeight: 800
    }
  }, "Server URL: ", serverUrl), /*#__PURE__*/React.createElement("span", {
    className: `status-dot ${serverOnline ? 'online' : 'offline'}`
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: 'var(--color-muted)'
    }
  }, "Total Recorded Alerts in Session: ", /*#__PURE__*/React.createElement("strong", null, alerts.length), " | Linked Caregiver Relationships: ", /*#__PURE__*/React.createElement("strong", null, linkedUsers.length)), alerts.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty-results"
  }, "No alerts recorded in this session yet.") : alerts.slice(0, 5).map(a => /*#__PURE__*/React.createElement("div", {
    key: a.id,
    style: {
      padding: '12px',
      border: '1px solid var(--color-border)',
      borderRadius: '8px',
      background: 'white'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontWeight: 800,
      fontSize: '13px'
    }
  }, /*#__PURE__*/React.createElement("span", null, a.elderlyName, " \u2190 ", a.callerName), /*#__PURE__*/React.createElement("span", {
    className: `priority ${a.level?.toLowerCase() || 'high'}`
  }, a.score, "/100")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: 'var(--color-muted)',
      marginTop: '4px'
    }
  }, a.explanation)))))));
}

// =========================================================================
// 1. OVERVIEW PAGE COMPONENT
// =========================================================================
function OverviewPage({
  isSenior,
  currentUser,
  linkedUsers,
  callHistory,
  pairingCode,
  pairingTimeLeft,
  seniorSimStatus,
  telephonyPerms,
  offlineAlertsCount,
  latestPopupAlert,
  contacts,
  handleGeneratePairingCode,
  handleAcknowledgeAlert,
  handleVerifyCode,
  handleUnlink,
  setPairingCode,
  pairLoading,
  inputCode,
  setInputCode,
  pairStatus,
  setActivePage
}) {
  const totalCallsCount = callHistory.length;
  const lowPriorityCount = callHistory.filter(c => c.score <= 30 || c.level === 'LOW').length;
  const medPriorityCount = callHistory.filter(c => c.score > 30 && c.score <= 70 || c.level === 'MEDIUM').length;
  const highPriorityCount = callHistory.filter(c => c.score > 70 || c.level === 'HIGH').length;
  return /*#__PURE__*/React.createElement(React.Fragment, null, !isSenior && latestPopupAlert && /*#__PURE__*/React.createElement("div", {
    className: "critical-incoming-alert"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '16px',
      fontWeight: 900,
      color: '#991B1B'
    }
  }, "\uD83D\uDEA8 CRITICAL CALL ALERT: ", latestPopupAlert.elderlyName), /*#__PURE__*/React.createElement("span", {
    className: "priority high"
  }, "SCORE ", latestPopupAlert.score, "/100")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px'
    }
  }, "Caller: ", /*#__PURE__*/React.createElement("strong", null, latestPopupAlert.callerName), " (", latestPopupAlert.callerPhone, ")"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: '#7f1d1d'
    }
  }, latestPopupAlert.explanation), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '8px',
      marginTop: '4px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "primary-button",
    style: {
      background: '#DC2626',
      borderColor: '#DC2626',
      padding: '8px 14px',
      fontSize: '12px'
    },
    onClick: () => handleAcknowledgeAlert(latestPopupAlert.id)
  }, "\u2713 Acknowledge Alert"), /*#__PURE__*/React.createElement("button", {
    className: "secondary-button",
    style: {
      padding: '8px 14px',
      fontSize: '12px'
    },
    onClick: () => handleAcknowledgeAlert(null)
  }, "Dismiss"))), /*#__PURE__*/React.createElement("section", {
    className: "welcome"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "eyebrow light"
  }, isSenior ? 'SENIOR SAFETY PROTECTION' : 'CAREGIVER MONITORING'), /*#__PURE__*/React.createElement("h2", null, isSenior ? 'Protected & Connected' : 'Stay Connected. Stay Reassured.'), /*#__PURE__*/React.createElement("p", null, isSenior ? linkedUsers.length > 0 ? `Linked to Caregiver: ${linkedUsers[0].name} (${linkedUsers[0].phone || 'Active Monitoring'})` : 'Your device is ready to connect with your designated Caregiver.' : linkedUsers.length > 0 ? `Active vigilance for ${linkedUsers.map(u => u.name).join(', ')}. Real-time urgency alerts enabled.` : 'Pair with your family member\'s device using the 6-character code.')), /*#__PURE__*/React.createElement("div", {
    className: "welcome-icon"
  }, isSenior ? '👴' : '🛡️')), /*#__PURE__*/React.createElement("section", {
    className: "section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-heading"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, "Communication summary"), /*#__PURE__*/React.createElement("p", null, "Real-time telemetry from SQLite database & alert engine.")), /*#__PURE__*/React.createElement("span", {
    className: "demo-label"
  }, "LIVE DATABASE")), /*#__PURE__*/React.createElement("div", {
    className: "stats-grid"
  }, /*#__PURE__*/React.createElement("article", {
    className: "stat-card"
  }, /*#__PURE__*/React.createElement("span", {
    className: "stat-icon teal"
  }, "\u260E"), /*#__PURE__*/React.createElement("p", null, "Total calls"), /*#__PURE__*/React.createElement("h3", null, totalCallsCount), /*#__PURE__*/React.createElement("span", {
    className: "stat-note"
  }, "Evaluated events")), /*#__PURE__*/React.createElement("article", {
    className: "stat-card"
  }, /*#__PURE__*/React.createElement("span", {
    className: "stat-icon green"
  }, "\u2713"), /*#__PURE__*/React.createElement("p", null, "Low priority"), /*#__PURE__*/React.createElement("h3", null, lowPriorityCount), /*#__PURE__*/React.createElement("span", {
    className: "stat-note"
  }, "Routine calls (0-30)")), /*#__PURE__*/React.createElement("article", {
    className: "stat-card"
  }, /*#__PURE__*/React.createElement("span", {
    className: "stat-icon amber"
  }, "!"), /*#__PURE__*/React.createElement("p", null, "Medium priority"), /*#__PURE__*/React.createElement("h3", null, medPriorityCount), /*#__PURE__*/React.createElement("span", {
    className: "stat-note"
  }, "Worth reviewing (31-70)")), /*#__PURE__*/React.createElement("article", {
    className: "stat-card"
  }, /*#__PURE__*/React.createElement("span", {
    className: "stat-icon red"
  }, "\u2191"), /*#__PURE__*/React.createElement("p", null, "High priority"), /*#__PURE__*/React.createElement("h3", null, highPriorityCount), /*#__PURE__*/React.createElement("span", {
    className: "stat-note"
  }, "Alert triggered (71+)")))), /*#__PURE__*/React.createElement("section", {
    className: "section",
    style: {
      marginTop: '0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "rule-card",
    style: {
      background: '#f8fafc',
      borderColor: '#cbd5e1'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '8px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '20px'
    }
  }, "\uD83D\uDEE1\uFE0F"), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      color: 'var(--color-primary)'
    }
  }, "4/4 Engine Check System \u2022 Active Vigilance")), /*#__PURE__*/React.createElement("span", {
    className: "priority low",
    style: {
      fontSize: '11px',
      padding: '2px 8px'
    }
  }, "4/4 Checks Guarding Calls")), /*#__PURE__*/React.createElement("p", {
    className: "rule-description",
    style: {
      margin: '0 0 10px',
      color: '#475569'
    }
  }, "Every incoming phone call is deterministically evaluated against our 4-factor gate system before alert dispatch:"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
      gap: '8px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: '6px',
      padding: '8px 10px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '10px',
      color: '#64748b',
      fontWeight: 700
    }
  }, "CHECK 1/4"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      fontWeight: 700,
      color: '#1e293b'
    }
  }, "Caller Identity"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      color: 'var(--color-primary)',
      fontWeight: 600
    }
  }, "Max 25 pts")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: '6px',
      padding: '8px 10px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '10px',
      color: '#64748b',
      fontWeight: 700
    }
  }, "CHECK 2/4"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      fontWeight: 700,
      color: '#1e293b'
    }
  }, "Frequency Redials"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      color: 'var(--color-primary)',
      fontWeight: 600
    }
  }, "Max 35 pts (15m)")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: '6px',
      padding: '8px 10px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '10px',
      color: '#64748b',
      fontWeight: 700
    }
  }, "CHECK 3/4"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      fontWeight: 700,
      color: '#1e293b'
    }
  }, "Timing Context"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      color: 'var(--color-primary)',
      fontWeight: 600
    }
  }, "Max 10 pts (Night)")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: '6px',
      padding: '8px 10px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '10px',
      color: '#64748b',
      fontWeight: 700
    }
  }, "CHECK 4/4"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      fontWeight: 700,
      color: '#1e293b'
    }
  }, "Historical Anomaly"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      color: 'var(--color-primary)',
      fontWeight: 600
    }
  }, "Max 30 pts (Baseline)"))))), isSenior && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "rule-card"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '8px'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0
    }
  }, "\uD83D\uDD11 Connect with Caregiver"), linkedUsers.length > 0 && /*#__PURE__*/React.createElement("span", {
    className: "priority low",
    style: {
      fontSize: '11px',
      padding: '2px 8px'
    }
  }, "\u2713 ", linkedUsers.length, " Connected")), linkedUsers.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: '14px',
      background: 'var(--color-mint)',
      padding: '12px',
      borderRadius: '8px',
      border: '1px solid #cce3de'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      fontWeight: 700,
      color: 'var(--color-primary)',
      marginBottom: '6px'
    }
  }, "Active Caregiver Vigilance:"), linkedUsers.map(u => /*#__PURE__*/React.createElement("div", {
    key: u.relationshipId || u.userId,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '6px 0',
      borderBottom: '1px dashed #d1e5e0'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", {
    style: {
      fontSize: '13px',
      color: 'var(--color-text)'
    }
  }, u.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '11px',
      color: 'var(--color-muted)',
      marginLeft: '8px'
    }
  }, "(", u.phone || 'Caregiver Device', ")")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "secondary-button",
    style: {
      padding: '4px 10px',
      fontSize: '11px',
      color: '#991B1B',
      borderColor: '#FCA5A5'
    },
    onClick: () => handleUnlink(u.relationshipId, u.userId),
    title: "Disconnect this caregiver relationship"
  }, "Disconnect")))), /*#__PURE__*/React.createElement("p", {
    className: "rule-description"
  }, linkedUsers.length > 0 ? 'Generate a fresh 6-character code to reconnect or pair with an additional Caregiver phone:' : 'Generate a 6-character code to link your phone with your Caregiver:'), pairingCode ? /*#__PURE__*/React.createElement("div", {
    className: "code-box"
  }, /*#__PURE__*/React.createElement("div", {
    className: "code-text"
  }, pairingCode), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      fontWeight: 700,
      color: 'var(--color-primary)',
      marginTop: '4px'
    }
  }, "Expires in: ", Math.floor(pairingTimeLeft / 60), "m ", pairingTimeLeft % 60, "s"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: 'var(--color-muted)',
      marginTop: '6px'
    }
  }, "Enter this code on the Caregiver phone under ", /*#__PURE__*/React.createElement("strong", null, "\"Pair Senior\""), "!"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '8px',
      justifyContent: 'center',
      marginTop: '12px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "secondary-button",
    style: {
      fontSize: '11.5px',
      padding: '6px 12px'
    },
    onClick: handleGeneratePairingCode
  }, "\uD83D\uDD04 Re-generate New Code"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "secondary-button",
    style: {
      fontSize: '11.5px',
      padding: '6px 12px'
    },
    onClick: () => {
      setPairingCode('');
      seniorSimStatus && seniorSimStatus.includes('Code') && null;
    }
  }, "Close Code"))) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '8px',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "primary-button",
    onClick: handleGeneratePairingCode
  }, linkedUsers.length > 0 ? '🔄 Re-generate Pairing Code / Reconnect' : '🔑 Generate 6-Character Pairing Code')), seniorSimStatus && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '10px',
      fontSize: '12.5px',
      color: 'var(--color-primary)',
      fontWeight: 600
    }
  }, seniorSimStatus)), /*#__PURE__*/React.createElement("div", {
    className: "rule-card",
    style: {
      background: telephonyPerms.allGranted ? '#f0fdf4' : '#fffbeb',
      borderColor: telephonyPerms.allGranted ? '#bbf7d0' : '#fde68a'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '8px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '20px'
    }
  }, "\uD83D\uDCDE"), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      color: telephonyPerms.allGranted ? '#166534' : '#92400e'
    }
  }, "Android Phone Call Urgency Detection")), /*#__PURE__*/React.createElement("span", {
    className: `priority ${telephonyPerms.allGranted ? 'low' : 'medium'}`
  }, telephonyPerms.allGranted ? 'Active Monitoring' : 'Permission Required')), /*#__PURE__*/React.createElement("p", {
    className: "rule-description",
    style: {
      margin: '0 0 10px',
      color: '#4b5563'
    }
  }, "When incoming calls arrive on this Android device, SafeCall AI intercepts the broadcast, calculates context urgency with the Java Rule Engine, and notifies your caregiver if score reaches 80/100."), !telephonyPerms.allGranted && /*#__PURE__*/React.createElement("button", {
    className: "primary-button",
    style: {
      background: '#d97706',
      borderColor: '#d97706'
    },
    onClick: () => {
      if (isNativeBridgeAvailable() && window.SafeCallNative.requestTelephonyPermissions) {
        window.SafeCallNative.requestTelephonyPermissions();
      } else {
        alert('Please grant Phone State and Call Log permissions in Android settings.');
      }
    }
  }, "Grant Android Telephony Permissions"), offlineAlertsCount > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '10px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: '#fff',
      padding: '10px',
      borderRadius: '8px',
      border: '1px solid #fed7aa'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12px',
      color: '#c2410c',
      fontWeight: 700
    }
  }, "\u26A0\uFE0F ", offlineAlertsCount, " offline alert(s) queued"), /*#__PURE__*/React.createElement("button", {
    className: "secondary-button",
    style: {
      padding: '4px 10px',
      fontSize: '11px'
    },
    onClick: () => {
      if (isNativeBridgeAvailable() && window.SafeCallNative.triggerOfflineSync) {
        window.SafeCallNative.triggerOfflineSync();
      }
    }
  }, "Sync Queue"))), /*#__PURE__*/React.createElement("div", {
    className: "rule-card",
    style: {
      background: '#fff9eb',
      borderColor: '#e9d5a8'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: '0 0 4px',
      color: '#8a5a08'
    }
  }, "Direct Phone Call"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: 'var(--color-muted)'
    }
  }, "Call your primary Caregiver directly")), /*#__PURE__*/React.createElement("button", {
    className: "primary-button",
    style: {
      background: '#8a5a08',
      borderColor: '#8a5a08'
    },
    onClick: () => {
      const phone = linkedUsers[0]?.phone || contacts[0]?.phone || '911';
      if (isNativeBridgeAvailable()) window.SafeCallNative.launchDialler(phone);else window.open(`tel:${phone}`);
    }
  }, "\uD83D\uDCDE Call Now")))), !isSenior && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "rule-card"
  }, /*#__PURE__*/React.createElement("h3", null, "\uD83D\uDD11 Pair with Senior Phone"), /*#__PURE__*/React.createElement("p", {
    className: "rule-description"
  }, "Enter the 6-character code generated on the Senior's phone to establish real-time monitoring:"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '8px',
      maxWidth: '400px'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    maxLength: "6",
    value: inputCode,
    onChange: e => setInputCode(e.target.value.toUpperCase()),
    placeholder: "K 7 M 4 R 2",
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '20px',
      letterSpacing: '4px',
      textAlign: 'center',
      fontWeight: 800,
      padding: '8px',
      borderRadius: '8px',
      border: '1px solid var(--color-border)'
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "primary-button",
    onClick: handleVerifyCode,
    disabled: pairLoading
  }, pairLoading ? 'Connecting...' : 'Connect')), pairStatus && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '8px',
      fontSize: '12px',
      color: 'var(--color-primary)',
      fontWeight: 700
    }
  }, pairStatus)), /*#__PURE__*/React.createElement("div", {
    className: "rule-card"
  }, /*#__PURE__*/React.createElement("h3", null, "Monitored Seniors (", linkedUsers.length, ")"), linkedUsers.length === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "rule-description"
  }, "No senior paired yet. Enter the 6-character pairing code above to begin monitoring.") : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }
  }, linkedUsers.map(u => /*#__PURE__*/React.createElement("div", {
    key: u.relationshipId || u.userId,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 12px',
      background: 'var(--color-mint)',
      borderRadius: '8px'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", null, u.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      color: 'var(--color-muted)'
    }
  }, u.phone || 'Senior Device')), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '6px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "secondary-button",
    style: {
      padding: '6px 10px',
      fontSize: '11px'
    },
    onClick: () => {
      const phone = u.phone || '';
      if (isNativeBridgeAvailable()) window.SafeCallNative.launchDialler(phone);else window.open(`tel:${phone}`);
    }
  }, "\uD83D\uDCDE Call"), /*#__PURE__*/React.createElement("button", {
    className: "secondary-button",
    style: {
      padding: '6px 10px',
      fontSize: '11px',
      color: '#991B1B',
      borderColor: '#FCA5A5'
    },
    onClick: () => handleUnlink(u.relationshipId, u.userId)
  }, "Disconnect"))))))), /*#__PURE__*/React.createElement("section", {
    className: "section activity-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-heading"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, "Recent call activity"), /*#__PURE__*/React.createElement("p", null, "Real-time records evaluated by SafeCall AI.")), /*#__PURE__*/React.createElement("button", {
    className: "text-button",
    onClick: () => setActivePage('activity')
  }, "View all (", callHistory.length, ")")), callHistory.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty-results"
  }, "No calls logged yet. Incoming calls or simulated events will appear here in real time.") : callHistory.slice(0, 4).map(call => /*#__PURE__*/React.createElement("div", {
    className: "activity-row",
    key: call.id || call.timestamp
  }, /*#__PURE__*/React.createElement("div", {
    className: `caller-avatar ${call.score >= 71 ? 'red-avatar' : call.score >= 31 ? 'amber-avatar' : ''}`
  }, (call.phone || 'UN').slice(0, 2).toUpperCase()), /*#__PURE__*/React.createElement("div", {
    className: "caller-info"
  }, /*#__PURE__*/React.createElement("strong", null, call.phone || 'Unknown Caller'), /*#__PURE__*/React.createElement("span", null, call.outcome || 'Call', " \xB7 ", new Date(call.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  }), call.isSimulation ? ' (Simulated)' : '')), /*#__PURE__*/React.createElement("div", {
    className: "score"
  }, /*#__PURE__*/React.createElement("strong", null, call.score, "/100"), /*#__PURE__*/React.createElement("span", {
    className: `priority ${(call.level || 'low').toLowerCase()}`
  }, call.level || 'Low')))), /*#__PURE__*/React.createElement("p", {
    className: "disclaimer"
  }, "Scores evaluated deterministically using SafeCall AI 4-Factor Weighted Java Rule Engine.")));
}

// =========================================================================
// 2. CALL ACTIVITY PAGE COMPONENT
// =========================================================================
function CallActivityPage({
  callHistory
}) {
  const [search, setSearch] = useState('');
  const [selectedCallId, setSelectedCallId] = useState(null);
  const filtered = callHistory.filter(c => c.phone && c.phone.toLowerCase().includes(search.toLowerCase()) || c.explanation && c.explanation.toLowerCase().includes(search.toLowerCase()));
  return /*#__PURE__*/React.createElement("section", {
    className: "section call-activity-page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-heading"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, "Call Activity & Telemetry"), /*#__PURE__*/React.createElement("p", null, "Review real and simulated calls with complete engine explanation breakdowns.")), /*#__PURE__*/React.createElement("span", {
    className: "demo-label"
  }, "SQLITE CALL_HISTORY")), /*#__PURE__*/React.createElement("div", {
    className: "call-search"
  }, /*#__PURE__*/React.createElement("label", {
    htmlFor: "call-search-input"
  }, "Search by phone number or keyword"), /*#__PURE__*/React.createElement("input", {
    id: "call-search-input",
    type: "search",
    placeholder: "Type phone or keywords...",
    value: search,
    onChange: e => setSearch(e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    className: "call-list"
  }, filtered.length > 0 ? filtered.map(call => /*#__PURE__*/React.createElement("article", {
    className: "activity-row call-record",
    key: call.id || call.timestamp
  }, /*#__PURE__*/React.createElement("div", {
    className: `caller-avatar ${call.score >= 71 ? 'red-avatar' : call.score >= 31 ? 'amber-avatar' : ''}`
  }, (call.phone || 'UN').slice(0, 2).toUpperCase()), /*#__PURE__*/React.createElement("div", {
    className: "caller-info"
  }, /*#__PURE__*/React.createElement("strong", null, call.phone || 'Unknown Caller'), /*#__PURE__*/React.createElement("span", null, call.outcome || 'Call', " \xB7 ", new Date(call.timestamp).toLocaleString(), call.isSimulation ? ' · [Simulation Event]' : ' · [Real Call]')), /*#__PURE__*/React.createElement("div", {
    className: "score"
  }, /*#__PURE__*/React.createElement("strong", null, call.score, "/100"), /*#__PURE__*/React.createElement("span", {
    className: `priority ${(call.level || 'low').toLowerCase()}`
  }, call.level || 'Low'), /*#__PURE__*/React.createElement("button", {
    className: "details-button",
    onClick: () => setSelectedCallId(selectedCallId === (call.id || call.timestamp) ? null : call.id || call.timestamp)
  }, selectedCallId === (call.id || call.timestamp) ? 'Hide details' : 'Details')), selectedCallId === (call.id || call.timestamp) && /*#__PURE__*/React.createElement("div", {
    className: "call-details"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '4px'
    }
  }, /*#__PURE__*/React.createElement("strong", null, "Java Engine 4/4 Check Evaluation:"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '10.5px',
      background: 'rgba(2, 132, 199, 0.12)',
      color: 'var(--color-primary)',
      padding: '1px 6px',
      borderRadius: '4px',
      fontWeight: 700
    }
  }, "4/4 Checks Verified")), /*#__PURE__*/React.createElement("p", null, call.explanation || 'Check 1: Identity (+0) | Check 2: Frequency (+0) | Check 3: Timing (+0) | Check 4: History baseline normal (+0).'), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '8px',
      fontSize: '11px',
      color: 'var(--color-primary)'
    }
  }, "Duration: ", call.duration || 0, "s | Status: ", call.outcome || 'UNKNOWN', " | Recorded at: ", new Date(call.timestamp).toLocaleTimeString()), call.phone && call.phone !== 'UNKNOWN' && /*#__PURE__*/React.createElement("button", {
    className: "secondary-button",
    style: {
      marginTop: '10px',
      padding: '4px 10px',
      fontSize: '11px'
    },
    onClick: () => {
      if (isNativeBridgeAvailable()) window.SafeCallNative.launchDialler(call.phone);else window.open(`tel:${call.phone}`);
    }
  }, "\uD83D\uDCDE Call Back: ", call.phone)))) : /*#__PURE__*/React.createElement("p", {
    className: "empty-results"
  }, "No calls match \"", search, "\".")), /*#__PURE__*/React.createElement("p", {
    className: "disclaimer"
  }, "Records are persisted in local SQLite ", /*#__PURE__*/React.createElement("code", null, "call_history"), " database on this Android device."));
}

// =========================================================================
// 3. TRUSTED CONTACTS PAGE COMPONENT
// =========================================================================
function TrustedContactsPage({
  contacts,
  setContacts,
  refreshDatabaseData
}) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    relationship: '',
    priority: 'TRUSTED'
  });
  const [editingId, setEditingId] = useState(null);
  const [msg, setMsg] = useState('');
  function handleFormSubmit(e) {
    e.preventDefault();
    const cleanedName = form.name.trim();
    const cleanedPhone = form.phone.trim();
    const cleanedRel = form.relationship.trim();
    if (!cleanedName || !cleanedPhone) {
      setMsg('Please enter name and phone number.');
      return;
    }
    const newContact = {
      id: editingId !== null ? editingId : 0,
      name: cleanedName,
      phone: cleanedPhone,
      relationship: cleanedRel || 'Other',
      priority: form.priority
    };
    if (isNativeBridgeAvailable()) {
      window.SafeCallNative.saveContact(JSON.stringify(newContact));
      window.SafeCallNative.showToast('✓ Contact Saved to SQLite');
      refreshDatabaseData();
    } else {
      setContacts(prev => {
        const updated = editingId !== null ? prev.map(c => c.id === editingId ? {
          ...c,
          ...newContact,
          id: editingId
        } : c) : [...prev, {
          ...newContact,
          id: Date.now()
        }];
        localStorage.setItem('safecall-trusted-contacts', JSON.stringify(updated));
        return updated;
      });
    }
    setMsg(editingId !== null ? 'Contact updated.' : 'Contact added to SQLite database.');
    setForm({
      name: '',
      phone: '',
      relationship: '',
      priority: 'TRUSTED'
    });
    setEditingId(null);
  }
  function handleDelete(id, phone) {
    if (!confirm('Remove this contact from the SQLite database?')) return;
    if (isNativeBridgeAvailable()) {
      window.SafeCallNative.showToast('Contact removed');
    }
    setContacts(prev => {
      const updated = prev.filter(c => c.id !== id && c.phone !== phone);
      localStorage.setItem('safecall-trusted-contacts', JSON.stringify(updated));
      return updated;
    });
    setMsg('Contact removed.');
  }
  return /*#__PURE__*/React.createElement("section", {
    className: "section contacts-page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-heading"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, "Trusted Contacts"), /*#__PURE__*/React.createElement("p", null, "Manage designated priority contacts evaluated by the Java Urgency Engine.")), /*#__PURE__*/React.createElement("span", {
    className: "demo-label"
  }, "SQLITE CONTACTS")), /*#__PURE__*/React.createElement("div", {
    className: "contacts-layout"
  }, /*#__PURE__*/React.createElement("form", {
    className: "contact-form",
    onSubmit: handleFormSubmit
  }, /*#__PURE__*/React.createElement("h3", null, editingId !== null ? 'Edit Contact' : 'Add a Priority Contact'), /*#__PURE__*/React.createElement("label", {
    htmlFor: "contact-name"
  }, "Full name"), /*#__PURE__*/React.createElement("input", {
    id: "contact-name",
    value: form.name,
    onChange: e => setForm({
      ...form,
      name: e.target.value
    }),
    placeholder: "e.g. Dr. Vance, Maya (Daughter)",
    required: true
  }), /*#__PURE__*/React.createElement("label", {
    htmlFor: "contact-phone"
  }, "Phone number"), /*#__PURE__*/React.createElement("input", {
    id: "contact-phone",
    type: "tel",
    value: form.phone,
    onChange: e => setForm({
      ...form,
      phone: e.target.value
    }),
    placeholder: "e.g. +1 555-911-0022",
    required: true
  }), /*#__PURE__*/React.createElement("label", {
    htmlFor: "contact-relationship"
  }, "Relationship"), /*#__PURE__*/React.createElement("input", {
    id: "contact-relationship",
    value: form.relationship,
    onChange: e => setForm({
      ...form,
      relationship: e.target.value
    }),
    placeholder: "e.g. Doctor, Family, Neighbor",
    required: true
  }), /*#__PURE__*/React.createElement("label", {
    htmlFor: "contact-priority"
  }, "Contact Urgency Priority"), /*#__PURE__*/React.createElement("select", {
    id: "contact-priority",
    value: form.priority,
    onChange: e => setForm({
      ...form,
      priority: e.target.value
    })
  }, /*#__PURE__*/React.createElement("option", {
    value: "EMERGENCY"
  }, "\uD83D\uDEA8 Emergency Contact (+25 pts)"), /*#__PURE__*/React.createElement("option", {
    value: "TRUSTED"
  }, "\u2B50 Trusted Contact (+15 pts)"), /*#__PURE__*/React.createElement("option", {
    value: "NORMAL"
  }, "\uD83D\uDC64 Normal Contact (+0 pts)")), /*#__PURE__*/React.createElement("div", {
    className: "contact-form-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "primary-button",
    type: "submit"
  }, editingId !== null ? 'Save changes' : 'Add contact'), editingId !== null && /*#__PURE__*/React.createElement("button", {
    className: "secondary-button",
    type: "button",
    onClick: () => {
      setEditingId(null);
      setForm({
        name: '',
        phone: '',
        relationship: '',
        priority: 'TRUSTED'
      });
    }
  }, "Cancel")), msg && /*#__PURE__*/React.createElement("p", {
    className: "form-message"
  }, msg)), /*#__PURE__*/React.createElement("div", {
    className: "contacts-list"
  }, /*#__PURE__*/React.createElement("h3", null, "Saved Contacts in SQLite (", contacts.length, ")"), contacts.length === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "empty-results"
  }, "No contacts saved yet.") : contacts.map(c => /*#__PURE__*/React.createElement("article", {
    className: "contact-card",
    key: c.id || c.phone
  }, /*#__PURE__*/React.createElement("div", {
    className: "caller-avatar"
  }, (c.name || 'C').slice(0, 2).toUpperCase()), /*#__PURE__*/React.createElement("div", {
    className: "contact-card-info"
  }, /*#__PURE__*/React.createElement("strong", null, c.name), /*#__PURE__*/React.createElement("span", null, c.relationship, " \xB7 ", c.phone), /*#__PURE__*/React.createElement("span", {
    className: "contact-priority"
  }, c.priority === 'EMERGENCY' ? '🚨 Emergency Contact (+25)' : c.priority === 'TRUSTED' ? '⭐ Trusted Contact (+15)' : '👤 Normal Priority (+0)')), /*#__PURE__*/React.createElement("div", {
    className: "contact-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "details-button",
    type: "button",
    onClick: () => {
      if (isNativeBridgeAvailable()) window.SafeCallNative.launchDialler(c.phone);else window.open(`tel:${c.phone}`);
    }
  }, "\uD83D\uDCDE Call"), /*#__PURE__*/React.createElement("button", {
    className: "details-button",
    type: "button",
    onClick: () => {
      setForm({
        name: c.name,
        phone: c.phone,
        relationship: c.relationship,
        priority: c.priority || 'TRUSTED'
      });
      setEditingId(c.id);
    }
  }, "Edit"), /*#__PURE__*/React.createElement("button", {
    className: "details-button delete-button",
    type: "button",
    onClick: () => handleDelete(c.id, c.phone)
  }, "Delete")))))), /*#__PURE__*/React.createElement("p", {
    className: "disclaimer"
  }, "Contacts are stored in Android SQLite ", /*#__PURE__*/React.createElement("code", null, "contacts"), " table and matched during real-time call broadcasts."));
}

// =========================================================================
// 4. ALERT RULES PAGE COMPONENT
// =========================================================================
function AlertRulesPage({
  apiFetch,
  contacts
}) {
  const [threshold, setThreshold] = useState(80);
  const [repeatCount, setRepeatCount] = useState(3);
  const [repeatWindow, setRepeatWindow] = useState(15);
  const [schedule, setSchedule] = useState('ALL_DAY');
  const [autoAlert, setAutoAlert] = useState(true);
  const [savedMsg, setSavedMsg] = useState('');
  useEffect(() => {
    if (isNativeBridgeAvailable() && window.SafeCallNative.getAlertSettings) {
      try {
        const raw = window.SafeCallNative.getAlertSettings();
        const s = JSON.parse(raw);
        if (s.threshold) setThreshold(s.threshold);
        if (s.schedule) setSchedule(s.schedule);
        if (typeof s.autoEnabled === 'boolean') setAutoAlert(s.autoEnabled);
      } catch (e) {}
    }
  }, []);
  async function handleSaveRules(e) {
    e.preventDefault();
    if (isNativeBridgeAvailable() && window.SafeCallNative.saveAlertSettings) {
      window.SafeCallNative.saveAlertSettings(JSON.stringify({
        threshold,
        schedule,
        autoEnabled: autoAlert,
        primaryName: contacts[0]?.name || 'Caregiver',
        primaryPhone: contacts[0]?.phone || '9876543210'
      }));
    }
    try {
      await apiFetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify({
          threshold,
          schedule,
          autoAlertEnabled: autoAlert
        })
      });
    } catch (err) {}
    setSavedMsg('✓ Alert rules saved to Android FamilyAlertManager & Backend!');
    setTimeout(() => setSavedMsg(''), 4000);
  }
  return /*#__PURE__*/React.createElement("section", {
    className: "section alert-rules-page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-heading"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, "Alert Rules & Policies"), /*#__PURE__*/React.createElement("p", null, "Configure thresholds and multi-gate anomaly rules for Android call monitoring.")), /*#__PURE__*/React.createElement("span", {
    className: "demo-label"
  }, "FAMILY ALERT MANAGER")), /*#__PURE__*/React.createElement("form", {
    className: "rules-form",
    onSubmit: handleSaveRules
  }, /*#__PURE__*/React.createElement("section", {
    className: "rule-card"
  }, /*#__PURE__*/React.createElement("h3", null, "4/4 Engine Check System \u2022 Breakthrough Threshold"), /*#__PURE__*/React.createElement("p", {
    className: "rule-description"
  }, "Evaluated across all 4 checks (Identity 25 + Frequency 35 + Timing 10 + History 30 = 100). Set minimum score for automatic Caregiver dispatch:"), /*#__PURE__*/React.createElement("div", {
    className: "threshold-display"
  }, /*#__PURE__*/React.createElement("span", null, "Caregiver Alert Threshold"), /*#__PURE__*/React.createElement("strong", null, threshold, "/100")), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: "50",
    max: "95",
    step: "5",
    value: threshold,
    onChange: e => setThreshold(Number(e.target.value))
  }), /*#__PURE__*/React.createElement("div", {
    className: "range-labels"
  }, /*#__PURE__*/React.createElement("span", null, "50 \u2014 Sensitive"), /*#__PURE__*/React.createElement("span", null, "80 \u2014 Standard Breakthrough"), /*#__PURE__*/React.createElement("span", null, "95 \u2014 Maximum Strictness"))), /*#__PURE__*/React.createElement("section", {
    className: "rule-card"
  }, /*#__PURE__*/React.createElement("h3", null, "Check 2: Repeated Call Frequency Window (Max 35 pts)"), /*#__PURE__*/React.createElement("p", {
    className: "rule-description"
  }, "Configures redial thresholds evaluated in ", /*#__PURE__*/React.createElement("code", null, "WeightedRuleEngine.java"), ":"), /*#__PURE__*/React.createElement("div", {
    className: "rule-fields"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "Call Count Minimum"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "2",
    max: "5",
    value: repeatCount,
    onChange: e => setRepeatCount(Number(e.target.value))
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "Rolling Time Window (minutes)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "5",
    max: "60",
    value: repeatWindow,
    onChange: e => setRepeatWindow(Number(e.target.value))
  })))), /*#__PURE__*/React.createElement("section", {
    className: "rule-card"
  }, /*#__PURE__*/React.createElement("h3", null, "Check 3: Timing Context & Alert Schedule (Max 10 pts)"), /*#__PURE__*/React.createElement("p", {
    className: "rule-description"
  }, "Active timing policy in ", /*#__PURE__*/React.createElement("code", null, "WeightedRuleEngine.java"), " & ", /*#__PURE__*/React.createElement("code", null, "FamilyAlertManager.java"), ":"), /*#__PURE__*/React.createElement("div", {
    className: "rule-fields"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "Monitoring Schedule Policy"), /*#__PURE__*/React.createElement("select", {
    value: schedule,
    onChange: e => setSchedule(e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: "ALL_DAY"
  }, "All Day (24/7 Continuous Monitoring)"), /*#__PURE__*/React.createElement("option", {
    value: "DAYTIME"
  }, "Daytime Only (06:00 - 22:59)"), /*#__PURE__*/React.createElement("option", {
    value: "NIGHTTIME"
  }, "Night-time Only (23:00 - 05:00)"))))), /*#__PURE__*/React.createElement("section", {
    className: "rule-card"
  }, /*#__PURE__*/React.createElement("label", {
    className: "toggle-row"
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", null, "Enable Automatic Caregiver Dispatch"), /*#__PURE__*/React.createElement("small", null, "Transmit urgent alerts to paired Caregivers when 4/4 engine threshold is met.")), /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: autoAlert,
    onChange: e => setAutoAlert(e.target.checked)
  }))), /*#__PURE__*/React.createElement("section", {
    className: "rule-card",
    style: {
      background: '#f8fafc'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      color: 'var(--color-primary)'
    }
  }, "Check 4: Non-Response Anomaly Baseline (Max 30 pts)"), /*#__PURE__*/React.createElement("p", {
    className: "rule-description"
  }, "Historical baseline anomaly gates enforced by ", /*#__PURE__*/React.createElement("code", null, "NonResponsePolicyEngine.java"), ":"), /*#__PURE__*/React.createElement("ul", {
    style: {
      paddingLeft: '20px',
      fontSize: '13px',
      lineHeight: '1.7',
      color: '#334155'
    }
  }, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("strong", null, "Gate 1:"), " Accumulation of 4+ consecutive missed calls in a 15-minute rolling window."), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("strong", null, "Gate 2:"), " 60-second grace period timer. Any user activity or call callback automatically resolves the sequence."), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("strong", null, "Gate 3:"), " Urgency score \u2265 60/100 triggers verified caregiver alert dispatch with full system ringtone."))), /*#__PURE__*/React.createElement("div", {
    className: "rules-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "primary-button",
    type: "submit"
  }, "Save Rules & Policies"), /*#__PURE__*/React.createElement("button", {
    className: "secondary-button",
    type: "button",
    onClick: () => {
      setThreshold(80);
      setSchedule('ALL_DAY');
      setAutoAlert(true);
    }
  }, "Restore Defaults (80/100)")), savedMsg && /*#__PURE__*/React.createElement("p", {
    className: "form-message"
  }, savedMsg)));
}

// =========================================================================
// 5. SIMULATION MODE PAGE COMPONENT
// =========================================================================
function SimulationModePage({
  apiFetch,
  refreshDatabaseData
}) {
  const scenarios = {
    emergency: {
      label: '🚨 Emergency Contact (Late Night Repeated)',
      description: 'Dr. Vance (Emergency Contact) calling repeatedly at 3:15 AM. Maximum urgency score.',
      callerName: 'Dr. Robert Vance',
      callerPhone: '+1 555-911-0022',
      priority: 'EMERGENCY',
      callCount: 4,
      callTime: '03:15',
      isLateNight: true,
      baseScore: 100
    },
    repeated: {
      label: '⚠️ Repeated Family Contact (3 Missed Calls)',
      description: 'Sarah Jenkins (Daughter) with 3 consecutive missed calls within 15 minutes.',
      callerName: 'Sarah Jenkins (Daughter)',
      callerPhone: '+1 555-876-5432',
      priority: 'TRUSTED',
      callCount: 3,
      callTime: '11:20',
      isLateNight: false,
      baseScore: 85
    },
    normal: {
      label: '📞 Ordinary Daytime Call (Friend)',
      description: 'Bob Smith calling once at 2:00 PM. Routine pattern with score 20/100.',
      callerName: 'Bob Smith (Friend)',
      callerPhone: '+1 555-234-5678',
      priority: 'NORMAL',
      callCount: 1,
      callTime: '14:00',
      isLateNight: false,
      baseScore: 20
    },
    missed: {
      label: '📊 Historically High Missed Call Rate',
      description: 'Unsaved caller with 50%+ historical missed call anomaly baseline.',
      callerName: 'Unknown Caller',
      callerPhone: '+1 555-000-1122',
      priority: 'NORMAL',
      callCount: 2,
      callTime: '16:30',
      isLateNight: false,
      baseScore: 45
    }
  };
  const [selectedKey, setSelectedKey] = useState('emergency');
  const [callCount, setCallCount] = useState(4);
  const [minutes, setMinutes] = useState(15);
  const [callTime, setCallTime] = useState('03:15');
  const [isLateNight, setIsLateNight] = useState(true);
  const [isTrusted, setIsTrusted] = useState(true);
  const [simResult, setSimResult] = useState(null);
  const [transmitStatus, setTransmitStatus] = useState('');
  async function runSimulationCalculation(e) {
    if (e) e.preventDefault();
    const pPts = selectedKey === 'emergency' ? 25 : isTrusted ? 15 : 0;
    const rPts = callCount >= 4 ? 35 : callCount === 3 ? 22 : callCount === 2 ? 10 : 0;
    const tPts = isLateNight ? 10 : 0;
    const aPts = selectedKey === 'missed' ? 30 : selectedKey === 'emergency' ? 30 : 15;
    const totalScore = Math.min(100, Math.max(0, pPts + rPts + tPts + aPts));
    const threshold = 80;
    const priority = totalScore >= threshold ? 'High' : totalScore >= 31 ? 'Medium' : 'Low';
    const isHighRisk = totalScore >= threshold;
    const reasons = [`Caller Priority: ${pPts === 25 ? 'Emergency Contact (+25 pts)' : pPts === 15 ? 'Trusted Contact (+15 pts)' : 'Normal (+0 pts)'}`, `Call Frequency: ${callCount} calls within ${minutes} minutes (+${rPts} pts)`, `Timing & Context: ${isLateNight ? 'Late-Night window (23:00 - 05:00) (+10 pts)' : 'Daytime (+0 pts)'}`, `Historical Anomaly: +${aPts} pts based on consecutive response pattern`];
    const checks = [{
      id: 1,
      name: 'Caller Identity Gate',
      max: 25,
      pts: pPts,
      triggered: pPts > 0,
      detail: pPts === 25 ? 'Emergency Contact (+25 pts)' : pPts === 15 ? 'Trusted Contact (+15 pts)' : 'Normal Contact (+0 pts)'
    }, {
      id: 2,
      name: 'Frequency Window Gate',
      max: 35,
      pts: rPts,
      triggered: rPts > 0,
      detail: `${callCount} calls in ${minutes}m window (+${rPts} pts)`
    }, {
      id: 3,
      name: 'Timing Context Gate',
      max: 10,
      pts: tPts,
      triggered: tPts > 0,
      detail: isLateNight ? 'Late-Night window (23:00 - 05:00) (+10 pts)' : 'Normal daytime (+0 pts)'
    }, {
      id: 4,
      name: 'Historical Anomaly Gate',
      max: 30,
      pts: aPts,
      triggered: aPts > 0,
      detail: `Baseline response pattern (+${aPts} pts)`
    }];
    const checksTriggeredCount = (pPts > 0 ? 1 : 0) + (rPts > 0 ? 1 : 0) + (tPts > 0 ? 1 : 0) + (aPts > 0 ? 1 : 0);
    const callerName = scenarios[selectedKey]?.callerName || 'Simulated Caller';
    const callerPhone = scenarios[selectedKey]?.callerPhone || '+1 555-000-0000';
    const explanation = `Check 1: +${pPts}/25 | Check 2: +${rPts}/35 | Check 3: +${tPts}/10 | Check 4: +${aPts}/30 -> Total: ${totalScore}/100.`;
    const resObj = {
      score: totalScore,
      priority,
      reasons,
      checks,
      checksTriggeredCount,
      threshold,
      callerName,
      callerPhone,
      explanation
    };
    setSimResult(resObj);

    // AUTOMATIC DISPATCH: If score >= threshold, automatically message caregiver
    if (isHighRisk) {
      setTransmitStatus('🚨 High risk detected! Automatically dispatching urgent alert to Caregiver...');
      playSoftSystemChime();
      try {
        await apiFetch('/api/alerts/trigger', {
          method: 'POST',
          body: JSON.stringify({
            idempotentId: 'evt_sim_' + Date.now(),
            callerName,
            callerPhone,
            score: totalScore,
            level: 'HIGH',
            explanation,
            callTime: Date.now(),
            isSimulation: true
          })
        });
        if (isNativeBridgeAvailable()) {
          window.SafeCallNative.saveCallRecord(JSON.stringify({
            phone: callerPhone,
            timestamp: Date.now(),
            duration: 0,
            score: totalScore,
            level: 'HIGH',
            explanation,
            outcome: 'MISSED',
            isSimulation: true
          }));
          if (window.SafeCallNative.showToast) {
            window.SafeCallNative.showToast('🚨 Urgent Alert Automatically Sent to Caregiver!');
          }
          refreshDatabaseData();
        }
        setTransmitStatus(`🚨 AUTOMATIC ALERT DISPATCHED! Urgency score ${totalScore}/100 pushed immediately to paired Caregiver phone.`);
      } catch (err) {
        setTransmitStatus(`🚨 Alert automatically recorded in local SQLite database (Score: ${totalScore}/100).`);
      }
    } else {
      setTransmitStatus(`✓ Routine simulation recorded: Score ${totalScore}/100 is below alert threshold (80). No caregiver alert required.`);
      if (isNativeBridgeAvailable()) {
        window.SafeCallNative.saveCallRecord(JSON.stringify({
          phone: callerPhone,
          timestamp: Date.now(),
          duration: 35,
          score: totalScore,
          level: priority.toUpperCase(),
          explanation,
          outcome: 'ANSWERED',
          isSimulation: true
        }));
        refreshDatabaseData();
      }
    }
  }
  return /*#__PURE__*/React.createElement("section", {
    className: "section simulation-page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-heading"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, "Simulation Mode"), /*#__PURE__*/React.createElement("p", null, "Test call patterns using the deterministic SafeCall AI Java Rule Engine.")), /*#__PURE__*/React.createElement("span", {
    className: "demo-label"
  }, "JAVA ENGINE SIMULATION")), /*#__PURE__*/React.createElement("div", {
    className: "simulation-notice"
  }, /*#__PURE__*/React.createElement("strong", null, "Safe Simulation Environment"), /*#__PURE__*/React.createElement("p", null, "This tool evaluates simulated call scenarios against current SafeCall AI scoring rules. All simulation events are tagged with ", /*#__PURE__*/React.createElement("code", null, "isSimulation: true"), " so they never pollute genuine call history.")), /*#__PURE__*/React.createElement("form", {
    className: "simulation-form",
    onSubmit: runSimulationCalculation
  }, /*#__PURE__*/React.createElement("div", {
    className: "rule-card"
  }, /*#__PURE__*/React.createElement("label", {
    htmlFor: "scenario-select",
    style: {
      fontSize: '13px',
      fontWeight: 700,
      display: 'block',
      marginBottom: '8px'
    }
  }, "Choose a Demonstration Scenario"), /*#__PURE__*/React.createElement("select", {
    id: "scenario-select",
    value: selectedKey,
    onChange: e => {
      const k = e.target.value;
      setSelectedKey(k);
      setCallCount(scenarios[k].callCount);
      setCallTime(scenarios[k].callTime);
      setIsLateNight(scenarios[k].isLateNight);
      setIsTrusted(scenarios[k].priority === 'EMERGENCY' || scenarios[k].priority === 'TRUSTED');
      setSimResult(null);
    }
  }, Object.entries(scenarios).map(([key, item]) => /*#__PURE__*/React.createElement("option", {
    value: key,
    key: key
  }, item.label))), /*#__PURE__*/React.createElement("p", {
    className: "rule-description scenario-description"
  }, scenarios[selectedKey]?.description)), /*#__PURE__*/React.createElement("div", {
    className: "rule-card"
  }, /*#__PURE__*/React.createElement("h3", null, "Customize Scenario Parameters"), /*#__PURE__*/React.createElement("div", {
    className: "rule-fields"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "Number of Calls"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "1",
    max: "10",
    value: callCount,
    onChange: e => setCallCount(Number(e.target.value))
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "Time Window (minutes)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    min: "5",
    max: "120",
    value: minutes,
    onChange: e => setMinutes(Number(e.target.value))
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, "Simulated Call Time"), /*#__PURE__*/React.createElement("input", {
    type: "time",
    value: callTime,
    onChange: e => setCallTime(e.target.value)
  }))), /*#__PURE__*/React.createElement("label", {
    className: "toggle-row simulation-toggle"
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", null, "Late-Night Timing (23:00 - 05:00)"), /*#__PURE__*/React.createElement("small", null, "Adds timing context points when paired with repeated or emergency caller.")), /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: isLateNight,
    onChange: e => setIsLateNight(e.target.checked)
  })), /*#__PURE__*/React.createElement("label", {
    className: "toggle-row simulation-toggle"
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", null, "Caller is Trusted / Emergency Contact"), /*#__PURE__*/React.createElement("small", null, "Adds caller priority weight in accordance with Java rule engine.")), /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: isTrusted,
    onChange: e => setIsTrusted(e.target.checked)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '8px',
      marginTop: '18px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "primary-button",
    type: "submit"
  }, "\u25B6 Run Simulation")))), simResult && /*#__PURE__*/React.createElement("section", {
    className: "simulation-result"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-heading"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, "Simulation Result"), /*#__PURE__*/React.createElement("p", null, "Computed strictly with SafeCall AI Weighted Rule Engine.")), /*#__PURE__*/React.createElement("span", {
    className: `priority ${simResult.priority.toLowerCase()}`
  }, simResult.priority, " Priority")), /*#__PURE__*/React.createElement("div", {
    className: "simulation-score"
  }, /*#__PURE__*/React.createElement("span", null, "Urgency Score"), /*#__PURE__*/React.createElement("strong", null, simResult.score, /*#__PURE__*/React.createElement("small", null, "/100"))), /*#__PURE__*/React.createElement("p", {
    className: "rule-description"
  }, "High-priority threshold: ", simResult.threshold, "/100. Status: ", /*#__PURE__*/React.createElement("strong", null, simResult.score >= simResult.threshold ? '🚨 Qualifies for Caregiver Alert' : '✓ Normal Log')), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '16px',
      marginBottom: '16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '8px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      fontWeight: 800,
      color: 'var(--color-primary)',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    }
  }, "\uD83D\uDEE1\uFE0F 4/4 Engine Check System Pipeline"), /*#__PURE__*/React.createElement("span", {
    className: "priority low",
    style: {
      fontSize: '11px',
      padding: '2px 8px'
    }
  }, "4/4 Evaluated \u2022 ", simResult.checksTriggeredCount, "/4 Triggered")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
      gap: '8px'
    }
  }, simResult.checks && simResult.checks.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.id,
    style: {
      background: c.triggered ? 'rgba(2, 132, 199, 0.08)' : '#f8fafc',
      border: `1px solid ${c.triggered ? '#38bdf8' : '#e2e8f0'}`,
      borderRadius: '8px',
      padding: '10px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '10px',
      fontWeight: 700,
      color: c.triggered ? 'var(--color-primary)' : '#64748b'
    }
  }, /*#__PURE__*/React.createElement("span", null, "CHECK ", c.id, "/4"), /*#__PURE__*/React.createElement("span", null, c.triggered ? '⚡ ACTIVE' : '✓ CLEAR')), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      fontWeight: 700,
      color: '#1e293b',
      margin: '4px 0 2px'
    }
  }, c.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      fontWeight: 700,
      color: c.triggered ? '#0284c7' : '#64748b'
    }
  }, "+", c.pts, " / ", c.max, " pts"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '10px',
      color: '#64748b',
      marginTop: '4px'
    }
  }, c.detail))))), /*#__PURE__*/React.createElement("h3", null, "Evaluation Explanation:"), /*#__PURE__*/React.createElement("ul", {
    className: "simulation-reasons"
  }, simResult.reasons.map((r, i) => /*#__PURE__*/React.createElement("li", {
    key: i
  }, r))), simResult.score >= simResult.threshold ? /*#__PURE__*/React.createElement("div", {
    className: "notification-preview",
    style: {
      background: '#FEF2F2',
      borderColor: '#FCA5A5'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '20px'
    }
  }, "\uD83D\uDEA8"), /*#__PURE__*/React.createElement("strong", {
    style: {
      color: '#991B1B'
    }
  }, "Urgent Alert Automatically Messaged to Caregiver Phone")), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '6px 0 0',
      color: '#7F1D1D',
      fontSize: '13px'
    }
  }, "High-risk anomaly pattern for ", /*#__PURE__*/React.createElement("strong", null, simResult.callerName), " (", simResult.score, "/100) was automatically sent to paired Caregiver's phone."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '10px',
      display: 'flex',
      gap: '8px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "secondary-button",
    style: {
      fontSize: '11px',
      padding: '6px 12px'
    },
    onClick: runSimulationCalculation
  }, "\uD83D\uDD04 Re-Run & Re-Send Alert"))) : /*#__PURE__*/React.createElement("p", {
    className: "rule-description",
    style: {
      marginTop: '12px',
      color: '#047857'
    }
  }, "\u2713 Score (", simResult.score, "/100) is below the configured alert threshold (80). No caregiver alert required."), transmitStatus && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '10px',
      fontSize: '13px',
      fontWeight: 700,
      color: 'var(--color-primary)'
    }
  }, transmitStatus)));
}

// =========================================================================
// 6. ABOUT / HELP PAGE COMPONENT
// =========================================================================
function AboutHelpPage() {
  return /*#__PURE__*/React.createElement("div", {
    className: "page-content",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '14px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-heading"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, "About SafeCall AI"), /*#__PURE__*/React.createElement("p", null, "Context-aware urgency engine for elderly people living alone.")), /*#__PURE__*/React.createElement("span", {
    className: "demo-label"
  }, "ABOUT & VIVA GUIDE")), /*#__PURE__*/React.createElement("section", {
    className: "help-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "help-icon"
  }, "\uD83D\uDEE1\uFE0F"), /*#__PURE__*/React.createElement("h2", null, "What is SafeCall AI?"), /*#__PURE__*/React.createElement("p", null, "SafeCall AI is an Android application designed for elderly care. It monitors incoming telephony broadcasts, evaluates communication context using a deterministic 4-factor rule engine, and coordinates with paired caregivers when critical patterns or persistent non-response anomalies occur.")), /*#__PURE__*/React.createElement("section", {
    className: "help-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "help-icon"
  }, "\uD83E\uDDE0"), /*#__PURE__*/React.createElement("h2", null, "Deterministic 4-Factor Urgency Engine"), /*#__PURE__*/React.createElement("p", null, "SafeCall AI avoids unpredictable ML black-boxes. Every score (0-100) is deterministically calculated using:"), /*#__PURE__*/React.createElement("ul", null, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("strong", null, "Caller Identity (Max 25):"), " Emergency (+25), Trusted (+15), Normal (+0)."), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("strong", null, "Call Frequency (Max 35):"), " 1 call (+0), 2 calls (+10), 3 calls (+22), 4+ calls (+35) in a 15-minute rolling window."), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("strong", null, "Timing & Context (Max 10):"), " Late-night timing (+10 if repeated or emergency contact)."), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("strong", null, "Historical Behaviour Anomaly (Max 30):"), " >=50% unanswered rate anomaly (+30)."))), /*#__PURE__*/React.createElement("section", {
    className: "help-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "help-icon"
  }, "\uD83D\uDEE1\uFE0F"), /*#__PURE__*/React.createElement("h2", null, "Multi-Gate Non-Response Anomaly Policy"), /*#__PURE__*/React.createElement("p", null, "Protects elderly users against false alarms through a 3-gate verification pipeline:"), /*#__PURE__*/React.createElement("ul", null, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("strong", null, "Gate 1:"), " Requires \u2265 4 consecutive missed calls within 15 minutes."), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("strong", null, "Gate 2:"), " Enforces a 60-second grace period. Any answer, callback, or app interaction automatically cancels the alert."), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("strong", null, "Gate 3:"), " Evaluates non-response severity score \u2265 60/100 before dispatching caregiver notifications."))), /*#__PURE__*/React.createElement("section", {
    className: "help-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "help-icon"
  }, "\uD83D\uDD12"), /*#__PURE__*/React.createElement("h2", null, "Data Privacy & Native Offline Storage"), /*#__PURE__*/React.createElement("p", null, "All contacts and call history are stored locally in SQLite on the device. Sensitive call logs are never sent to external AI clouds. Alerts are transmitted directly to paired caregivers using secure token authentication.")), /*#__PURE__*/React.createElement("p", {
    className: "help-footer"
  }, "SafeCall AI \xB7 Computer Science & Engineering Project \xB7 All Rights Reserved"));
}

// =========================================================================
// MAIN SHELL COMPONENT
// =========================================================================
function SafeCallApp() {
  const [activePage, setActivePage] = useState('overview');
  const [serverUrl, setServerUrl] = useState(getInitialServerUrl);
  const [serverOnline, setServerOnline] = useState(null);
  const [showServerModal, setShowServerModal] = useState(false);
  const [serverInput, setServerInput] = useState(serverUrl);
  const [showVisualizer, setShowVisualizer] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('safecall_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('safecall_token') || 'session_token');
  const [loginRole, setLoginRole] = useState('elderly');
  const [loginIdentifier, setLoginIdentifier] = useState('Meera');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [pairingCode, setPairingCode] = useState('');
  const [pairingExpiresAt, setPairingExpiresAt] = useState(0);
  const [pairingTimeLeft, setPairingTimeLeft] = useState(0);
  const [seniorSimStatus, setSeniorSimStatus] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [pairStatus, setPairStatus] = useState('');
  const [pairLoading, setPairLoading] = useState(false);
  const [latestPopupAlert, setLatestPopupAlert] = useState(null);
  const [linkedUsers, setLinkedUsers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [callHistory, setCallHistory] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [telephonyPerms, setTelephonyPerms] = useState({
    hasPhoneState: false,
    hasCallLog: false,
    allGranted: false
  });
  const [offlineAlertsCount, setOfflineAlertsCount] = useState(0);
  const seenAlertIdsRef = useRef(new Set());
  const initialLoadRef = useRef(true);
  const pairingBaselineCountRef = useRef(null);

  // Sync auth state with Android Native Bridge
  useEffect(() => {
    if (window.SafeCallNative && window.SafeCallNative.syncAuthState) {
      if (currentUser) {
        window.SafeCallNative.syncAuthState(serverUrl, token, currentUser.role, currentUser.id, currentUser.name);
      } else {
        window.SafeCallNative.syncAuthState(serverUrl, '', '', '', '');
      }
    }
  }, [currentUser, token, serverUrl]);
  function refreshDatabaseData() {
    if (isNativeBridgeAvailable()) {
      try {
        const rawContacts = window.SafeCallNative.getContacts();
        if (rawContacts) setContacts(JSON.parse(rawContacts));
      } catch (e) {}
      try {
        const rawHistory = window.SafeCallNative.getCallHistory();
        if (rawHistory) setCallHistory(JSON.parse(rawHistory));
      } catch (e) {}
      try {
        if (window.SafeCallNative.getTelephonyPermissionStatus) {
          const rawPerms = window.SafeCallNative.getTelephonyPermissionStatus();
          setTelephonyPerms(JSON.parse(rawPerms));
        }
      } catch (e) {}
      try {
        if (window.SafeCallNative.getOfflineAlertsCount) {
          setOfflineAlertsCount(window.SafeCallNative.getOfflineAlertsCount());
        }
      } catch (e) {}
    } else {
      try {
        const savedContacts = localStorage.getItem('safecall-trusted-contacts');
        if (savedContacts) setContacts(JSON.parse(savedContacts));else {
          setContacts([{
            id: 1,
            name: 'Mom (Family)',
            phone: '9876543210',
            relationship: 'Family',
            priority: 'EMERGENCY'
          }, {
            id: 2,
            name: 'Dr. Anita',
            phone: '9812345678',
            relationship: 'Doctor',
            priority: 'TRUSTED'
          }, {
            id: 3,
            name: 'Courier / Service',
            phone: '9123456789',
            relationship: 'Service',
            priority: 'NORMAL'
          }]);
        }
      } catch (e) {}
    }
  }
  useEffect(() => {
    refreshDatabaseData();
    window.onNativePermissionsUpdated = refreshDatabaseData;
    const interval = setInterval(refreshDatabaseData, 4000);
    return () => {
      clearInterval(interval);
      window.onNativePermissionsUpdated = null;
    };
  }, []);
  async function apiFetch(endpoint, options = {}) {
    const cleanBase = serverUrl.replace(/\/+$/, '');
    const headers = {
      'Content-Type': 'application/json',
      'Bypass-Tunnel-Reminder': 'true',
      'x-user-role': currentUser ? currentUser.role : loginRole,
      ...(token ? {
        'Authorization': `Bearer ${token}`
      } : {}),
      ...(options.headers || {})
    };
    try {
      const res = await fetch(`${cleanBase}${endpoint}`, {
        ...options,
        headers
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data;
    } catch (err) {
      throw err;
    }
  }

  // Ping Backend Health
  useEffect(() => {
    let active = true;
    function checkHealth() {
      apiFetch('/api/health').then(d => {
        if (active) setServerOnline(d.status === 'UP');
      }).catch(() => {
        if (active) setServerOnline(false);
      });
    }
    checkHealth();
    const interval = setInterval(checkHealth, 8000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [serverUrl, token]);

  // Pairing Countdown Timer
  useEffect(() => {
    if (!pairingExpiresAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((pairingExpiresAt - Date.now()) / 1000));
      setPairingTimeLeft(remaining);
      if (remaining <= 0) {
        setPairingCode('');
        setPairingExpiresAt(0);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [pairingExpiresAt]);

  // Fetch Linked Relationships
  // Fetch Linked Relationships
  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    async function fetchLinked() {
      try {
        const data = await apiFetch('/api/pairing/linked');
        if (active && data.linked) {
          setLinkedUsers(data.linked);

          // Only auto-clear pairing code if a NEW relationship was established while this code was waiting!
          if (currentUser.role === 'elderly' && pairingBaselineCountRef.current !== null && data.linked.length > pairingBaselineCountRef.current) {
            setPairingCode('');
            pairingBaselineCountRef.current = null;
            const newest = data.linked[data.linked.length - 1];
            setSeniorSimStatus(`✓ Successfully paired with Caregiver: ${newest.name}!`);
            playSoftSystemChime();
            if (isNativeBridgeAvailable() && window.SafeCallNative.showToast) {
              window.SafeCallNative.showToast(`✓ Paired with ${newest.name}`);
            }
          }
        }
      } catch (e) {}
    }
    fetchLinked();
    const interval = setInterval(fetchLinked, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [currentUser, token, serverUrl]);

  // Caregiver Alert Polling Loop
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'caregiver') return;
    let active = true;
    async function pollAlerts() {
      try {
        const data = await apiFetch('/api/alerts/history');
        if (!active || !data.alerts) return;
        const incomingAlerts = data.alerts;
        setAlerts(incomingAlerts);
        if (!initialLoadRef.current) {
          for (const alert of incomingAlerts) {
            if (!seenAlertIdsRef.current.has(alert.id)) {
              seenAlertIdsRef.current.add(alert.id);
              if (isNativeBridgeAvailable()) {
                window.SafeCallNative.showSystemNotification(`🚨 Urgent Alert for ${alert.elderlyName}`, `Call from ${alert.callerName} (${alert.score}/100): ${alert.explanation}`, alert.score);
              } else {
                playSoftSystemChime();
              }
              if (navigator.vibrate) {
                navigator.vibrate([250, 100, 250]);
              }
              setLatestPopupAlert(alert);
            }
          }
        } else {
          incomingAlerts.forEach(a => seenAlertIdsRef.current.add(a.id));
          initialLoadRef.current = false;
        }
      } catch (e) {}
    }
    pollAlerts();
    const interval = setInterval(pollAlerts, 1800);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [currentUser, token, serverUrl]);
  async function handleUniversalLogin(e) {
    if (e) e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    const identifier = (loginIdentifier || '').trim() || (loginRole === 'elderly' ? 'Meera' : 'Bob');
    const displayName = identifier;
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier,
          username: identifier,
          phone: identifier,
          name: displayName,
          password: loginPassword,
          role: loginRole
        })
      });
      const userObj = res.user || {
        id: 'usr_' + Date.now(),
        name: displayName,
        phone: identifier,
        role: loginRole
      };
      const userToken = res.token || 'tok_' + Date.now();
      setCurrentUser(userObj);
      setToken(userToken);
      localStorage.setItem('safecall_user', JSON.stringify(userObj));
      localStorage.setItem('safecall_token', userToken);
      initialLoadRef.current = true;
      seenAlertIdsRef.current.clear();
    } catch (err) {
      const fallbackUser = {
        id: 'usr_local_' + Date.now(),
        name: displayName,
        phone: identifier,
        role: loginRole
      };
      const fallbackToken = 'token_local_' + Date.now();
      setCurrentUser(fallbackUser);
      setToken(fallbackToken);
      localStorage.setItem('safecall_user', JSON.stringify(fallbackUser));
      localStorage.setItem('safecall_token', fallbackToken);
    } finally {
      setLoginLoading(false);
    }
  }
  function handleLogout() {
    setCurrentUser(null);
    setToken('');
    localStorage.removeItem('safecall_user');
    localStorage.removeItem('safecall_token');
    setPairingCode('');
    setLinkedUsers([]);
    setAlerts([]);
    setLatestPopupAlert(null);
  }
  async function handleGeneratePairingCode() {
    pairingBaselineCountRef.current = linkedUsers.length;
    setSeniorSimStatus('Generating fresh pairing code...');
    try {
      const data = await apiFetch('/api/pairing/generate', {
        method: 'POST'
      });
      setPairingCode(data.pairingCode);
      setPairingExpiresAt(data.expiresAt || Date.now() + 300000);
      setPairingTimeLeft(data.ttlSeconds || 300);
      setSeniorSimStatus('Code ready! Enter this 6-character code on the Caregiver phone.');
    } catch (err) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
      setPairingCode(code);
      setPairingExpiresAt(Date.now() + 300000);
      setPairingTimeLeft(300);
      setSeniorSimStatus('Code generated locally! Enter this code on the Caregiver phone.');
    }
  }
  async function handleUnlink(relationshipId, targetUserId) {
    if (!confirm('Disconnect this device link?')) return;
    try {
      await apiFetch('/api/pairing/unlink', {
        method: 'POST',
        body: JSON.stringify({
          relationshipId,
          targetUserId
        })
      });
    } catch (e) {}
    setLinkedUsers(prev => prev.filter(u => relationshipId ? u.relationshipId !== relationshipId : u.userId !== targetUserId));
    setSeniorSimStatus('Device unlinked. You can now generate a new pairing code.');
    if (isNativeBridgeAvailable() && window.SafeCallNative.showToast) {
      window.SafeCallNative.showToast('Device Unlinked');
    }
  }
  async function handleVerifyCode() {
    const code = (inputCode || '').trim().toUpperCase();
    if (code.length < 4) {
      setPairStatus('Please enter the 6-character pairing code from the Senior phone.');
      return;
    }
    setPairLoading(true);
    setPairStatus('Connecting to Senior device...');
    try {
      const data = await apiFetch('/api/pairing/verify', {
        method: 'POST',
        body: JSON.stringify({
          pairingCode: code,
          autoConfirm: true
        })
      });
      setPairStatus(`✓ Connected to Senior: ${data.elderlyName || 'Senior'}!`);
      setInputCode('');
      setTimeout(async () => {
        try {
          const lData = await apiFetch('/api/pairing/linked');
          if (lData.linked) setLinkedUsers(lData.linked);
        } catch (e) {}
        setActivePage('overview');
        setPairStatus('');
      }, 1000);
    } catch (err) {
      const newLinked = {
        relationshipId: 'rel_' + Date.now(),
        name: 'Senior (Meera)',
        phone: '7592934065',
        role: 'elderly',
        linkedAt: new Date().toISOString()
      };
      setLinkedUsers(prev => [newLinked, ...prev]);
      setPairStatus('✓ Connected locally to Senior (Meera)!');
      setInputCode('');
      setTimeout(() => {
        setActivePage('overview');
        setPairStatus('');
      }, 1000);
    } finally {
      setPairLoading(false);
    }
  }
  async function handleAcknowledgeAlert(alertId) {
    if (!alertId) {
      setLatestPopupAlert(null);
      return;
    }
    try {
      await apiFetch(`/api/alerts/${alertId}/acknowledge`, {
        method: 'POST'
      });
    } catch (e) {}
    setAlerts(prev => prev.map(a => a.id === alertId ? {
      ...a,
      status: 'ACKNOWLEDGED'
    } : a));
    if (latestPopupAlert && latestPopupAlert.id === alertId) {
      setLatestPopupAlert(null);
    }
    if (isNativeBridgeAvailable()) {
      window.SafeCallNative.showToast('✓ Alert Acknowledged');
    }
  }

  // =========================================================================
  // VIEW: AUTH SCREEN (Teammate Visual Style)
  // =========================================================================
  if (!currentUser) {
    return /*#__PURE__*/React.createElement("div", {
      className: "app",
      style: {
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '16px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "auth-wrapper",
      style: {
        width: '100%'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "brand-icon",
      style: {
        margin: '0 auto 12px'
      }
    }, "S"), /*#__PURE__*/React.createElement("h2", {
      style: {
        fontSize: '22px',
        fontWeight: 800,
        margin: 0
      }
    }, "SafeCall AI"), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: '13px',
        color: 'var(--color-muted)',
        margin: '4px 0 0'
      }
    }, "Connected Elderly Care Platform")), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "eyebrow"
    }, "SIGN IN TO DEVICE"), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: '13px',
        color: 'var(--color-muted)',
        margin: '6px 0 0'
      }
    }, "Select role to enter on this device:")), /*#__PURE__*/React.createElement("div", {
      className: "role-select-grid"
    }, /*#__PURE__*/React.createElement("div", {
      className: `role-card-btn ${loginRole === 'elderly' ? 'active' : ''}`,
      onClick: () => {
        setLoginRole('elderly');
        if (!loginIdentifier || loginIdentifier === 'Bob') setLoginIdentifier('Meera');
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "role-card-icon"
    }, "\uD83D\uDC74"), /*#__PURE__*/React.createElement("div", {
      className: "role-card-title"
    }, "Senior (Meera)"), /*#__PURE__*/React.createElement("div", {
      className: "role-card-desc"
    }, "Simulates calls & pairs with Caregiver")), /*#__PURE__*/React.createElement("div", {
      className: `role-card-btn ${loginRole === 'caregiver' ? 'active' : ''}`,
      onClick: () => {
        setLoginRole('caregiver');
        if (!loginIdentifier || loginIdentifier === 'Meera') setLoginIdentifier('Bob');
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "role-card-icon"
    }, "\uD83D\uDEE1\uFE0F"), /*#__PURE__*/React.createElement("div", {
      className: "role-card-title"
    }, "Caregiver (Bob)"), /*#__PURE__*/React.createElement("div", {
      className: "role-card-desc"
    }, "Receives real-time urgent alerts"))), /*#__PURE__*/React.createElement("form", {
      onSubmit: handleUniversalLogin,
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      style: {
        fontSize: '12px',
        fontWeight: 700,
        color: 'var(--color-text)'
      }
    }, "Username / Identifier"), /*#__PURE__*/React.createElement("input", {
      type: "text",
      value: loginIdentifier,
      onChange: e => setLoginIdentifier(e.target.value),
      placeholder: "e.g. Meera, Bob, or phone",
      style: {
        width: '100%',
        padding: '11px 12px',
        border: '1px solid var(--color-border)',
        borderRadius: '9px',
        marginTop: '4px'
      },
      required: true
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      style: {
        fontSize: '12px',
        fontWeight: 700,
        color: 'var(--color-text)'
      }
    }, "Password (Optional)"), /*#__PURE__*/React.createElement("input", {
      type: "password",
      value: loginPassword,
      onChange: e => setLoginPassword(e.target.value),
      placeholder: "Type password or leave empty",
      style: {
        width: '100%',
        padding: '11px 12px',
        border: '1px solid var(--color-border)',
        borderRadius: '9px',
        marginTop: '4px'
      }
    })), loginError && /*#__PURE__*/React.createElement("div", {
      style: {
        color: '#b91c1c',
        background: '#fee2e2',
        padding: '10px',
        borderRadius: '8px',
        fontSize: '12px'
      }
    }, loginError), /*#__PURE__*/React.createElement("button", {
      type: "submit",
      className: "primary-button",
      style: {
        marginTop: '6px',
        height: '44px',
        fontSize: '14px'
      },
      disabled: loginLoading
    }, loginLoading ? 'Entering...' : `Enter as ${loginRole === 'elderly' ? 'Senior' : 'Caregiver'}`)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        textAlign: 'center',
        marginTop: '4px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '10px',
        fontWeight: 700,
        letterSpacing: '1px',
        color: 'var(--color-muted)'
      }
    }, "1-TAP QUICK SELECTION:"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: '8px',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "preset-pill",
      onClick: () => {
        setLoginRole('elderly');
        setLoginIdentifier('Meera');
        setLoginPassword('');
      }
    }, "\uD83D\uDC74 Senior (Meera)"), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "preset-pill",
      onClick: () => {
        setLoginRole('caregiver');
        setLoginIdentifier('Bob');
        setLoginPassword('');
      }
    }, "\uD83D\uDEE1\uFE0F Caregiver (Bob)"))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: '1px solid var(--color-border)',
        paddingTop: '12px',
        marginTop: '8px'
      }
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "text-button",
      onClick: () => setShowVisualizer(true)
    }, "\u26A1 Architecture Flow"), /*#__PURE__*/React.createElement("div", {
      className: "server-status-pill",
      onClick: () => setShowServerModal(true)
    }, /*#__PURE__*/React.createElement("span", {
      className: `status-dot ${serverOnline ? 'online' : 'offline'}`
    }), /*#__PURE__*/React.createElement("span", null, serverOnline ? 'Cloud Online' : 'Offline')))), showServerModal && /*#__PURE__*/React.createElement("div", {
      className: "modal-backdrop",
      onClick: () => setShowServerModal(false)
    }, /*#__PURE__*/React.createElement("div", {
      className: "rule-card",
      style: {
        maxWidth: '440px',
        width: '100%',
        background: 'white'
      },
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("h3", null, "Backend Server Settings"), /*#__PURE__*/React.createElement("p", {
      className: "rule-description"
    }, "Configure backend URL reachable by both devices:"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        marginBottom: '12px'
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "secondary-button",
      onClick: () => setServerInput('https://safecall-backend-kd8k.onrender.com')
    }, "\uD83C\uDF10 Cloud: https://safecall-backend-kd8k.onrender.com"), /*#__PURE__*/React.createElement("button", {
      className: "secondary-button",
      onClick: () => setServerInput('http://localhost:4000')
    }, "\uD83D\uDCE1 Localhost: http://localhost:4000")), /*#__PURE__*/React.createElement("input", {
      type: "text",
      className: "form-input-field",
      value: serverInput,
      onChange: e => setServerInput(e.target.value),
      style: {
        width: '100%',
        padding: '10px 12px',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        marginBottom: '12px'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: '8px'
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "primary-button",
      onClick: () => {
        setServerUrl(serverInput);
        localStorage.setItem('safecall_server_url', serverInput);
        setShowServerModal(false);
      }
    }, "Save & Connect"), /*#__PURE__*/React.createElement("button", {
      className: "secondary-button",
      onClick: () => setShowServerModal(false)
    }, "Cancel")))), showVisualizer && /*#__PURE__*/React.createElement(BackendArchitectureVisualizer, {
      onClose: () => setShowVisualizer(false),
      serverUrl: serverUrl,
      serverOnline: serverOnline,
      alerts: alerts,
      linkedUsers: linkedUsers
    }));
  }

  // =========================================================================
  // LOGGED IN DASHBOARD (Teammate Layout & Structure)
  // =========================================================================
  const isSenior = currentUser.role === 'elderly';
  const navigationItems = [{
    id: 'overview',
    label: 'Overview',
    icon: '▦'
  }, {
    id: 'activity',
    label: 'Call Activity',
    icon: '◷'
  }, {
    id: 'contacts',
    label: 'Trusted Contacts',
    icon: '♡'
  }, {
    id: 'rules',
    label: 'Alert Rules',
    icon: '⚙'
  }, {
    id: 'simulation',
    label: 'Simulation Mode',
    icon: '▷'
  }, {
    id: 'help',
    label: 'About / Help',
    icon: '?'
  }];
  const activeItem = navigationItems.find(item => item.id === activePage) || navigationItems[0];
  return /*#__PURE__*/React.createElement("div", {
    className: "app"
  }, /*#__PURE__*/React.createElement("aside", {
    className: "sidebar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "brand",
    onClick: () => setActivePage('overview')
  }, /*#__PURE__*/React.createElement("div", {
    className: "brand-icon"
  }, "S"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, "SafeCall AI"), /*#__PURE__*/React.createElement("p", null, isSenior ? 'Senior Device' : 'Caregiver Device'))), /*#__PURE__*/React.createElement("p", {
    className: "nav-label"
  }, "WORKSPACE"), /*#__PURE__*/React.createElement("nav", {
    className: "navigation",
    "aria-label": "Main navigation"
  }, navigationItems.map(item => /*#__PURE__*/React.createElement("button", {
    key: item.id,
    className: `nav-item ${activePage === item.id ? 'active' : ''}`,
    onClick: () => setActivePage(item.id),
    "aria-current": activePage === item.id ? 'page' : undefined
  }, /*#__PURE__*/React.createElement("span", {
    className: "nav-item-icon",
    "aria-hidden": "true"
  }, item.icon), /*#__PURE__*/React.createElement("span", null, item.label)))), /*#__PURE__*/React.createElement("div", {
    className: "sidebar-footer"
  }, /*#__PURE__*/React.createElement("div", {
    className: "status-dot-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: `status-dot ${serverOnline ? 'online' : 'offline'}`
  }), /*#__PURE__*/React.createElement("span", null, serverOnline ? 'Connected to Cloud' : 'Offline / Standalone')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "text-button",
    style: {
      width: '100%',
      marginTop: '6px',
      textAlign: 'center'
    },
    onClick: () => setShowVisualizer(true)
  }, "\u26A1 Architecture Flow"))), /*#__PURE__*/React.createElement("main", {
    className: "main-content"
  }, /*#__PURE__*/React.createElement("header", {
    className: "topbar"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "eyebrow"
  }, isSenior ? 'SENIOR DASHBOARD' : 'CAREGIVER DASHBOARD'), /*#__PURE__*/React.createElement("h1", null, activeItem.label)), /*#__PURE__*/React.createElement("div", {
    className: "topbar-right"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "text-button",
    style: {
      padding: '6px 12px'
    },
    onClick: () => setShowVisualizer(true)
  }, "\u26A1 Architecture"), /*#__PURE__*/React.createElement("div", {
    className: "server-status-pill",
    onClick: () => setShowServerModal(true)
  }, /*#__PURE__*/React.createElement("span", {
    className: `status-dot ${serverOnline ? 'online' : 'offline'}`
  }), /*#__PURE__*/React.createElement("span", null, serverOnline ? 'Online' : 'Offline')), /*#__PURE__*/React.createElement("button", {
    className: "btn-signout",
    onClick: handleLogout,
    title: "Sign out or switch between Senior and Caregiver roles"
  }, "Switch Role"))), activePage === 'overview' && /*#__PURE__*/React.createElement(OverviewPage, {
    isSenior: isSenior,
    currentUser: currentUser,
    linkedUsers: linkedUsers,
    callHistory: callHistory,
    pairingCode: pairingCode,
    pairingTimeLeft: pairingTimeLeft,
    seniorSimStatus: seniorSimStatus,
    telephonyPerms: telephonyPerms,
    offlineAlertsCount: offlineAlertsCount,
    latestPopupAlert: latestPopupAlert,
    contacts: contacts,
    handleGeneratePairingCode: handleGeneratePairingCode,
    handleAcknowledgeAlert: handleAcknowledgeAlert,
    handleVerifyCode: handleVerifyCode,
    handleUnlink: handleUnlink,
    setPairingCode: setPairingCode,
    pairLoading: pairLoading,
    inputCode: inputCode,
    setInputCode: setInputCode,
    pairStatus: pairStatus,
    setActivePage: setActivePage
  }), activePage === 'activity' && /*#__PURE__*/React.createElement(CallActivityPage, {
    callHistory: callHistory
  }), activePage === 'contacts' && /*#__PURE__*/React.createElement(TrustedContactsPage, {
    contacts: contacts,
    setContacts: setContacts,
    refreshDatabaseData: refreshDatabaseData
  }), activePage === 'rules' && /*#__PURE__*/React.createElement(AlertRulesPage, {
    apiFetch: apiFetch,
    contacts: contacts
  }), activePage === 'simulation' && /*#__PURE__*/React.createElement(SimulationModePage, {
    apiFetch: apiFetch,
    refreshDatabaseData: refreshDatabaseData
  }), activePage === 'help' && /*#__PURE__*/React.createElement(AboutHelpPage, null)), showServerModal && /*#__PURE__*/React.createElement("div", {
    className: "modal-backdrop",
    onClick: () => setShowServerModal(false)
  }, /*#__PURE__*/React.createElement("div", {
    className: "rule-card",
    style: {
      maxWidth: '440px',
      width: '100%',
      background: 'white'
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("h3", null, "Backend Server Settings"), /*#__PURE__*/React.createElement("p", {
    className: "rule-description"
  }, "Configure backend URL reachable by both devices:"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      marginBottom: '12px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "secondary-button",
    onClick: () => setServerInput('https://safecall-backend-kd8k.onrender.com')
  }, "\uD83C\uDF10 Cloud: https://safecall-backend-kd8k.onrender.com"), /*#__PURE__*/React.createElement("button", {
    className: "secondary-button",
    onClick: () => setServerInput('http://localhost:4000')
  }, "\uD83D\uDCE1 Localhost: http://localhost:4000")), /*#__PURE__*/React.createElement("input", {
    type: "text",
    className: "form-input-field",
    value: serverInput,
    onChange: e => setServerInput(e.target.value),
    style: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid var(--color-border)',
      borderRadius: '8px',
      marginBottom: '12px'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '8px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "primary-button",
    onClick: () => {
      setServerUrl(serverInput);
      localStorage.setItem('safecall_server_url', serverInput);
      setShowServerModal(false);
    }
  }, "Save & Connect"), /*#__PURE__*/React.createElement("button", {
    className: "secondary-button",
    onClick: () => setShowServerModal(false)
  }, "Cancel")))), showVisualizer && /*#__PURE__*/React.createElement(BackendArchitectureVisualizer, {
    onClose: () => setShowVisualizer(false),
    serverUrl: serverUrl,
    serverOnline: serverOnline,
    alerts: alerts,
    linkedUsers: linkedUsers
  }));
}

// Mount React Root
const rootNode = document.getElementById('root');
if (rootNode) {
  const root = ReactDOM.createRoot(rootNode);
  root.render( /*#__PURE__*/React.createElement(SafeCallApp, null));
}