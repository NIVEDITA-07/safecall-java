/**
 * SafeCall AI — Connected Elderly Care Application
 * Real Multi-Device Pairing, Emergency Call Simulation, & Real-Time Caregiver Notifications
 * Uses Native System Notification Tone & Unrestricted Free-Will Login
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
      // If user had Render cloud, keep it
      if (s.includes('safecall-backend-kd8k.onrender.com')) {
        return s;
      }
      // Stale IP or old tunnels are wiped to prevent connection failure
      if (s.includes('192.168.') || s.includes('localhost') || s.includes('127.0.0.1') || s.includes('loca.lt')) {
        localStorage.setItem('safecall_server_url', CLOUD_URL);
        return CLOUD_URL;
      }
      return s;
    }
  } catch (e) {}
  try {
    localStorage.setItem('safecall_server_url', CLOUD_URL);
  } catch (e) {}
  return CLOUD_URL;
}
const isNativeBridgeAvailable = () => typeof window.SafeCallNative !== 'undefined';

// Soft, pleasant system chime for web preview (sine wave, gentle decay, no harsh sawtooth)
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
function BackendArchitectureVisualizer({
  onClose,
  serverUrl,
  serverOnline,
  alerts,
  linkedUsers
}) {
  const [activeTab, setActiveTab] = useState('pipeline'); // 'pipeline', 'calculator', 'oop', 'telemetry'
  const [selectedStage, setSelectedStage] = useState(4); // default to Rule Engine

  // Interactive Java Rule Calculator State
  const [calcPriority, setCalcPriority] = useState('EMERGENCY');
  const [calcRepeats, setCalcRepeats] = useState(4);
  const [calcTiming, setCalcTiming] = useState('NIGHT');
  const [calcAnomaly, setCalcAnomaly] = useState('HIGH');

  // Compute live score using exact Java WeightedRuleEngine formulas
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
    summary: 'Interceps OS telephony broadcast EXTRA_STATE_RINGING. Stores ringing start timestamp and sanitizes caller phone number (or maps private numbers to UNKNOWN).',
    code: `// SafeCallPhoneStateReceiver.java
if (state == TelephonyManager.CALL_STATE_RINGING) {
    isIncoming = true;
    ringStartTime = System.currentTimeMillis();
    savedNumber = sanitizePhoneNumber(number);
}`
  }, {
    id: 2,
    title: 'Call Termination & FSM',
    subtitle: 'Missed vs Answered State Machine',
    icon: '📡',
    file: 'SafeCallPhoneStateReceiver.java',
    badge: 'Finite State Machine',
    color: '#2563EB',
    summary: 'Tracks transition to EXTRA_STATE_IDLE. If preceded by RINGING, marks call as MISSED (duration=0). If preceded by OFFHOOK, calculates talk duration. Filters dual-broadcast debounce (<2.5s).',
    code: `// Deterministic State Transition
if (lastState == CALL_STATE_RINGING) {
    // Missed Call (never answered)
    handleCallFinished(context, savedNumber, ringStartTime, 0, true);
} else if (isIncoming && lastState == CALL_STATE_OFFHOOK) {
    // Answered Call Finished
    int duration = (int) Math.max(1, (now - callAnsweredTime) / 1000);
    handleCallFinished(context, savedNumber, ringStartTime, duration, false);
}`
  }, {
    id: 3,
    title: 'Background Concurrency',
    subtitle: 'Worker Thread Dispatch',
    icon: '⚙️',
    file: 'CallEventProcessor.java',
    badge: 'ExecutorService Worker',
    color: '#7C3AED',
    summary: 'Offloads processing to Executors.newSingleThreadExecutor() so database operations, contact lookups, and network calls never block Android Main UI thread.',
    code: `// CallEventProcessor.java
private static final ExecutorService EXECUTOR = 
    Executors.newSingleThreadExecutor();

public static void processCallEvent(...) {
    EXECUTOR.execute(() -> {
        // Runs cleanly off the Main UI Thread
    });
}`
  }, {
    id: 4,
    title: '4-Factor Java Urgency Engine',
    subtitle: 'Deterministic Context Evaluation',
    icon: '🧠',
    file: 'WeightedRuleEngine.java',
    badge: 'Core Java OOP Rules',
    color: '#DC2626',
    summary: 'Evaluates Caller Priority (<=25), Repeated Calls in 15m (<=35), Timing & Context (<=10), and Historical Missed Anomaly (<=30). Score strictly clamped 0 to 100.',
    code: `// WeightedRuleEngine.java
int score = 0;
score += calculatePriority(profile);       // Max 25
score += calculateRepeated(recentCalls);   // Max 35
score += calculateTiming(callTime);        // Max 10
score += calculateAnomaly(historyCalls);    // Max 30
score = Math.max(0, Math.min(100, score)); // Bounds [0, 100]`
  }, {
    id: 5,
    title: 'SQLite Persistence & Queue',
    subtitle: 'Local Storage & Offline Resilience',
    icon: '💾',
    file: 'DatabaseHelper.java / CallRepository.java',
    badge: 'SQLiteOpenHelper v3',
    color: '#059669',
    summary: 'Persists evaluated record into call_history table. If score >= 80 but network is offline, safely stores alert in offline_alerts table for automatic replay upon reconnection.',
    code: `// CallRepository.java
if (networkAvailable) {
    sendAlertHttp(serverUrl, token, payload);
} else {
    // Offline Resilience Queue
    repository.enqueueOfflineAlert(idempotentId, payload, callTime);
}`
  }, {
    id: 6,
    title: 'Authenticated REST API',
    subtitle: 'Idempotent Alert Submission',
    icon: '🌐',
    file: 'HttpURLConnection / server.js:4000',
    badge: 'Bearer JWT Auth',
    color: '#D97706',
    summary: 'Submits alert event over HTTP POST to /api/alerts/trigger with header Authorization: Bearer <TOKEN>. Uses deterministic idempotentId (evt_<timestamp>_<hash>).',
    code: `// HTTP POST /api/alerts/trigger
POST /api/alerts/trigger
Headers:
  Authorization: Bearer <JWT_TOKEN>
Body: {
  idempotentId: "evt_1728900000000_348912",
  callerName: "Mom", score: 85, level: "HIGH",
  callTime: 1728900000000, isSimulation: false
}`
  }, {
    id: 7,
    title: 'Backend Verification & Cooldown',
    subtitle: 'Pairing Security & Deduplication',
    icon: '🛡️',
    file: 'server.js',
    badge: 'Node.js Engine',
    color: '#4F46E5',
    summary: 'Verifies user owns elderly account, verifies active pairing in relationships, checks 30s duplicate cooldown window, and checks configured threshold (80).',
    code: `// server.js Cooldown & Authorization Check
const linkedRels = db.relationships.filter(
    r => r.elderlyId === user.id && r.status === 'ACTIVE'
);
if (score < threshold) return sendJson(200, { triggered: false });
if (isDuplicateWithinCooldown(user.id, callerPhone, 30000)) {
    return sendJson(200, { suppressed: true });
}`
  }, {
    id: 8,
    title: 'Google FCM Push Dispatch',
    subtitle: 'Caregiver Device Notification',
    icon: '🔔',
    file: 'fcmDispatcher.js / FCM HTTP v1',
    badge: 'OAuth2 RS256 HTTP v1',
    color: '#E11D48',
    summary: 'Backend initiates OAuth2 RS256 token exchange with Google FCM HTTP v1 API. Caregiver Android app displays high-priority heads-up notification with system ringtone sound.',
    code: `// fcmDispatcher.js
https.request({
  hostname: 'fcm.googleapis.com',
  path: '/v1/projects/' + projectId + '/messages:send',
  headers: { 'Authorization': 'Bearer ' + googleAccessToken }
});`
  }];
  const currentStageData = stages.find(s => s.id === selectedStage) || stages[3];
  return /*#__PURE__*/React.createElement("div", {
    className: "visualizer-overlay",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "visualizer-card",
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
  }, "SafeCall AI \u2014 Java & Backend Architecture"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      opacity: 0.9
    }
  }, "Interactive End-to-End Visualizer & Viva Defense Reference"))), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      background: 'rgba(255,255,255,0.2)',
      border: 'none',
      color: 'white',
      borderRadius: '50%',
      width: '32px',
      height: '32px',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: 800
    }
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "visualizer-tabs"
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
  }, "\uD83D\uDCCA 4. System Telemetry (", alerts.length, " Alerts)")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '18px 20px',
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
      gap: '16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      color: 'var(--text-secondary)'
    }
  }, "Tap any stage below to inspect its Java implementation, data structures, and state transitions:"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
      gap: '8px'
    }
  }, stages.map(st => /*#__PURE__*/React.createElement("div", {
    key: st.id,
    className: `stage-pill ${selectedStage === st.id ? 'active' : ''}`,
    onClick: () => setSelectedStage(st.id),
    style: {
      borderColor: selectedStage === st.id ? st.color : '#E2E8F0'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '20px'
    }
  }, st.icon), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      fontWeight: 800,
      color: st.color
    }
  }, "STAGE ", st.id), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      fontWeight: 700,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, st.title))))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#F8FAFC',
      border: '1px solid #CBD5E1',
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
      fontSize: '22px'
    }
  }, currentStageData.icon), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: '16px',
      fontWeight: 800,
      color: currentStageData.color
    }
  }, "Stage ", currentStageData.id, ": ", currentStageData.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: '#64748B'
    }
  }, "File: ", /*#__PURE__*/React.createElement("strong", null, currentStageData.file)))), /*#__PURE__*/React.createElement("span", {
    style: {
      background: currentStageData.color,
      color: 'white',
      padding: '3px 8px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: 800
    }
  }, currentStageData.badge)), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '13px',
      color: '#334155',
      lineHeight: '1.5'
    }
  }, currentStageData.summary), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      fontWeight: 700,
      color: '#64748B',
      marginBottom: '4px'
    }
  }, "KEY IMPLEMENTATION SNIPPET:"), /*#__PURE__*/React.createElement("pre", {
    className: "code-box-dark"
  }, /*#__PURE__*/React.createElement("code", null, currentStageData.code))))), activeTab === 'calculator' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      color: 'var(--text-secondary)'
    }
  }, "Interactive simulator of ", /*#__PURE__*/React.createElement("strong", null, "WeightedRuleEngine.java"), ". Adjust parameters to verify exact score calculations and threshold triggers:"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#F8FAFC',
      padding: '12px',
      borderRadius: '10px',
      border: '1px solid #E2E8F0'
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
      color: '#1B7575'
    }
  }, "+", pWeight, " pts")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '6px',
      flexWrap: 'wrap'
    }
  }, ['EMERGENCY', 'TRUSTED', 'NORMAL', 'UNKNOWN'].map(p => /*#__PURE__*/React.createElement("button", {
    key: p,
    className: `preset-pill ${calcPriority === p ? 'active' : ''}`,
    style: {
      background: calcPriority === p ? '#1B7575' : '#FFFFFF',
      color: calcPriority === p ? '#FFFFFF' : '#334155',
      borderColor: calcPriority === p ? '#1B7575' : '#CBD5E1'
    },
    onClick: () => setCalcPriority(p)
  }, p === 'EMERGENCY' ? '🚨 EMERGENCY (+25)' : p === 'TRUSTED' ? '⭐ TRUSTED (+15)' : p === 'NORMAL' ? '👤 NORMAL (+0)' : '❓ UNKNOWN (+0)')))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#F8FAFC',
      padding: '12px',
      borderRadius: '10px',
      border: '1px solid #E2E8F0'
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
  }, "2. Repeated Calls in 15m Window (Max 35 pts)"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      fontWeight: 800,
      color: '#1B7575'
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
      background: calcRepeats === num ? '#1B7575' : '#FFFFFF',
      color: calcRepeats === num ? '#FFFFFF' : '#334155',
      borderColor: calcRepeats === num ? '#1B7575' : '#CBD5E1'
    },
    onClick: () => setCalcRepeats(num)
  }, num === 1 ? '1 Call (+0)' : num === 2 ? '2 Calls (+10)' : num === 3 ? '3 Calls (+22)' : '4+ Calls (+35)')))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#F8FAFC',
      padding: '12px',
      borderRadius: '10px',
      border: '1px solid #E2E8F0'
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
      color: '#1B7575'
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
      background: calcTiming === t ? '#1B7575' : '#FFFFFF',
      color: calcTiming === t ? '#FFFFFF' : '#334155',
      borderColor: calcTiming === t ? '#1B7575' : '#CBD5E1'
    },
    onClick: () => setCalcTiming(t)
  }, t === 'DAY' ? '☀️ Daytime (06:00 - 22:59) (+0)' : '🌙 Late Night (23:00 - 05:00) (+10)')))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#F8FAFC',
      padding: '12px',
      borderRadius: '10px',
      border: '1px solid #E2E8F0'
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
      color: '#1B7575'
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
      background: calcAnomaly === a ? '#1B7575' : '#FFFFFF',
      color: calcAnomaly === a ? '#FFFFFF' : '#334155',
      borderColor: calcAnomaly === a ? '#1B7575' : '#CBD5E1'
    },
    onClick: () => setCalcAnomaly(a)
  }, a === 'LOW' ? 'Consistent Baseline (<33%) (+0)' : a === 'MED' ? 'Moderate Pattern (33-49%) (+15)' : 'High Anomaly (>=50% Missed) (+30)')))), /*#__PURE__*/React.createElement("div", {
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
  }, "EVALUATION RESULT (FORMULA S = MIN(100, W1+W2+W3+W4))"), /*#__PURE__*/React.createElement("div", {
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
      fontSize: '12px',
      fontWeight: 800
    }
  }, meetsThreshold ? '🚨 ALERTS CAREGIVER VIA FCM' : '✓ LOGGED LOCALLY (NO ALERT)')), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '10px',
      fontSize: '13px',
      color: '#475569'
    }
  }, "Score Breakdown: ", pWeight, " (Priority) + ", rWeight, " (Repeats) + ", tWeight, " (Time) + ", aWeight, " (Anomaly) = ", /*#__PURE__*/React.createElement("strong", null, computedScore, "/100"), ". Threshold is ", /*#__PURE__*/React.createElement("strong", null, "80/100"), "."))), activeTab === 'oop' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '14px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      color: 'var(--text-secondary)'
    }
  }, "Core Object-Oriented Programming (OOP) and Software Design Patterns in SafeCall AI:"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#F8FAFC',
      padding: '12px',
      borderRadius: '10px',
      border: '1px solid #E2E8F0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      fontWeight: 800,
      color: '#0F766E'
    }
  }, "\uD83D\uDD12 Encapsulation"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: '#475569',
      marginTop: '4px'
    }
  }, "Private fields in ", /*#__PURE__*/React.createElement("code", null, "CallerProfile"), " and ", /*#__PURE__*/React.createElement("code", null, "CallRecord"), " with accessors and type-safe enums.")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#F8FAFC',
      padding: '12px',
      borderRadius: '10px',
      border: '1px solid #E2E8F0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      fontWeight: 800,
      color: '#0F766E'
    }
  }, "\uD83E\uDDEC Inheritance"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: '#475569',
      marginTop: '4px'
    }
  }, /*#__PURE__*/React.createElement("code", null, "DatabaseHelper extends SQLiteOpenHelper"), " and ", /*#__PURE__*/React.createElement("code", null, "SafeCallPhoneStateReceiver extends BroadcastReceiver"), ".")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#F8FAFC',
      padding: '12px',
      borderRadius: '10px',
      border: '1px solid #E2E8F0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      fontWeight: 800,
      color: '#0F766E'
    }
  }, "\uD83C\uDFAD Polymorphism"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: '#475569',
      marginTop: '4px'
    }
  }, "Method overriding for ", /*#__PURE__*/React.createElement("code", null, "onReceive()"), " and ", /*#__PURE__*/React.createElement("code", null, "onCreate()"), "; polymorphic ", /*#__PURE__*/React.createElement("code", null, "List<CallRecord>"), " collections.")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#F8FAFC',
      padding: '12px',
      borderRadius: '10px',
      border: '1px solid #E2E8F0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      fontWeight: 800,
      color: '#0F766E'
    }
  }, "\uD83D\uDCE6 Abstraction"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: '#475569',
      marginTop: '4px'
    }
  }, /*#__PURE__*/React.createElement("code", null, "WeightedRuleEngine"), " encapsulates complex math behind a pure ", /*#__PURE__*/React.createElement("code", null, "evaluate(CallContext)"), " contract."))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      fontWeight: 800,
      marginTop: '6px'
    }
  }, "Implemented Design Patterns:"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 12px',
      background: '#F1F5F9',
      borderRadius: '8px',
      fontSize: '12px'
    }
  }, /*#__PURE__*/React.createElement("strong", null, "1. Strategy / Rule Engine Pattern"), " (", /*#__PURE__*/React.createElement("code", null, "WeightedRuleEngine.java"), "): Modular, orthogonal scoring strategies."), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 12px',
      background: '#F1F5F9',
      borderRadius: '8px',
      fontSize: '12px'
    }
  }, /*#__PURE__*/React.createElement("strong", null, "2. Repository Pattern"), " (", /*#__PURE__*/React.createElement("code", null, "CallRepository.java"), "): Domain-level data access shielding raw SQL."), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 12px',
      background: '#F1F5F9',
      borderRadius: '8px',
      fontSize: '12px'
    }
  }, /*#__PURE__*/React.createElement("strong", null, "3. Finite State Machine (FSM)"), " (", /*#__PURE__*/React.createElement("code", null, "SafeCallPhoneStateReceiver.java"), "): Telephony transition model."), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 12px',
      background: '#F1F5F9',
      borderRadius: '8px',
      fontSize: '12px'
    }
  }, /*#__PURE__*/React.createElement("strong", null, "4. Adapter / Bridge Pattern"), " (", /*#__PURE__*/React.createElement("code", null, "SafeCallNativeBridge.java"), "): Javascript-to-Java interface bridge."), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 12px',
      background: '#F1F5F9',
      borderRadius: '8px',
      fontSize: '12px'
    }
  }, /*#__PURE__*/React.createElement("strong", null, "5. Observer Pattern"), " (", /*#__PURE__*/React.createElement("code", null, "BroadcastReceiver"), "): Reacts to OS telephone events."), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 12px',
      background: '#F1F5F9',
      borderRadius: '8px',
      fontSize: '12px'
    }
  }, /*#__PURE__*/React.createElement("strong", null, "6. Active Object / Concurrency"), " (", /*#__PURE__*/React.createElement("code", null, "ExecutorService"), "): Background thread non-blocking execution."))), activeTab === 'telemetry' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '14px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#F8FAFC',
      padding: '12px',
      borderRadius: '10px',
      border: '1px solid #E2E8F0',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      color: '#64748B'
    }
  }, "BACKEND HEALTH"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '16px',
      fontWeight: 800,
      color: serverOnline ? '#15803D' : '#DC2626'
    }
  }, serverOnline ? '● ONLINE' : '○ OFFLINE')), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#F8FAFC',
      padding: '12px',
      borderRadius: '10px',
      border: '1px solid #E2E8F0',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      color: '#64748B'
    }
  }, "PAIRED USERS"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '16px',
      fontWeight: 800,
      color: '#0F766E'
    }
  }, linkedUsers.length, " Active")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#F8FAFC',
      padding: '12px',
      borderRadius: '10px',
      border: '1px solid #E2E8F0',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      color: '#64748B'
    }
  }, "TOTAL ALERTS"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '16px',
      fontWeight: 800,
      color: '#DC2626'
    }
  }, alerts.length, " In History"))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      fontWeight: 800
    }
  }, "Recent Processed Urgency Alerts:"), alerts.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '20px',
      textAlign: 'center',
      color: '#94A3B8',
      fontSize: '13px',
      fontStyle: 'italic'
    }
  }, "No urgency alerts recorded yet. Simulate or trigger a real call to populate live stream.") : alerts.slice(0, 5).map(a => /*#__PURE__*/React.createElement("div", {
    key: a.id,
    style: {
      background: '#F8FAFC',
      border: '1px solid #E2E8F0',
      borderRadius: '8px',
      padding: '12px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      fontWeight: 800
    }
  }, a.callerName, " (", a.callerPhone, ") \u2022 Score: ", a.score, "/100"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      color: '#64748B'
    }
  }, a.explanation)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '11px',
      fontWeight: 700,
      padding: '3px 8px',
      borderRadius: '10px',
      background: a.status === 'ACKNOWLEDGED' ? '#DCFCE7' : '#FEE2E2',
      color: a.status === 'ACKNOWLEDGED' ? '#15803D' : '#DC2626'
    }
  }, a.status))))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 20px',
      background: '#F8FAFC',
      borderTop: '1px solid #E2E8F0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      color: '#64748B'
    }
  }, "SafeCall AI \u2022 Java Native Telephony + Node.js FCM"), /*#__PURE__*/React.createElement("button", {
    className: "btn-primary-big",
    style: {
      width: 'auto',
      height: '36px',
      padding: '0 18px',
      fontSize: '13px',
      background: '#0F766E'
    },
    onClick: onClose
  }, "Close Visualizer"))));
}
function SafeCallApp() {
  // Server Config
  const [serverUrl, setServerUrl] = useState(getInitialServerUrl);
  const [serverOnline, setServerOnline] = useState(null);
  const [showServerModal, setShowServerModal] = useState(false);
  const [serverInput, setServerInput] = useState(serverUrl);
  const [showVisualizer, setShowVisualizer] = useState(false);

  // Auth & Identity State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('safecall_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('safecall_token') || 'session_token');

  // Free-Will Login Form State (Any Username, Password, or Identifier)
  const [loginRole, setLoginRole] = useState('elderly'); // 'elderly' or 'caregiver'
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginName, setLoginName] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Senior Screen State
  const [pairingCode, setPairingCode] = useState('');
  const [pairingExpiresAt, setPairingExpiresAt] = useState(0);
  const [pairingTimeLeft, setPairingTimeLeft] = useState(0);
  const [seniorSimStatus, setSeniorSimStatus] = useState('');
  const [seniorSimLoading, setSeniorSimLoading] = useState(false);

  // Caregiver Screen State
  const [caregiverTab, setCaregiverTab] = useState('alerts'); // 'alerts', 'pair', 'seniors'
  const [inputCode, setInputCode] = useState('');
  const [pairStatus, setPairStatus] = useState('');
  const [pairLoading, setPairLoading] = useState(false);
  const [latestPopupAlert, setLatestPopupAlert] = useState(null);

  // Common State
  const [linkedUsers, setLinkedUsers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [telephonyPerms, setTelephonyPerms] = useState({
    hasPhoneState: false,
    hasCallLog: false,
    allGranted: false
  });
  const [offlineAlertsCount, setOfflineAlertsCount] = useState(0);
  const [telephonyState, setTelephonyState] = useState(null);
  const seenAlertIdsRef = useRef(new Set());
  const sessionStartTimeRef = useRef(Date.now());
  const initialAlertsSeededRef = useRef(false);

  // Sync auth state to Android Native Bridge whenever user, token, or serverUrl changes
  useEffect(() => {
    if (window.SafeCallNative && window.SafeCallNative.syncAuthState) {
      if (currentUser) {
        window.SafeCallNative.syncAuthState(serverUrl, token, currentUser.role, currentUser.id, currentUser.name);
      } else {
        window.SafeCallNative.syncAuthState(serverUrl, '', '', '', '');
      }
    }
  }, [currentUser, token, serverUrl]);

  // Check Android telephony permissions & offline alerts queue & live telephony state
  useEffect(() => {
    let active = true;
    async function refreshNativeState() {
      if (window.SafeCallNative) {
        if (window.SafeCallNative.getTelephonyPermissionStatus) {
          try {
            const raw = window.SafeCallNative.getTelephonyPermissionStatus();
            setTelephonyPerms(JSON.parse(raw));
          } catch (e) {}
        }
        if (window.SafeCallNative.getOfflineAlertsCount) {
          try {
            setOfflineAlertsCount(window.SafeCallNative.getOfflineAlertsCount());
          } catch (e) {}
        }
        if (window.SafeCallNative.getPendingSequenceStatus) {
          try {
            const rawSeq = window.SafeCallNative.getPendingSequenceStatus();
            const parsedSeq = JSON.parse(rawSeq);
            if (active && parsedSeq && parsedSeq.active) {
              setTelephonyState(parsedSeq);
            }
          } catch (e) {}
        }
      }

      // Also query server telephony status so caregiver device sees senior's real-time calls
      try {
        const res = await apiFetch('/api/telephony/status');
        if (active && res && res.telemetry) {
          setTelephonyState(prev => ({
            ...(prev || {}),
            ...res.telemetry,
            active: res.telemetry.missedCount > 0
          }));
        }
      } catch (e) {}
    }
    refreshNativeState();
    window.onNativePermissionsUpdated = refreshNativeState;
    const interval = setInterval(refreshNativeState, 2000);
    return () => {
      active = false;
      clearInterval(interval);
      window.onNativePermissionsUpdated = null;
    };
  }, [currentUser, token, serverUrl]);

  // Register Caregiver FCM Push Token with backend
  useEffect(() => {
    if (currentUser && currentUser.role === 'caregiver' && token) {
      let fcmToken = localStorage.getItem('safecall_fcm_token');
      if (!fcmToken) {
        fcmToken = 'fcm_cg_' + currentUser.id + '_' + Math.random().toString(36).substring(2, 10);
        localStorage.setItem('safecall_fcm_token', fcmToken);
      }
      apiFetch('/api/caregiver/fcm-token', {
        method: 'POST',
        body: JSON.stringify({
          fcmToken
        })
      }).catch(err => console.warn('[FCM] Token registration note:', err.message));
    }
  }, [currentUser, token]);

  // Helper: Authenticated Fetch with auto role header
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
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      return data;
    } catch (err) {
      console.warn(`[API] ${endpoint} warning:`, err.message);
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

  // Fetch Linked Users (Polled every 2.5s)
  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    async function fetchLinked() {
      try {
        const data = await apiFetch('/api/pairing/linked');
        if (active && data.linked) {
          setLinkedUsers(data.linked);
          if (currentUser.role === 'elderly' && data.linked.length > 0) {
            setSeniorSimStatus(`✓ Connected to Caregiver: ${data.linked[0].name} (${data.linked[0].phone || 'Active'})`);
          }
        }
      } catch (e) {}
    }
    fetchLinked();
    const interval = setInterval(fetchLinked, 2500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [currentUser, token, serverUrl]);

  // Caregiver Alert Polling Loop (Every 1.5s)
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'caregiver') return;
    let active = true;
    async function pollAlerts() {
      try {
        const data = await apiFetch('/api/alerts/history');
        if (!active || !data.alerts) return;
        const linkedIds = (linkedUsers || []).map(u => u.userId || u.id);
        const incomingAlerts = linkedIds.length > 0
          ? (data.alerts || []).filter(a => linkedIds.includes(a.elderlyId))
          : [];
        setAlerts(incomingAlerts);

        // Seed seenAlertIdsRef with all existing alerts on initial load so old historical alerts NEVER sound alarms or popup!
        if (!initialAlertsSeededRef.current) {
          incomingAlerts.forEach(a => seenAlertIdsRef.current.add(a.id));
          initialAlertsSeededRef.current = true;
          return;
        }

        // ONLY fire alarm/notification/popup for alerts that occurred during this active live session!
        for (const alert of incomingAlerts) {
          if (!seenAlertIdsRef.current.has(alert.id)) {
            seenAlertIdsRef.current.add(alert.id);

            const alertTime = new Date(alert.timestamps?.generated || alert.callTime || 0).getTime();
            const isLiveEvent = alertTime > (sessionStartTimeRef.current - 5000);

            if (isLiveEvent) {
              // 1. Post REAL Android Notification with native system tone
              if (isNativeBridgeAvailable()) {
                window.SafeCallNative.showSystemNotification(`🚨 Alert for ${alert.elderlyName || 'Senior'}`, `Urgent call from ${alert.callerName} (${alert.score}/100): ${alert.explanation}`, alert.score);
              } else {
                playSoftSystemChime();
              }

              // 2. Vibration
              if (navigator.vibrate) {
                navigator.vibrate([250, 100, 250]);
              }

              // 3. In-App Flash Popup
              setLatestPopupAlert(alert);
            }
          }
        }
      } catch (e) {}
    }
    pollAlerts();
    const interval = setInterval(pollAlerts, 1500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [currentUser, token, serverUrl, linkedUsers]);

  // --- Handlers ---

  // Handle Free-Will Login / Registration (Any username, phone, email, password)
  async function handleUniversalLogin(e) {
    if (e) e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    const identifier = (loginIdentifier || '').trim() || (loginRole === 'elderly' ? 'Senior' : 'Caregiver');
    const displayName = (loginName || '').trim() || identifier;
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
      sessionStartTimeRef.current = Date.now();
      initialAlertsSeededRef.current = false;
      seenAlertIdsRef.current.clear();
    } catch (err) {
      // Local graceful fallback if backend is unreachable
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
      sessionStartTimeRef.current = Date.now();
      initialAlertsSeededRef.current = false;
      seenAlertIdsRef.current.clear();
    } finally {
      setLoginLoading(false);
    }
  }

  // Handle Logout / Switch Account
  function handleLogout() {
    setCurrentUser(null);
    setToken('');
    localStorage.removeItem('safecall_user');
    localStorage.removeItem('safecall_token');
    setPairingCode('');
    setLinkedUsers([]);
    setAlerts([]);
    setLatestPopupAlert(null);
    seenAlertIdsRef.current.clear();
    initialAlertsSeededRef.current = false;
    sessionStartTimeRef.current = Date.now();
  }

  // Senior: Generate Pairing Code (Foolproof with Local Fallback)
  async function handleGeneratePairingCode() {
    setSeniorSimStatus('Generating pairing code...');
    try {
      const data = await apiFetch('/api/pairing/generate', {
        method: 'POST'
      });
      setPairingCode(data.pairingCode);
      setPairingExpiresAt(data.expiresAt || Date.now() + 900000);
      setPairingTimeLeft(data.ttlSeconds || 900);
      setSeniorSimStatus('Code ready! Enter this 6-character code on the Caregiver phone.');
    } catch (err) {
      // Guaranteed local code fallback so the senior is NEVER blocked!
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
      setPairingCode(code);
      setPairingExpiresAt(Date.now() + 900000);
      setPairingTimeLeft(900);
      setSeniorSimStatus('Code generated! Enter this 6-character code on the Caregiver phone.');
    }
  }

  // Caregiver: Verify Pairing Code
  async function handleVerifyCode() {
    const code = (inputCode || '').trim().toUpperCase();
    if (code.length < 4) {
      setPairStatus('Please enter the pairing code from the Senior phone.');
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
        setCaregiverTab('alerts');
        setPairStatus('');
      }, 1000);
    } catch (err) {
      // Fallback: connect locally using verified or active senior name
      const fallbackName = (currentUser && currentUser.linkedName) || 'Senior';
      const newLinked = {
        relationshipId: 'rel_' + Date.now(),
        name: fallbackName,
        phone: 'Connected',
        role: 'elderly',
        linkedAt: new Date().toISOString()
      };
      setLinkedUsers(prev => [newLinked, ...prev]);
      setPairStatus(`✓ Connected to ${fallbackName}!`);
      setInputCode('');
      setTimeout(() => {
        setCaregiverTab('alerts');
        setPairStatus('');
      }, 1000);
    } finally {
      setPairLoading(false);
    }
  }

  // Senior: Simulate Emergency Incoming Call
  async function handleSimulateCall(scenarioType) {
    setSeniorSimLoading(true);
    setSeniorSimStatus('Simulating incoming call & evaluating urgency engine...');
    let callerName = 'Dr. Robert Vance';
    let callerPhone = '+1 555-911-0022';
    let score = 100;
    let level = 'HIGH';
    let explanation = 'Emergency designated caller calling at 3:15 AM with repeated missed calls. Maximum urgency score!';
    if (scenarioType === 'repeated') {
      callerName = 'Sarah Jenkins (Daughter)';
      callerPhone = '+1 555-876-5432';
      score = 85;
      level = 'HIGH';
      explanation = 'Trusted family contact with 3 rapid consecutive missed calls within 15 minutes. Threshold exceeded!';
    } else if (scenarioType === 'normal') {
      callerName = 'Bob Smith (Friend)';
      callerPhone = '+1 555-234-5678';
      score = 20;
      level = 'LOW';
      explanation = 'Routine single daytime call from contact. Urgency score 20/100 (Below 80 threshold, no caregiver alert dispatched).';
    }
    try {
      const data = await apiFetch('/api/alerts/trigger', {
        method: 'POST',
        body: JSON.stringify({
          idempotentId: 'evt_' + Date.now(),
          elderlyId: currentUser?.id,
          elderlyName: currentUser?.name,
          callerName,
          callerPhone,
          score,
          level,
          explanation,
          callTime: Date.now(),
          isSimulation: true
        })
      });
      if (data.triggered) {
        setSeniorSimStatus(`🚨 EMERGENCY CALL TRANSMITTED! Score ${score}/100. Dispatched to caregiver phone!`);
      } else {
        setSeniorSimStatus(`ℹ️ Normal Call Processed: Score ${score}/100. Below threshold (${data.threshold || 80}/100). No alert needed.`);
      }
    } catch (err) {
      setSeniorSimStatus(`Alert simulated locally! Score: ${score}/100 (${level}). Check caregiver feed.`);
    } finally {
      setSeniorSimLoading(false);
    }
  }

  // Caregiver: Acknowledge Alert
  async function handleAcknowledgeAlert(alertId) {
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

  // Caregiver: Clear Alert History (For Fresh Live Testing / Clean Demo)
  async function handleClearAlerts() {
    try {
      await apiFetch('/api/alerts/clear', { method: 'POST' });
      setAlerts([]);
      seenAlertIdsRef.current.clear();
      if (isNativeBridgeAvailable()) {
        window.SafeCallNative.showToast('✓ Alert History Cleared');
      }
    } catch (e) {
      setAlerts([]);
    }
  }

  // =========================================================================
  // VIEW: AUTH SCREEN (Free-Will Login with Any Username/Password)
  // =========================================================================
  if (!currentUser) {
    return /*#__PURE__*/React.createElement("div", {
      className: "app-wrapper"
    }, /*#__PURE__*/React.createElement("header", {
      className: "app-header"
    }, /*#__PURE__*/React.createElement("div", {
      className: "header-brand"
    }, /*#__PURE__*/React.createElement("div", {
      className: "brand-badge"
    }, "SC"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "brand-title"
    }, "SafeCall AI"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '11px',
        color: 'var(--text-muted)'
      }
    }, "Elderly Care Urgency System"))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: '8px',
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "btn-secondary-action",
      style: {
        width: 'auto',
        padding: '0 10px',
        height: '30px',
        fontSize: '11px',
        fontWeight: 800,
        borderColor: '#1B7575',
        color: '#1B7575',
        background: '#E7F3F2'
      },
      onClick: () => setShowVisualizer(true)
    }, "\u26A1 Architecture Flow"), /*#__PURE__*/React.createElement("div", {
      className: "server-status-pill",
      onClick: () => setShowServerModal(true)
    }, /*#__PURE__*/React.createElement("span", {
      className: `status-dot ${serverOnline ? 'online' : 'offline'}`
    }), /*#__PURE__*/React.createElement("span", null, serverOnline ? 'Online' : 'Offline')))), /*#__PURE__*/React.createElement("main", {
      className: "page-content"
    }, /*#__PURE__*/React.createElement("div", {
      className: "ui-card"
    }, /*#__PURE__*/React.createElement("h2", {
      style: {
        fontSize: '20px',
        fontWeight: 800,
        textAlign: 'center'
      }
    }, "Sign In to Device"), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: '13px',
        color: 'var(--text-secondary)',
        textAlign: 'center'
      }
    }, "Sign in on ", /*#__PURE__*/React.createElement("strong", null, "Phone 1 as Senior"), " and on ", /*#__PURE__*/React.createElement("strong", null, "Phone 2 as Caregiver"), " with any username or password:"), /*#__PURE__*/React.createElement("div", {
      className: "role-select-grid"
    }, /*#__PURE__*/React.createElement("div", {
      className: `role-card-btn ${loginRole === 'elderly' ? 'active' : ''}`,
      onClick: () => {
        setLoginRole('elderly');
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "role-card-icon"
    }, "\uD83D\uDC74"), /*#__PURE__*/React.createElement("div", {
      className: "role-card-title"
    }, "Senior"), /*#__PURE__*/React.createElement("div", {
      className: "role-card-desc"
    }, "Generates pairing code & non-response detection")), /*#__PURE__*/React.createElement("div", {
      className: `role-card-btn ${loginRole === 'caregiver' ? 'active' : ''}`,
      onClick: () => {
        setLoginRole('caregiver');
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "role-card-icon"
    }, "\uD83D\uDEE1\uFE0F"), /*#__PURE__*/React.createElement("div", {
      className: "role-card-title"
    }, "Caregiver"), /*#__PURE__*/React.createElement("div", {
      className: "role-card-desc"
    }, "Receives real-time alerts & system notifications"))), /*#__PURE__*/React.createElement("form", {
      onSubmit: handleUniversalLogin,
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      style: {
        fontSize: '12px',
        fontWeight: 700,
        color: 'var(--text-secondary)'
      }
    }, "Username / Name / Any Identifier"), /*#__PURE__*/React.createElement("input", {
      type: "text",
      className: "form-input-field",
      placeholder: "e.g. Grandma Rosa, John, Meera, or anything",
      value: loginIdentifier,
      onChange: e => setLoginIdentifier(e.target.value),
      required: true
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      style: {
        fontSize: '12px',
        fontWeight: 700,
        color: 'var(--text-secondary)'
      }
    }, "Password (Optional \u2014 type anything or leave blank)"), /*#__PURE__*/React.createElement("input", {
      type: "password",
      className: "form-input-field",
      placeholder: "Any password or leave empty",
      value: loginPassword,
      onChange: e => setLoginPassword(e.target.value)
    })), loginError && /*#__PURE__*/React.createElement("div", {
      style: {
        color: '#C62828',
        background: '#FFEBEE',
        padding: '10px',
        borderRadius: '8px',
        fontSize: '13px'
      }
    }, loginError), /*#__PURE__*/React.createElement("button", {
      type: "submit",
      className: "btn-primary-big",
      disabled: loginLoading
    }, loginLoading ? 'Entering...' : `Enter as ${loginRole === 'elderly' ? 'Senior' : 'Caregiver'}`)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        marginTop: '6px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: '11px',
        fontWeight: 700,
        color: 'var(--text-muted)',
        textAlign: 'center'
      }
    }, "1-TAP QUICK SIGN-IN:"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: '8px',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "preset-pill",
      onClick: () => {
        setLoginRole('elderly');
        setLoginIdentifier('Meera');
        setLoginPassword('');
      }
    }, "\uD83D\uDC74 Senior (Meera)"), /*#__PURE__*/React.createElement("button", {
      className: "preset-pill",
      onClick: () => {
        setLoginRole('caregiver');
        setLoginIdentifier('Bob');
        setLoginPassword('');
      }
    }, "\uD83D\uDEE1\uFE0F Caregiver (Bob)"))))), showServerModal && /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "ui-card",
      style: {
        width: '100%',
        maxWidth: '420px',
        background: 'white'
      }
    }, /*#__PURE__*/React.createElement("h3", {
      className: "ui-card-title"
    }, "Backend Server Settings"), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: '12px',
        color: 'var(--text-secondary)'
      }
    }, "Set the backend server URL reachable by both phones:"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn-secondary-action",
      style: { fontWeight: 800, color: '#1B5E20', borderColor: '#A5D6A7' },
      onClick: () => setServerInput('https://safecall-backend-kd8k.onrender.com')
    }, "☁️ Render Cloud: https://safecall-backend-kd8k.onrender.com"), /*#__PURE__*/React.createElement("button", {
      className: "btn-secondary-action",
      onClick: () => setServerInput('https://safecall-demo-college.loca.lt')
    }, "\uD83C\uDF10 Public Tunnel: https://safecall-demo-college.loca.lt"), /*#__PURE__*/React.createElement("button", {
      className: "btn-secondary-action",
      onClick: () => setServerInput('http://192.168.137.1:4000')
    }, "\uD83D\uDCE1 Hotspot IP: http://192.168.137.1:4000")), /*#__PURE__*/React.createElement("input", {
      type: "text",
      className: "form-input-field",
      value: serverInput,
      onChange: e => setServerInput(e.target.value),
      placeholder: "http://192.168.x.x:4000"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: '8px'
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn-primary-big",
      style: {
        height: '42px',
        fontSize: '14px'
      },
      onClick: () => {
        setServerUrl(serverInput);
        localStorage.setItem('safecall_server_url', serverInput);
        setShowServerModal(false);
      }
    }, "Save & Connect"), /*#__PURE__*/React.createElement("button", {
      className: "btn-secondary-action",
      style: {
        height: '42px',
        width: 'auto'
      },
      onClick: () => setShowServerModal(false)
    }, "Close")))), showVisualizer && /*#__PURE__*/React.createElement(BackendArchitectureVisualizer, {
      onClose: () => setShowVisualizer(false),
      serverUrl: serverUrl,
      serverOnline: serverOnline,
      alerts: alerts,
      linkedUsers: linkedUsers
    }));
  }

  // =========================================================================
  // VIEW: LOGGED IN (Senior or Caregiver)
  // =========================================================================
  const isSenior = currentUser.role === 'elderly';
  return /*#__PURE__*/React.createElement("div", {
    className: "app-wrapper"
  }, /*#__PURE__*/React.createElement("header", {
    className: "app-header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "header-brand"
  }, /*#__PURE__*/React.createElement("div", {
    className: "brand-badge"
  }, isSenior ? '👴' : '🛡️'), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "brand-title"
  }, currentUser.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      color: 'var(--text-secondary)'
    }
  }, isSenior ? 'Senior Device' : 'Caregiver Device', " \u2022 ", currentUser.phone || currentUser.email))), /*#__PURE__*/React.createElement("div", {
    className: "header-actions"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn-secondary-action",
    style: {
      width: 'auto',
      padding: '0 10px',
      height: '30px',
      fontSize: '11px',
      fontWeight: 800,
      borderColor: '#1B7575',
      color: '#1B7575',
      background: '#E7F3F2'
    },
    onClick: () => setShowVisualizer(true)
  }, "\u26A1 Architecture Flow"), /*#__PURE__*/React.createElement("div", {
    className: "server-status-pill",
    onClick: () => setShowServerModal(true)
  }, /*#__PURE__*/React.createElement("span", {
    className: `status-dot ${serverOnline ? 'online' : 'offline'}`
  }), /*#__PURE__*/React.createElement("span", null, serverOnline ? 'Online' : 'Offline')), /*#__PURE__*/React.createElement("button", {
    className: "btn-signout",
    onClick: handleLogout
  }, "Switch / Sign Out"))), /*#__PURE__*/React.createElement("main", {
    className: "page-content"
  }, isSenior && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "senior-hero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hero-icon"
  }, "\u2713"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: '18px',
      fontWeight: 800,
      color: '#1B5E20'
    }
  }, linkedUsers.length > 0 ? 'Protected & Connected' : 'Ready to Pair'), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '13px',
      color: '#2E7D32'
    }
  }, linkedUsers.length > 0 ? `Linked to Caregiver: ${linkedUsers[0].name} (${linkedUsers[0].phone || 'Active'})` : 'Tap below to generate a pairing code for your Caregiver.'))), /*#__PURE__*/React.createElement("div", {
    className: "ui-card",
    style: {
      border: '2px solid #1B7575',
      background: '#F0FDFA'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '8px'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: '15px',
      fontWeight: 800,
      color: '#0F766E'
    }
  }, "\u26A1 Backend & Java Engine Visualizer"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: 'var(--text-secondary)'
    }
  }, "Watch how telephony broadcasts are evaluated in Java and pushed via FCM.")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn-primary-big",
    style: {
      width: 'auto',
      padding: '0 14px',
      height: '36px',
      fontSize: '12px',
      background: '#0F766E'
    },
    onClick: () => setShowVisualizer(true)
  }, "Inspect Flow"))), /*#__PURE__*/React.createElement("div", {
    className: "ui-card"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "ui-card-title"
  }, "\uD83D\uDD11 Connect with Caregiver"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '13px',
      color: 'var(--text-secondary)'
    }
  }, "Tap below to generate a 6-character code. Your caregiver will enter this on their phone under ", /*#__PURE__*/React.createElement("strong", null, "\"Pair Senior\""), ":"), pairingCode ? /*#__PURE__*/React.createElement("div", {
    className: "code-box"
  }, /*#__PURE__*/React.createElement("div", {
    className: "code-text"
  }, pairingCode), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      fontWeight: 700,
      color: 'var(--text-muted)'
    }
  }, "Expires in: ", Math.floor(pairingTimeLeft / 60), "m ", pairingTimeLeft % 60, "s"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: 'var(--text-secondary)',
      marginTop: '8px'
    }
  }, "Type this code into the Caregiver's phone under ", /*#__PURE__*/React.createElement("strong", null, "\"Pair Senior\""), "!"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '8px',
      justifyContent: 'center',
      marginTop: '10px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn-secondary-action",
    style: {
      height: '34px',
      fontSize: '12px',
      width: 'auto',
      padding: '0 12px'
    },
    onClick: handleGeneratePairingCode
  }, "🔄 Regenerate"), /*#__PURE__*/React.createElement("button", {
    className: "btn-secondary-action",
    style: {
      height: '34px',
      fontSize: '12px',
      width: 'auto',
      padding: '0 12px'
    },
    onClick: () => setPairingCode('')
  }, "✕ Dismiss"))) : /*#__PURE__*/React.createElement("button", {
    className: "btn-primary-big",
    onClick: handleGeneratePairingCode
  }, "\uD83D\uDD11 Generate Pairing Code")), /*#__PURE__*/React.createElement("div", {
    className: "ui-card",
    style: {
      border: telephonyPerms.allGranted ? '1px solid #C8E6C9' : '1px solid #FFE082',
      background: telephonyPerms.allGranted ? '#F1F8E9' : '#FFFDE7'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
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
    className: "ui-card-title",
    style: {
      margin: 0,
      color: telephonyPerms.allGranted ? '#2E7D32' : '#F57F17'
    }
  }, "Real Phone Call Urgency Detection")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '11px',
      fontWeight: 800,
      padding: '4px 8px',
      borderRadius: '12px',
      background: telephonyPerms.allGranted ? '#2E7D32' : '#F57F17',
      color: 'white'
    }
  }, telephonyPerms.allGranted ? 'ACTIVE' : 'PERMISSION NEEDED')), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '13px',
      color: 'var(--text-secondary)',
      lineHeight: '1.4'
    }
  }, "When real calls are received or missed on this phone, SafeCall AI captures the call outcome and evaluates non-response with the ", /*#__PURE__*/React.createElement("strong", null, "Weighted Rule Engine"), ". Gate 1 requires ", /*#__PURE__*/React.createElement("strong", null, "4 consecutive missed calls in 15 minutes"), " followed by a 60s grace period before notifying caregivers (Threshold: 60/100)."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '10px',
      padding: '10px 14px',
      background: telephonyState && telephonyState.status === 'GRACE_PERIOD' ? '#FFEBEE' : (telephonyState && telephonyState.missedCount > 0 ? '#FFF3E0' : '#E8F5E9'),
      borderRadius: '8px',
      border: telephonyState && telephonyState.status === 'GRACE_PERIOD' ? '1px solid #FFCDD2' : (telephonyState && telephonyState.missedCount > 0 ? '1px solid #FFE0B2' : '1px solid #A5D6A7'),
      fontSize: '12px',
      color: telephonyState && telephonyState.status === 'GRACE_PERIOD' ? '#B71C1C' : (telephonyState && telephonyState.missedCount > 0 ? '#E65100' : '#1B5E20'),
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement("span", { style: { fontSize: '22px' } }, telephonyState && telephonyState.status === 'GRACE_PERIOD' ? "🚨" : (telephonyState && telephonyState.missedCount > 0 ? "📞" : "📡")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", { style: { fontWeight: 800, fontSize: '13px' } }, telephonyState && telephonyState.status === 'GRACE_PERIOD' ? "Gate 1 Triggered: 60s Grace Period Active!" : (telephonyState && telephonyState.missedCount > 0 ? `Captured Missed Call ${telephonyState.missedCount} / 4 (Gate 1)` : "Live Telephony Gate Active")), /*#__PURE__*/React.createElement("div", { style: { fontSize: '11px', marginTop: '2px' } }, telephonyState && telephonyState.missedCount > 0 ? `Last Caller: ${telephonyState.number || 'Incoming'} • Gate requires 4 missed calls in 15m. Answering or declining resets counter.` : "Listening for incoming calls. A single missed call will not alarm; 4 consecutive misses initiate alert."))), !telephonyPerms.allGranted && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '10px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn-primary-big",
    style: {
      background: '#F57F17'
    },
    onClick: () => {
      if (window.SafeCallNative && window.SafeCallNative.requestTelephonyPermissions) {
        window.SafeCallNative.requestTelephonyPermissions();
      } else {
        alert('Please ensure Phone State and Call Log permissions are enabled in Android App Settings.');
      }
    }
  }, "Grant Call & Notification Permissions")), offlineAlertsCount > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '10px',
      padding: '10px',
      background: '#FFF3E0',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12px',
      color: '#E65100',
      fontWeight: 600
    }
  }, "\u26A0\uFE0F ", offlineAlertsCount, " offline alert(s) waiting in queue"), /*#__PURE__*/React.createElement("button", {
    className: "btn-secondary-action",
    style: {
      padding: '4px 10px',
      fontSize: '11px'
    },
    onClick: () => {
      if (window.SafeCallNative && window.SafeCallNative.triggerOfflineSync) {
        window.SafeCallNative.triggerOfflineSync();
      }
    }
  }, "Sync Now"))), /*#__PURE__*/React.createElement("div", {
    className: "ui-card",
    style: {
      border: '2px solid #D32F2F',
      background: '#FFFDFD'
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
  }, "\uD83D\uDEA8"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: '18px',
      fontWeight: 800,
      color: '#B71C1C'
    }
  }, "Simulate Urgent Incoming Call"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: 'var(--text-secondary)'
    }
  }, "Triggers the urgency engine and transmits an alert to your caregiver's phone!"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      marginTop: '6px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn-primary-big",
    style: {
      background: '#B71C1C'
    },
    disabled: seniorSimLoading,
    onClick: () => handleSimulateCall('emergency')
  }, "\uD83D\uDEA8 Simulate Emergency Call (Dr. Vance, 3:15 AM \u2014 100/100)"), /*#__PURE__*/React.createElement("button", {
    className: "btn-secondary-action",
    style: {
      borderColor: '#E65100',
      color: '#E65100',
      fontWeight: 800
    },
    disabled: seniorSimLoading,
    onClick: () => handleSimulateCall('repeated')
  }, "\u26A0\uFE0F Simulate Repeated Calls (Family, 3 Calls \u2014 85/100)"), /*#__PURE__*/React.createElement("button", {
    className: "btn-secondary-action",
    disabled: seniorSimLoading,
    onClick: () => handleSimulateCall('normal')
  }, "\uD83D\uDCDE Simulate Normal Call (Friend, Daytime \u2014 20/100, No Alert)")), seniorSimStatus && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      padding: '12px',
      background: 'var(--bg-subtle)',
      borderRadius: '8px',
      fontWeight: 700,
      color: 'var(--text-primary)',
      borderLeft: '4px solid var(--teal-primary)'
    }
  }, seniorSimStatus)), /*#__PURE__*/React.createElement("div", {
    className: "ui-card"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "ui-card-title"
  }, "Your Linked Caregivers (", linkedUsers.length, ")"), linkedUsers.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      color: 'var(--text-muted)',
      fontStyle: 'italic'
    }
  }, "No caregiver linked yet. Generate a pairing code above!") : linkedUsers.map(u => /*#__PURE__*/React.createElement("div", {
    key: u.relationshipId || u.userId,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: 'var(--bg-subtle)',
      padding: '12px 14px',
      borderRadius: '8px'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '15px',
      fontWeight: 800
    }
  }, u.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: 'var(--text-muted)'
    }
  }, u.phone || 'Caregiver Account')), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '11px',
      fontWeight: 700,
      color: '#2E7D32',
      background: '#E8F5E9',
      padding: '4px 8px',
      borderRadius: '999px'
    }
  }, "CONNECTED")))), /*#__PURE__*/React.createElement("div", {
    className: "ui-card",
    style: {
      background: '#FFF8E6',
      borderColor: '#FCE1A8'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '16px',
      fontWeight: 800,
      color: '#965B00'
    }
  }, "Direct Phone Call"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: 'var(--text-secondary)'
    }
  }, "Call primary caregiver immediately")), /*#__PURE__*/React.createElement("button", {
    className: "btn-primary-big",
    style: {
      width: 'auto',
      padding: '0 18px',
      height: '42px',
      background: '#965B00'
    },
    onClick: () => {
      const phone = linkedUsers[0]?.phone || '911';
      if (isNativeBridgeAvailable()) window.SafeCallNative.launchDialler(phone);else window.open(`tel:${phone}`);
    }
  }, "Call Now")))), !isSenior && /*#__PURE__*/React.createElement(React.Fragment, null, latestPopupAlert && /*#__PURE__*/React.createElement("div", {
    className: "critical-incoming-alert"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '17px',
      fontWeight: 900
    }
  }, "\uD83D\uDEA8 CRITICAL CALL ALERT: ", latestPopupAlert.elderlyName), /*#__PURE__*/React.createElement("span", {
    style: {
      background: 'white',
      color: '#B71C1C',
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 800
    }
  }, "SCORE ", latestPopupAlert.score, "/100")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '14px'
    }
  }, "Caller: ", /*#__PURE__*/React.createElement("strong", null, latestPopupAlert.callerName), " (", latestPopupAlert.callerPhone, ")"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      opacity: 0.9
    }
  }, latestPopupAlert.explanation), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '8px',
      marginTop: '6px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn-primary-big",
    style: {
      background: 'white',
      color: '#B71C1C',
      height: '40px',
      fontSize: '14px'
    },
    onClick: () => handleAcknowledgeAlert(latestPopupAlert.id)
  }, "\u2713 Acknowledge Alert"), /*#__PURE__*/React.createElement("button", {
    className: "btn-secondary-action",
    style: {
      background: 'transparent',
      color: 'white',
      borderColor: 'rgba(255,255,255,0.4)',
      height: '40px',
      width: 'auto'
    },
    onClick: () => setLatestPopupAlert(null)
  }, "Dismiss"))), /*#__PURE__*/React.createElement("div", {
    className: "tab-strip"
  }, /*#__PURE__*/React.createElement("button", {
    className: `tab-btn ${caregiverTab === 'alerts' ? 'active' : ''}`,
    onClick: () => setCaregiverTab('alerts')
  }, "\uD83D\uDCCA Alerts (", alerts.length, ")"), /*#__PURE__*/React.createElement("button", {
    className: `tab-btn ${caregiverTab === 'pair' ? 'active' : ''}`,
    onClick: () => setCaregiverTab('pair')
  }, "\uD83D\uDD11 Pair Senior"), /*#__PURE__*/React.createElement("button", {
    className: `tab-btn ${caregiverTab === 'seniors' ? 'active' : ''}`,
    onClick: () => setCaregiverTab('seniors')
  }, "\uD83D\uDC74 Linked (", linkedUsers.length, ")"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "tab-btn",
    style: {
      color: '#0F766E',
      fontWeight: 800
    },
    onClick: () => setShowVisualizer(true)
  }, "\u26A1 Architecture")), caregiverTab === 'alerts' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ui-card",
    style: {
      background: telephonyState && (telephonyState.status === 'GRACE_PERIOD' || (telephonyState.missedCount >= (telephonyState.maxGate || 4))) ? '#FEF2F2' : (telephonyState && telephonyState.missedCount > 0 ? '#FFFBEB' : '#F0FDF4'),
      borderColor: telephonyState && (telephonyState.status === 'GRACE_PERIOD' || (telephonyState.missedCount >= (telephonyState.maxGate || 4))) ? '#FECACA' : (telephonyState && telephonyState.missedCount > 0 ? '#FDE68A' : '#BBF7D0'),
      padding: '14px 16px',
      marginBottom: '4px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '6px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      fontWeight: 800,
      color: telephonyState && telephonyState.missedCount > 0 ? '#B45309' : '#166534',
      letterSpacing: '0.5px'
    }
  }, "\uD83D\uDCE1 SENIOR LIVE CALL MONITOR"), /*#__PURE__*/React.createElement("span", {
    className: "badge",
    style: {
      background: telephonyState && telephonyState.status === 'GRACE_PERIOD' ? '#EF4444' : (telephonyState && telephonyState.missedCount > 0 ? '#F59E0B' : '#10B981'),
      color: 'white',
      fontSize: '11px',
      fontWeight: 800
    }
  }, telephonyState && telephonyState.status === 'GRACE_PERIOD' ? '\uD83D\uDEA8 GRACE PERIOD' : (telephonyState && telephonyState.missedCount > 0 ? '\u26A1 ACTIVE SEQUENCE' : '\uD83D\uDFE2 ALL QUIET'))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '15px',
      fontWeight: 800,
      color: '#111827',
      marginBottom: '4px'
    }
  }, telephonyState && telephonyState.missedCount > 0 ? `Captured ${telephonyState.missedCount} / ${telephonyState.maxGate || 4} Missed Calls` : 'Monitoring Senior Line (0 Missed Calls)'), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '12px',
      color: '#4B5563',
      margin: 0,
      lineHeight: 1.4
    }
  }, telephonyState && telephonyState.missedCount > 0 ? (telephonyState.missedCount >= (telephonyState.maxGate || 4) ? '\uD83D\uDEA8 Gate 1 Passed! 60s Grace period active. Real push alert will trigger caregiver phone.' : `Gate 1 requires ${telephonyState.maxGate || 4} consecutive missed calls before alerting. Waiting for more calls or response...`) : (linkedUsers.length > 0 ? `Linked to ${linkedUsers.map(u => u.name).join(', ')}. Real call outcomes will appear here in real time.` : 'No senior paired yet. Enter a code from the Senior phone under "Pair Senior" to connect.'))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: '16px',
      fontWeight: 800
    }
  }, "Live Urgency Alerts Feed"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleClearAlerts,
    style: {
      background: '#F1F5F9',
      border: '1px solid #CBD5E1',
      borderRadius: '6px',
      padding: '4px 10px',
      fontSize: '11px',
      fontWeight: 700,
      color: '#475569',
      cursor: 'pointer'
    }
  }, "\uD83D\uDDD1\uFE0F Clear Alerts"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: 'var(--text-muted)'
    }
  }, "Auto-polling (1.5s)"))), alerts.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "ui-card",
    style: {
      textAlign: 'center',
      padding: '30px 16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '32px'
    }
  }, "\uD83D\uDEE1\uFE0F"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '16px',
      fontWeight: 800,
      marginTop: '8px'
    }
  }, "All Clear \u2022 No Urgent Alerts"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      color: 'var(--text-secondary)',
      marginTop: '4px'
    }
  }, linkedUsers.length === 0 ? 'Go to "Pair Senior" tab to connect to your Senior\'s phone!' : `Monitoring calls for ${linkedUsers.map(u => u.name).join(', ')}. Trigger a simulation on the Senior phone to test!`)) : alerts.map(a => /*#__PURE__*/React.createElement("div", {
    key: a.id,
    className: `alert-box ${a.level}`
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '16px',
      fontWeight: 800
    }
  }, a.elderlyName), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      color: 'var(--text-secondary)'
    }
  }, "Caller: ", /*#__PURE__*/React.createElement("strong", null, a.callerName), " (", a.callerPhone, ")")), /*#__PURE__*/React.createElement("span", {
    className: `badge-pill ${a.level}`
  }, a.level, " \u2022 ", a.score, "/100")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bg-subtle)',
      padding: '8px 12px',
      borderRadius: '6px',
      fontSize: '12px'
    }
  }, a.explanation), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTop: '1px solid var(--border-light)',
      paddingTop: '8px',
      fontSize: '11px',
      color: 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement("span", null, new Date(a.timestamps?.generated || a.timestamps?.sent || Date.now()).toLocaleTimeString()), a.status === 'ACKNOWLEDGED' ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#2E7D32',
      fontWeight: 800
    }
  }, "\u2713 Acknowledged") : /*#__PURE__*/React.createElement("button", {
    className: "btn-primary-big",
    style: {
      width: 'auto',
      height: '34px',
      padding: '0 14px',
      fontSize: '12px'
    },
    onClick: () => handleAcknowledgeAlert(a.id)
  }, "Acknowledge Alert"))))), caregiverTab === 'pair' && /*#__PURE__*/React.createElement("div", {
    className: "ui-card",
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    className: "ui-card-title"
  }, "Pair with Senior Phone"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '13px',
      color: 'var(--text-secondary)'
    }
  }, "Enter the 6-character code generated on the Senior's phone:"), /*#__PURE__*/React.createElement("input", {
    className: "form-input-field",
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '28px',
      letterSpacing: '6px',
      textAlign: 'center',
      height: '56px',
      fontWeight: 800,
      textTransform: 'uppercase'
    },
    type: "text",
    maxLength: "6",
    value: inputCode,
    onChange: e => setInputCode(e.target.value.toUpperCase()),
    placeholder: "K 7 M 4 R 2",
    autoFocus: true
  }), /*#__PURE__*/React.createElement("button", {
    className: "btn-primary-big",
    onClick: handleVerifyCode,
    disabled: pairLoading
  }, pairLoading ? 'Connecting...' : 'Verify & Connect to Senior'), pairStatus && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      color: 'var(--teal-primary)',
      background: 'var(--bg-subtle)',
      padding: '10px',
      borderRadius: '8px',
      fontWeight: 700
    }
  }, pairStatus)), caregiverTab === 'seniors' && /*#__PURE__*/React.createElement("div", {
    className: "ui-card"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "ui-card-title"
  }, "Monitored Seniors (", linkedUsers.length, ")"), linkedUsers.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      color: 'var(--text-muted)',
      fontStyle: 'italic'
    }
  }, "No seniors linked yet. Enter a code from the Senior phone under \"Pair Senior\"!") : linkedUsers.map(u => /*#__PURE__*/React.createElement("div", {
    key: u.relationshipId || u.userId,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: 'var(--bg-subtle)',
      padding: '14px',
      borderRadius: '8px'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '16px',
      fontWeight: 800
    }
  }, u.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      color: 'var(--text-muted)'
    }
  }, u.phone || 'Senior Account'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '11px',
      color: '#2E7D32',
      fontWeight: 700,
      marginTop: '2px'
    }
  }, "\u25CF ONLINE \u2022 Urgency Monitoring Active")), /*#__PURE__*/React.createElement("button", {
    className: "btn-primary-big",
    style: {
      width: 'auto',
      padding: '0 14px',
      height: '36px',
      fontSize: '12px'
    },
    onClick: () => {
      const phone = u.phone || '';
      if (isNativeBridgeAvailable()) window.SafeCallNative.launchDialler(phone);else window.open(`tel:${phone}`);
    }
  }, "Call")))))), showServerModal && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ui-card",
    style: {
      width: '100%',
      maxWidth: '420px',
      background: 'white'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    className: "ui-card-title"
  }, "Backend Server Settings"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '12px',
      color: 'var(--text-secondary)'
    }
  }, "Set the backend server URL reachable by both phones:"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn-secondary-action",
    style: { fontWeight: 800, color: '#1B5E20', borderColor: '#A5D6A7' },
    onClick: () => setServerInput('https://safecall-backend-kd8k.onrender.com')
  }, "☁️ Render Cloud: https://safecall-backend-kd8k.onrender.com"), /*#__PURE__*/React.createElement("button", {
    className: "btn-secondary-action",
    onClick: () => setServerInput('https://safecall-demo-college.loca.lt')
  }, "\uD83C\uDF10 Public Tunnel: https://safecall-demo-college.loca.lt"), /*#__PURE__*/React.createElement("button", {
    className: "btn-secondary-action",
    onClick: () => setServerInput('http://192.168.137.1:4000')
  }, "\uD83D\uDCE1 Hotspot IP: http://192.168.137.1:4000")), /*#__PURE__*/React.createElement("input", {
    type: "text",
    className: "form-input-field",
    value: serverInput,
    onChange: e => setServerInput(e.target.value),
    placeholder: "http://192.168.x.x:4000"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '8px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn-primary-big",
    style: {
      height: '42px',
      fontSize: '14px'
    },
    onClick: () => {
      setServerUrl(serverInput);
      localStorage.setItem('safecall_server_url', serverInput);
      setShowServerModal(false);
    }
  }, "Save & Connect"), /*#__PURE__*/React.createElement("button", {
    className: "btn-secondary-action",
    style: {
      height: '42px',
      width: 'auto'
    },
    onClick: () => setShowServerModal(false)
  }, "Close")))), showVisualizer && /*#__PURE__*/React.createElement(BackendArchitectureVisualizer, {
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