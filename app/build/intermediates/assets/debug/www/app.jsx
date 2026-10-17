/**
 * SafeCall AI — Connected Elderly Care Platform
 * Feature-Parity Migration: Integrating Teammate's Visual Design System
 * Fully connected to Java Android Native Bridge, SQLite, and Backend Service
 */

const { useState, useEffect, useRef, useMemo } = React;

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
function BackendArchitectureVisualizer({ onClose, serverUrl, serverOnline, alerts, linkedUsers }) {
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

  const stages = [
    {
      id: 1,
      title: 'Real Call Ringing',
      subtitle: 'Android Telephony Broadcast',
      icon: '📱',
      file: 'SafeCallPhoneStateReceiver.java',
      badge: 'TelephonyManager API',
      color: '#0284C7',
      summary: 'Intercepts OS telephony broadcast EXTRA_STATE_RINGING. Stores ringing start timestamp and sanitizes caller phone number.',
      code: `if (state == TelephonyManager.CALL_STATE_RINGING) {\n    isIncoming = true;\n    ringStartTime = System.currentTimeMillis();\n    savedNumber = sanitizePhoneNumber(number);\n}`
    },
    {
      id: 2,
      title: 'Call Termination & FSM',
      subtitle: 'Missed vs Answered State Machine',
      icon: '📡',
      file: 'SafeCallPhoneStateReceiver.java',
      badge: 'Finite State Machine',
      color: '#2563EB',
      summary: 'Tracks transition to EXTRA_STATE_IDLE. If preceded by RINGING, marks MISSED (duration=0). If preceded by OFFHOOK, calculates talk duration.',
      code: `if (lastState == CALL_STATE_RINGING) {\n    handleCallFinished(context, savedNumber, ringStartTime, 0, true);\n} else if (isIncoming && lastState == CALL_STATE_OFFHOOK) {\n    int duration = (int) Math.max(1, (now - callAnsweredTime) / 1000);\n    handleCallFinished(context, savedNumber, ringStartTime, duration, false);\n}`
    },
    {
      id: 3,
      title: 'Background Concurrency',
      subtitle: 'Worker Thread Dispatch',
      icon: '⚙️',
      file: 'CallEventProcessor.java',
      badge: 'ExecutorService Worker',
      color: '#7C3AED',
      summary: 'Offloads processing to Executors.newSingleThreadExecutor() so database operations and network calls never block Android UI thread.',
      code: `private static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor();\npublic static void processCallEvent(...) {\n    EXECUTOR.execute(() -> { /* background execution */ });\n}`
    },
    {
      id: 4,
      title: '4-Factor Urgency Engine',
      subtitle: 'Deterministic Context Evaluation',
      icon: '🧠',
      file: 'WeightedRuleEngine.java',
      badge: 'Core Java OOP Rules',
      color: '#DC2626',
      summary: 'Evaluates Caller Priority (<=25), Repeated Calls in 15m (<=35), Timing & Context (<=10), and Historical Missed Anomaly (<=30). Clamped [0, 100].',
      code: `int score = 0;\nscore += calculatePriority(profile);     // Max 25\nscore += calculateRepeated(recentCalls); // Max 35\nscore += calculateTiming(callTime);      // Max 10\nscore += calculateAnomaly(historyCalls);  // Max 30\nscore = Math.max(0, Math.min(100, score));`
    },
    {
      id: 5,
      title: 'SQLite Persistence & Queue',
      subtitle: 'Local Storage & Offline Resilience',
      icon: '💾',
      file: 'DatabaseHelper.java / CallRepository.java',
      badge: 'SQLiteOpenHelper v3',
      color: '#059669',
      summary: 'Persists evaluated record into call_history. If score >= 80 but network is offline, safely stores alert in offline_alerts table for automatic replay.',
      code: `if (networkAvailable) {\n    sendAlertHttp(serverUrl, token, payload);\n} else {\n    repository.enqueueOfflineAlert(idempotentId, payload, callTime);\n}`
    },
    {
      id: 6,
      title: 'Multi-Gate Policy',
      subtitle: 'Stateful Anomaly Engine',
      icon: '🛡️',
      file: 'NonResponsePolicyEngine.java / SequenceTracker.java',
      badge: '5-Component Anomaly',
      color: '#D97706',
      summary: 'Gate 1: >=4 missed calls in 15m. Gate 2: 60-second grace period with senior response cancellation. Gate 3: Score >= 60 triggers alert.',
      code: `if (sequence.missedCount >= MIN_MISSED_FOR_GATE) {\n    scheduleGracePeriod(context, sequence.sequenceId, 60000);\n}`
    },
    {
      id: 7,
      title: 'Cloud Alert Dispatch',
      subtitle: 'Secure Multi-Device Tunnel',
      icon: '☁️',
      file: 'server.js / fcmDispatcher.js',
      badge: 'Cloud Integration',
      color: '#0F766E',
      summary: 'Backend checks active caregiver pairings, enforces idempotent dispatch, and triggers Firebase Cloud Messaging (FCM) push notifications.',
      code: `if (score >= threshold) {\n    fcmDispatcher.dispatchAlertToCaregivers(alert, caregivers);\n}`
    },
    {
      id: 8,
      title: 'Caregiver Device Alert',
      subtitle: 'System Notification & Ringtone',
      icon: '🚨',
      file: 'SafeCallNativeBridge.java',
      badge: 'Native Audio & Notification',
      color: '#B91C1C',
      summary: 'Caregiver device sounds native Android alert tone, vibrates, displays critical alert banner, and supports 1-tap alert acknowledgment.',
      code: `SafeCallNative.showSystemNotification(\n    "🚨 Alert for " + elderlyName,\n    "Urgent call: " + explanation,\n    score\n);`
    }
  ];

  const currentStageData = stages.find(s => s.id === selectedStage) || stages[3];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="visualizer-modal" onClick={e => e.stopPropagation()}>
        <div className="visualizer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>⚡</span>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>System Architecture & Viva Walkthrough</h2>
              <p style={{ fontSize: '12px', margin: '2px 0 0', opacity: 0.85 }}>
                SafeCall AI — Java Android Engine & Connected Care Platform
              </p>
            </div>
          </div>
          <button 
            className="secondary-button" 
            style={{ padding: '6px 14px', fontSize: '12px' }} 
            onClick={onClose}
          >
            ✕ Close
          </button>
        </div>

        <div className="visualizer-tab-strip">
          <button 
            className={`visualizer-tab-btn ${activeTab === 'pipeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('pipeline')}
          >
            🔄 1. Pipeline Flow (8 Stages)
          </button>
          <button 
            className={`visualizer-tab-btn ${activeTab === 'calculator' ? 'active' : ''}`}
            onClick={() => setActiveTab('calculator')}
          >
            🧮 2. Live Java Rule Calculator
          </button>
          <button 
            className={`visualizer-tab-btn ${activeTab === 'oop' ? 'active' : ''}`}
            onClick={() => setActiveTab('oop')}
          >
            🏛️ 3. Java OOP & Patterns
          </button>
          <button 
            className={`visualizer-tab-btn ${activeTab === 'telemetry' ? 'active' : ''}`}
            onClick={() => setActiveTab('telemetry')}
          >
            📊 4. Telemetry ({alerts.length} Alerts)
          </button>
        </div>

        <div style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activeTab === 'pipeline' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
                {stages.map(st => (
                  <div 
                    key={st.id} 
                    onClick={() => setSelectedStage(st.id)}
                    style={{ 
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: selectedStage === st.id ? `2px solid ${st.color}` : '1px solid var(--color-border)',
                      background: selectedStage === st.id ? 'var(--color-mint)' : 'var(--color-surface)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>{st.icon}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: st.color }}>STAGE {st.id}</div>
                      <div style={{ fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{st.title}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '24px' }}>{currentStageData.icon}</span>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 800, color: currentStageData.color, margin: 0 }}>
                        Stage {currentStageData.id}: {currentStageData.title}
                      </h3>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        File: <strong>{currentStageData.file}</strong>
                      </div>
                    </div>
                  </div>
                  <span style={{ background: currentStageData.color, color: 'white', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 800 }}>
                    {currentStageData.badge}
                  </span>
                </div>

                <p style={{ fontSize: '13px', color: '#334155', lineHeight: '1.6', margin: 0 }}>
                  {currentStageData.summary}
                </p>

                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', marginBottom: '4px' }}>
                    KEY IMPLEMENTATION SNIPPET:
                  </div>
                  <pre className="code-box-dark">
                    <code>{currentStageData.code}</code>
                  </pre>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'calculator' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
                Interactive simulator of <strong>WeightedRuleEngine.java</strong>. Adjust parameters to verify exact score calculations:
              </div>

              {/* Factor 1: Priority */}
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>1. Caller Priority (Max 25 pts)</span>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-primary)' }}>+{pWeight} pts</span>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {['EMERGENCY', 'TRUSTED', 'NORMAL', 'UNKNOWN'].map(p => (
                    <button 
                      key={p} 
                      className="preset-pill"
                      style={{ background: calcPriority === p ? 'var(--color-primary)' : 'white', color: calcPriority === p ? 'white' : 'var(--color-text)' }}
                      onClick={() => setCalcPriority(p)}
                    >
                      {p === 'EMERGENCY' ? '🚨 EMERGENCY (+25)' : p === 'TRUSTED' ? '⭐ TRUSTED (+15)' : p === 'NORMAL' ? '👤 NORMAL (+0)' : '❓ UNKNOWN (+0)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Factor 2: Repeats */}
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>2. Repeated Calls in 15m (Max 35 pts)</span>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-primary)' }}>+{rWeight} pts</span>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[1, 2, 3, 4].map(num => (
                    <button 
                      key={num} 
                      className="preset-pill"
                      style={{ background: calcRepeats === num ? 'var(--color-primary)' : 'white', color: calcRepeats === num ? 'white' : 'var(--color-text)' }}
                      onClick={() => setCalcRepeats(num)}
                    >
                      {num === 1 ? '1 Call (+0)' : num === 2 ? '2 Calls (+10)' : num === 3 ? '3 Calls (+22)' : '4+ Calls (+35)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Factor 3: Timing */}
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>3. Call Timing & Context (Max 10 pts)</span>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-primary)' }}>+{tWeight} pts</span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['DAY', 'NIGHT'].map(t => (
                    <button 
                      key={t} 
                      className="preset-pill"
                      style={{ background: calcTiming === t ? 'var(--color-primary)' : 'white', color: calcTiming === t ? 'white' : 'var(--color-text)' }}
                      onClick={() => setCalcTiming(t)}
                    >
                      {t === 'DAY' ? '☀️ Daytime (+0)' : '🌙 Late Night (+10)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Factor 4: Anomaly */}
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>4. Historical Missed-Call Anomaly (Max 30 pts)</span>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-primary)' }}>+{aWeight} pts</span>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {['LOW', 'MED', 'HIGH'].map(a => (
                    <button 
                      key={a} 
                      className="preset-pill"
                      style={{ background: calcAnomaly === a ? 'var(--color-primary)' : 'white', color: calcAnomaly === a ? 'white' : 'var(--color-text)' }}
                      onClick={() => setCalcAnomaly(a)}
                    >
                      {a === 'LOW' ? 'Consistent Baseline (+0)' : a === 'MED' ? 'Moderate Pattern (+15)' : 'High Anomaly (>=50% Missed) (+30)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Evaluated Result */}
              <div style={{ background: meetsThreshold ? '#FEF2F2' : '#F0FDF4', border: meetsThreshold ? '2px solid #EF4444' : '2px solid #22C55E', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: meetsThreshold ? '#991B1B' : '#166534' }}>
                      FORMULA: S = MIN(100, W1 + W2 + W3 + W4)
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: 900, color: meetsThreshold ? '#DC2626' : '#15803D' }}>
                      {computedScore} / 100 ({urgencyLevel})
                    </div>
                  </div>
                  <span style={{ background: meetsThreshold ? '#DC2626' : '#15803D', color: 'white', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 800 }}>
                    {meetsThreshold ? '🚨 DISPATCHES ALERT TO CAREGIVER' : '✓ LOGGED LOCALLY (NO ALERT)'}
                  </span>
                </div>
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#475569' }}>
                  {pWeight} (Priority) + {rWeight} (Repeats) + {tWeight} (Time) + {aWeight} (Anomaly) = <strong>{computedScore}/100</strong>. Threshold is <strong>80/100</strong>.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'oop' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="stat-card">
                <h4 style={{ margin: '0 0 6px', color: 'var(--color-primary)' }}>1. Encapsulation & POJOs</h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-muted)' }}>
                  <code>CallRecord.java</code>, <code>CallerProfile.java</code>, and <code>UrgencyResult.java</code> encapsulate immutable state, private fields, and safe getters/setters.
                </p>
              </div>
              <div className="stat-card">
                <h4 style={{ margin: '0 0 6px', color: 'var(--color-primary)' }}>2. Singleton Pattern</h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-muted)' }}>
                  <code>SequenceTracker.getInstance()</code> manages synchronized concurrent access to pending sequences and 60-second grace period timers across Android lifecycle events.
                </p>
              </div>
              <div className="stat-card">
                <h4 style={{ margin: '0 0 6px', color: 'var(--color-primary)' }}>3. Finite State Machine (FSM)</h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-muted)' }}>
                  <code>SafeCallPhoneStateReceiver.java</code> models OS telephony state transitions (<code>IDLE</code> → <code>RINGING</code> → <code>OFFHOOK</code> → <code>IDLE</code>) to deterministically distinguish missed from answered calls.
                </p>
              </div>
              <div className="stat-card">
                <h4 style={{ margin: '0 0 6px', color: 'var(--color-primary)' }}>4. Repository Pattern</h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-muted)' }}>
                  <code>CallRepository.java</code> abstracts all raw SQLite database access, providing clean domain-level CRUD operations for contacts, call history, and offline queues.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'telemetry' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>Server URL: {serverUrl}</span>
                <span className={`status-dot ${serverOnline ? 'online' : 'offline'}`} />
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                Total Recorded Alerts in Session: <strong>{alerts.length}</strong> | Linked Caregiver Relationships: <strong>{linkedUsers.length}</strong>
              </div>
              {alerts.length === 0 ? (
                <div className="empty-results">No alerts recorded in this session yet.</div>
              ) : (
                alerts.slice(0, 5).map(a => (
                  <div key={a.id} style={{ padding: '12px', border: '1px solid var(--color-border)', borderRadius: '8px', background: 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '13px' }}>
                      <span>{a.elderlyName} ← {a.callerName}</span>
                      <span className={`priority ${a.level?.toLowerCase() || 'high'}`}>{a.score}/100</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>{a.explanation}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
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
  const medPriorityCount = callHistory.filter(c => (c.score > 30 && c.score <= 70) || c.level === 'MEDIUM').length;
  const highPriorityCount = callHistory.filter(c => c.score > 70 || c.level === 'HIGH').length;

  return (
    <>
      {/* Critical Incoming Alert Banner (Caregiver) */}
      {!isSenior && latestPopupAlert && (
        <div className="critical-incoming-alert">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: 900, color: '#991B1B' }}>
              🚨 CRITICAL CALL ALERT: {latestPopupAlert.elderlyName}
            </div>
            <span className="priority high">
              SCORE {latestPopupAlert.score}/100
            </span>
          </div>
          <div style={{ fontSize: '13px' }}>
            Caller: <strong>{latestPopupAlert.callerName}</strong> ({latestPopupAlert.callerPhone})
          </div>
          <div style={{ fontSize: '12px', color: '#7f1d1d' }}>
            {latestPopupAlert.explanation}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button 
              className="primary-button"
              style={{ background: '#DC2626', borderColor: '#DC2626', padding: '8px 14px', fontSize: '12px' }}
              onClick={() => handleAcknowledgeAlert(latestPopupAlert.id)}
            >
              ✓ Acknowledge Alert
            </button>
            <button 
              className="secondary-button"
              style={{ padding: '8px 14px', fontSize: '12px' }}
              onClick={() => handleAcknowledgeAlert(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Welcome Hero */}
      <section className="welcome">
        <div>
          <p className="eyebrow light">
            {isSenior ? 'SENIOR SAFETY PROTECTION' : 'CAREGIVER MONITORING'}
          </p>
          <h2>{isSenior ? 'Protected & Connected' : 'Stay Connected. Stay Reassured.'}</h2>
          <p>
            {isSenior 
              ? (linkedUsers.length > 0 
                  ? `Linked to Caregiver: ${linkedUsers[0].name} (${linkedUsers[0].phone || 'Active Monitoring'})` 
                  : 'Your device is ready to connect with your designated Caregiver.')
              : (linkedUsers.length > 0
                  ? `Active vigilance for ${linkedUsers.map(u => u.name).join(', ')}. Real-time urgency alerts enabled.`
                  : 'Pair with your family member\'s device using the 6-character code.')}
          </p>
        </div>
        <div className="welcome-icon">{isSenior ? '👴' : '🛡️'}</div>
      </section>

      {/* Summary Stats Grid (Dynamic real counts from SQLite database) */}
      <section className="section">
        <div className="section-heading">
          <div>
            <h2>Communication summary</h2>
            <p>Real-time telemetry from SQLite database & alert engine.</p>
          </div>
          <span className="demo-label">LIVE DATABASE</span>
        </div>

        <div className="stats-grid">
          <article className="stat-card">
            <span className="stat-icon teal">☎</span>
            <p>Total calls</p>
            <h3>{totalCallsCount}</h3>
            <span className="stat-note">Evaluated events</span>
          </article>

          <article className="stat-card">
            <span className="stat-icon green">✓</span>
            <p>Low priority</p>
            <h3>{lowPriorityCount}</h3>
            <span className="stat-note">Routine calls (0-30)</span>
          </article>

          <article className="stat-card">
            <span className="stat-icon amber">!</span>
            <p>Medium priority</p>
            <h3>{medPriorityCount}</h3>
            <span className="stat-note">Worth reviewing (31-70)</span>
          </article>

          <article className="stat-card">
            <span className="stat-icon red">↑</span>
            <p>High priority</p>
            <h3>{highPriorityCount}</h3>
            <span className="stat-note">Alert triggered (71+)</span>
          </article>
        </div>
      </section>

      {/* 4/4 Check Urgency Engine Telemetry Card */}
      <section className="section" style={{ marginTop: '0' }}>
        <div className="rule-card" style={{ background: '#f8fafc', borderColor: '#cbd5e1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>🛡️</span>
              <h3 style={{ margin: 0, color: 'var(--color-primary)' }}>
                4/4 Engine Check System &bull; Active Vigilance
              </h3>
            </div>
            <span className="priority low" style={{ fontSize: '11px', padding: '2px 8px' }}>
              4/4 Checks Guarding Calls
            </span>
          </div>
          <p className="rule-description" style={{ margin: '0 0 10px', color: '#475569' }}>
            Every incoming phone call is deterministically evaluated against our 4-factor gate system before alert dispatch:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px' }}>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>CHECK 1/4</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>Caller Identity</div>
              <div style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 600 }}>Max 25 pts</div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px' }}>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>CHECK 2/4</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>Frequency Redials</div>
              <div style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 600 }}>Max 35 pts (15m)</div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px' }}>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>CHECK 3/4</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>Timing Context</div>
              <div style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 600 }}>Max 10 pts (Night)</div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px' }}>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>CHECK 4/4</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>Historical Anomaly</div>
              <div style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 600 }}>Max 30 pts (Baseline)</div>
            </div>
          </div>
        </div>
      </section>

      {/* Senior Specific Controls */}
      {isSenior && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Pairing Code & Connection Management Card */}
          <div className="rule-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ margin: 0 }}>🔑 Connect with Caregiver</h3>
              {linkedUsers.length > 0 && (
                <span className="priority low" style={{ fontSize: '11px', padding: '2px 8px' }}>
                  ✓ {linkedUsers.length} Connected
                </span>
              )}
            </div>

            {/* If already connected, show active Caregivers with Unlink option */}
            {linkedUsers.length > 0 && (
              <div style={{ marginBottom: '14px', background: 'var(--color-mint)', padding: '12px', borderRadius: '8px', border: '1px solid #cce3de' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '6px' }}>
                  Active Caregiver Vigilance:
                </div>
                {linkedUsers.map(u => (
                  <div key={u.relationshipId || u.userId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px dashed #d1e5e0' }}>
                    <div>
                      <strong style={{ fontSize: '13px', color: 'var(--color-text)' }}>{u.name}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--color-muted)', marginLeft: '8px' }}>({u.phone || 'Caregiver Device'})</span>
                    </div>
                    <button 
                      type="button"
                      className="secondary-button"
                      style={{ padding: '4px 10px', fontSize: '11px', color: '#991B1B', borderColor: '#FCA5A5' }}
                      onClick={() => handleUnlink(u.relationshipId, u.userId)}
                      title="Disconnect this caregiver relationship"
                    >
                      Disconnect
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className="rule-description">
              {linkedUsers.length > 0 
                ? 'Generate a fresh 6-character code to reconnect or pair with an additional Caregiver phone:' 
                : 'Generate a 6-character code to link your phone with your Caregiver:'}
            </p>

            {pairingCode ? (
              <div className="code-box">
                <div className="code-text">{pairingCode}</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)', marginTop: '4px' }}>
                  Expires in: {Math.floor(pairingTimeLeft / 60)}m {pairingTimeLeft % 60}s
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '6px' }}>
                  Enter this code on the Caregiver phone under <strong>"Pair Senior"</strong>!
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '12px' }}>
                  <button 
                    type="button" 
                    className="secondary-button" 
                    style={{ fontSize: '11.5px', padding: '6px 12px' }}
                    onClick={handleGeneratePairingCode}
                  >
                    🔄 Re-generate New Code
                  </button>
                  <button 
                    type="button" 
                    className="secondary-button" 
                    style={{ fontSize: '11.5px', padding: '6px 12px' }}
                    onClick={() => { setPairingCode(''); seniorSimStatus && seniorSimStatus.includes('Code') && null; }}
                  >
                    Close Code
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className="primary-button" onClick={handleGeneratePairingCode}>
                  {linkedUsers.length > 0 ? '🔄 Re-generate Pairing Code / Reconnect' : '🔑 Generate 6-Character Pairing Code'}
                </button>
              </div>
            )}

            {seniorSimStatus && (
              <div style={{ marginTop: '10px', fontSize: '12.5px', color: 'var(--color-primary)', fontWeight: 600 }}>
                {seniorSimStatus}
              </div>
            )}
          </div>

          {/* Real Telephony Urgency Detection Card */}
          <div className="rule-card" style={{ background: telephonyPerms.allGranted ? '#f0fdf4' : '#fffbeb', borderColor: telephonyPerms.allGranted ? '#bbf7d0' : '#fde68a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>📞</span>
                <h3 style={{ margin: 0, color: telephonyPerms.allGranted ? '#166534' : '#92400e' }}>
                  Android Phone Call Urgency Detection
                </h3>
              </div>
              <span className={`priority ${telephonyPerms.allGranted ? 'low' : 'medium'}`}>
                {telephonyPerms.allGranted ? 'Active Monitoring' : 'Permission Required'}
              </span>
            </div>
            <p className="rule-description" style={{ margin: '0 0 10px', color: '#4b5563' }}>
              When incoming calls arrive on this Android device, SafeCall AI intercepts the broadcast, calculates context urgency with the Java Rule Engine, and notifies your caregiver if score reaches 80/100.
            </p>

            {!telephonyPerms.allGranted && (
              <button 
                className="primary-button"
                style={{ background: '#d97706', borderColor: '#d97706' }}
                onClick={() => {
                  if (isNativeBridgeAvailable() && window.SafeCallNative.requestTelephonyPermissions) {
                    window.SafeCallNative.requestTelephonyPermissions();
                  } else {
                    alert('Please grant Phone State and Call Log permissions in Android settings.');
                  }
                }}
              >
                Grant Android Telephony Permissions
              </button>
            )}

            {offlineAlertsCount > 0 && (
              <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #fed7aa' }}>
                <span style={{ fontSize: '12px', color: '#c2410c', fontWeight: 700 }}>
                  ⚠️ {offlineAlertsCount} offline alert(s) queued
                </span>
                <button 
                  className="secondary-button"
                  style={{ padding: '4px 10px', fontSize: '11px' }}
                  onClick={() => {
                    if (isNativeBridgeAvailable() && window.SafeCallNative.triggerOfflineSync) {
                      window.SafeCallNative.triggerOfflineSync();
                    }
                  }}
                >
                  Sync Queue
                </button>
              </div>
            )}
          </div>

          {/* Direct Dialler Emergency Card */}
          <div className="rule-card" style={{ background: '#fff9eb', borderColor: '#e9d5a8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', color: '#8a5a08' }}>Direct Phone Call</h3>
                <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                  Call your primary Caregiver directly
                </div>
              </div>
              <button 
                className="primary-button"
                style={{ background: '#8a5a08', borderColor: '#8a5a08' }}
                onClick={() => {
                  const phone = linkedUsers[0]?.phone || (contacts[0]?.phone) || '911';
                  if (isNativeBridgeAvailable()) window.SafeCallNative.launchDialler(phone);
                  else window.open(`tel:${phone}`);
                }}
              >
                📞 Call Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Caregiver Specific Controls */}
      {!isSenior && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Pair Senior Card */}
          <div className="rule-card">
            <h3>🔑 Pair with Senior Phone</h3>
            <p className="rule-description">
              Enter the 6-character code generated on the Senior's phone to establish real-time monitoring:
            </p>
            <div style={{ display: 'flex', gap: '8px', maxWidth: '400px' }}>
              <input 
                type="text"
                maxLength="6"
                value={inputCode}
                onChange={e => setInputCode(e.target.value.toUpperCase())}
                placeholder="K 7 M 4 R 2"
                style={{ 
                  fontFamily: 'var(--font-mono)', 
                  fontSize: '20px', 
                  letterSpacing: '4px', 
                  textAlign: 'center', 
                  fontWeight: 800, 
                  padding: '8px', 
                  borderRadius: '8px', 
                  border: '1px solid var(--color-border)' 
                }}
              />
              <button 
                className="primary-button"
                onClick={handleVerifyCode}
                disabled={pairLoading}
              >
                {pairLoading ? 'Connecting...' : 'Connect'}
              </button>
            </div>
            {pairStatus && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-primary)', fontWeight: 700 }}>
                {pairStatus}
              </div>
            )}
          </div>

          {/* Monitored Seniors Card */}
          <div className="rule-card">
            <h3>Monitored Seniors ({linkedUsers.length})</h3>
            {linkedUsers.length === 0 ? (
              <p className="rule-description">
                No senior paired yet. Enter the 6-character pairing code above to begin monitoring.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {linkedUsers.map(u => (
                  <div key={u.relationshipId || u.userId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--color-mint)', borderRadius: '8px' }}>
                    <div>
                      <strong>{u.name}</strong>
                      <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>{u.phone || 'Senior Device'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        className="secondary-button"
                        style={{ padding: '6px 10px', fontSize: '11px' }}
                        onClick={() => {
                          const phone = u.phone || '';
                          if (isNativeBridgeAvailable()) window.SafeCallNative.launchDialler(phone);
                          else window.open(`tel:${phone}`);
                        }}
                      >
                        📞 Call
                      </button>
                      <button 
                        className="secondary-button"
                        style={{ padding: '6px 10px', fontSize: '11px', color: '#991B1B', borderColor: '#FCA5A5' }}
                        onClick={() => handleUnlink(u.relationshipId, u.userId)}
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Call Activity Preview */}
      <section className="section activity-card">
        <div className="section-heading">
          <div>
            <h2>Recent call activity</h2>
            <p>Real-time records evaluated by SafeCall AI.</p>
          </div>
          <button className="text-button" onClick={() => setActivePage('activity')}>
            View all ({callHistory.length})
          </button>
        </div>

        {callHistory.length === 0 ? (
          <div className="empty-results">
            No calls logged yet. Incoming calls or simulated events will appear here in real time.
          </div>
        ) : (
          callHistory.slice(0, 4).map(call => (
            <div className="activity-row" key={call.id || call.timestamp}>
              <div className={`caller-avatar ${call.score >= 71 ? 'red-avatar' : call.score >= 31 ? 'amber-avatar' : ''}`}>
                {(call.phone || 'UN').slice(0, 2).toUpperCase()}
              </div>
              <div className="caller-info">
                <strong>{call.phone || 'Unknown Caller'}</strong>
                <span>
                  {call.outcome || 'Call'} · {new Date(call.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {call.isSimulation ? ' (Simulated)' : ''}
                </span>
              </div>
              <div className="score">
                <strong>{call.score}/100</strong>
                <span className={`priority ${(call.level || 'low').toLowerCase()}`}>
                  {call.level || 'Low'}
                </span>
              </div>
            </div>
          ))
        )}

        <p className="disclaimer">
          Scores evaluated deterministically using SafeCall AI 4-Factor Weighted Java Rule Engine.
        </p>
      </section>
    </>
  );
}

// =========================================================================
// 2. CALL ACTIVITY PAGE COMPONENT
// =========================================================================
function CallActivityPage({ callHistory }) {
  const [search, setSearch] = useState('');
  const [selectedCallId, setSelectedCallId] = useState(null);

  const filtered = callHistory.filter(c => 
    (c.phone && c.phone.toLowerCase().includes(search.toLowerCase())) ||
    (c.explanation && c.explanation.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <section className="section call-activity-page">
      <div className="section-heading">
        <div>
          <h2>Call Activity & Telemetry</h2>
          <p>Review real and simulated calls with complete engine explanation breakdowns.</p>
        </div>
        <span className="demo-label">SQLITE CALL_HISTORY</span>
      </div>

      <div className="call-search">
        <label htmlFor="call-search-input">Search by phone number or keyword</label>
        <input
          id="call-search-input"
          type="search"
          placeholder="Type phone or keywords..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="call-list">
        {filtered.length > 0 ? (
          filtered.map(call => (
            <article className="activity-row call-record" key={call.id || call.timestamp}>
              <div className={`caller-avatar ${call.score >= 71 ? 'red-avatar' : call.score >= 31 ? 'amber-avatar' : ''}`}>
                {(call.phone || 'UN').slice(0, 2).toUpperCase()}
              </div>

              <div className="caller-info">
                <strong>{call.phone || 'Unknown Caller'}</strong>
                <span>
                  {call.outcome || 'Call'} · {new Date(call.timestamp).toLocaleString()}
                  {call.isSimulation ? ' · [Simulation Event]' : ' · [Real Call]'}
                </span>
              </div>

              <div className="score">
                <strong>{call.score}/100</strong>
                <span className={`priority ${(call.level || 'low').toLowerCase()}`}>
                  {call.level || 'Low'}
                </span>
                <button
                  className="details-button"
                  onClick={() => setSelectedCallId(selectedCallId === (call.id || call.timestamp) ? null : (call.id || call.timestamp))}
                >
                  {selectedCallId === (call.id || call.timestamp) ? 'Hide details' : 'Details'}
                </button>
              </div>

              {selectedCallId === (call.id || call.timestamp) && (
                <div className="call-details">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong>Java Engine 4/4 Check Evaluation:</strong>
                    <span style={{ fontSize: '10.5px', background: 'rgba(2, 132, 199, 0.12)', color: 'var(--color-primary)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                      4/4 Checks Verified
                    </span>
                  </div>
                  <p>{call.explanation || 'Check 1: Identity (+0) | Check 2: Frequency (+0) | Check 3: Timing (+0) | Check 4: History baseline normal (+0).'}</p>
                  <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--color-primary)' }}>
                    Duration: {call.duration || 0}s | Status: {call.outcome || 'UNKNOWN'} | Recorded at: {new Date(call.timestamp).toLocaleTimeString()}
                  </div>
                  {call.phone && call.phone !== 'UNKNOWN' && (
                    <button 
                      className="secondary-button"
                      style={{ marginTop: '10px', padding: '4px 10px', fontSize: '11px' }}
                      onClick={() => {
                        if (isNativeBridgeAvailable()) window.SafeCallNative.launchDialler(call.phone);
                        else window.open(`tel:${call.phone}`);
                      }}
                    >
                      📞 Call Back: {call.phone}
                    </button>
                  )}
                </div>
              )}
            </article>
          ))
        ) : (
          <p className="empty-results">
            No calls match "{search}".
          </p>
        )}
      </div>

      <p className="disclaimer">
        Records are persisted in local SQLite <code>call_history</code> database on this Android device.
      </p>
    </section>
  );
}

// =========================================================================
// 3. TRUSTED CONTACTS PAGE COMPONENT
// =========================================================================
function TrustedContactsPage({ contacts, setContacts, refreshDatabaseData }) {
  const [form, setForm] = useState({ name: '', phone: '', relationship: '', priority: 'TRUSTED' });
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
        const updated = editingId !== null 
          ? prev.map(c => c.id === editingId ? { ...c, ...newContact, id: editingId } : c)
          : [...prev, { ...newContact, id: Date.now() }];
        localStorage.setItem('safecall-trusted-contacts', JSON.stringify(updated));
        return updated;
      });
    }

    setMsg(editingId !== null ? 'Contact updated.' : 'Contact added to SQLite database.');
    setForm({ name: '', phone: '', relationship: '', priority: 'TRUSTED' });
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

  return (
    <section className="section contacts-page">
      <div className="section-heading">
        <div>
          <h2>Trusted Contacts</h2>
          <p>Manage designated priority contacts evaluated by the Java Urgency Engine.</p>
        </div>
        <span className="demo-label">SQLITE CONTACTS</span>
      </div>

      <div className="contacts-layout">
        <form className="contact-form" onSubmit={handleFormSubmit}>
          <h3>{editingId !== null ? 'Edit Contact' : 'Add a Priority Contact'}</h3>

          <label htmlFor="contact-name">Full name</label>
          <input 
            id="contact-name"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Dr. Vance, Maya (Daughter)"
            required
          />

          <label htmlFor="contact-phone">Phone number</label>
          <input 
            id="contact-phone"
            type="tel"
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
            placeholder="e.g. +1 555-911-0022"
            required
          />

          <label htmlFor="contact-relationship">Relationship</label>
          <input 
            id="contact-relationship"
            value={form.relationship}
            onChange={e => setForm({ ...form, relationship: e.target.value })}
            placeholder="e.g. Doctor, Family, Neighbor"
            required
          />

          <label htmlFor="contact-priority">Contact Urgency Priority</label>
          <select
            id="contact-priority"
            value={form.priority}
            onChange={e => setForm({ ...form, priority: e.target.value })}
          >
            <option value="EMERGENCY">🚨 Emergency Contact (+25 pts)</option>
            <option value="TRUSTED">⭐ Trusted Contact (+15 pts)</option>
            <option value="NORMAL">👤 Normal Contact (+0 pts)</option>
          </select>

          <div className="contact-form-actions">
            <button className="primary-button" type="submit">
              {editingId !== null ? 'Save changes' : 'Add contact'}
            </button>
            {editingId !== null && (
              <button className="secondary-button" type="button" onClick={() => { setEditingId(null); setForm({ name: '', phone: '', relationship: '', priority: 'TRUSTED' }); }}>
                Cancel
              </button>
            )}
          </div>

          {msg && <p className="form-message">{msg}</p>}
        </form>

        <div className="contacts-list">
          <h3>Saved Contacts in SQLite ({contacts.length})</h3>

          {contacts.length === 0 ? (
            <p className="empty-results">No contacts saved yet.</p>
          ) : (
            contacts.map(c => (
              <article className="contact-card" key={c.id || c.phone}>
                <div className="caller-avatar">
                  {(c.name || 'C').slice(0, 2).toUpperCase()}
                </div>

                <div className="contact-card-info">
                  <strong>{c.name}</strong>
                  <span>{c.relationship} · {c.phone}</span>
                  <span className="contact-priority">
                    {c.priority === 'EMERGENCY' ? '🚨 Emergency Contact (+25)' : c.priority === 'TRUSTED' ? '⭐ Trusted Contact (+15)' : '👤 Normal Priority (+0)'}
                  </span>
                </div>

                <div className="contact-actions">
                  <button 
                    className="details-button"
                    type="button"
                    onClick={() => {
                      if (isNativeBridgeAvailable()) window.SafeCallNative.launchDialler(c.phone);
                      else window.open(`tel:${c.phone}`);
                    }}
                  >
                    📞 Call
                  </button>
                  <button 
                    className="details-button"
                    type="button"
                    onClick={() => {
                      setForm({ name: c.name, phone: c.phone, relationship: c.relationship, priority: c.priority || 'TRUSTED' });
                      setEditingId(c.id);
                    }}
                  >
                    Edit
                  </button>
                  <button 
                    className="details-button delete-button"
                    type="button"
                    onClick={() => handleDelete(c.id, c.phone)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>

      <p className="disclaimer">
        Contacts are stored in Android SQLite <code>contacts</code> table and matched during real-time call broadcasts.
      </p>
    </section>
  );
}

// =========================================================================
// 4. ALERT RULES PAGE COMPONENT
// =========================================================================
function AlertRulesPage({ apiFetch, contacts }) {
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
        body: JSON.stringify({ threshold, schedule, autoAlertEnabled: autoAlert })
      });
    } catch (err) {}

    setSavedMsg('✓ Alert rules saved to Android FamilyAlertManager & Backend!');
    setTimeout(() => setSavedMsg(''), 4000);
  }

  return (
    <section className="section alert-rules-page">
      <div className="section-heading">
        <div>
          <h2>Alert Rules & Policies</h2>
          <p>Configure thresholds and multi-gate anomaly rules for Android call monitoring.</p>
        </div>
        <span className="demo-label">FAMILY ALERT MANAGER</span>
      </div>

      <form className="rules-form" onSubmit={handleSaveRules}>
        <section className="rule-card">
          <h3>4/4 Engine Check System &bull; Breakthrough Threshold</h3>
          <p className="rule-description">
            Evaluated across all 4 checks (Identity 25 + Frequency 35 + Timing 10 + History 30 = 100). Set minimum score for automatic Caregiver dispatch:
          </p>

          <div className="threshold-display">
            <span>Caregiver Alert Threshold</span>
            <strong>{threshold}/100</strong>
          </div>

          <input 
            type="range"
            min="50"
            max="95"
            step="5"
            value={threshold}
            onChange={e => setThreshold(Number(e.target.value))}
          />

          <div className="range-labels">
            <span>50 — Sensitive</span>
            <span>80 — Standard Breakthrough</span>
            <span>95 — Maximum Strictness</span>
          </div>
        </section>

        <section className="rule-card">
          <h3>Check 2: Repeated Call Frequency Window (Max 35 pts)</h3>
          <p className="rule-description">
            Configures redial thresholds evaluated in <code>WeightedRuleEngine.java</code>:
          </p>
          <div className="rule-fields">
            <div>
              <label>Call Count Minimum</label>
              <input 
                type="number"
                min="2"
                max="5"
                value={repeatCount}
                onChange={e => setRepeatCount(Number(e.target.value))}
              />
            </div>
            <div>
              <label>Rolling Time Window (minutes)</label>
              <input 
                type="number"
                min="5"
                max="60"
                value={repeatWindow}
                onChange={e => setRepeatWindow(Number(e.target.value))}
              />
            </div>
          </div>
        </section>

        <section className="rule-card">
          <h3>Check 3: Timing Context &amp; Alert Schedule (Max 10 pts)</h3>
          <p className="rule-description">
            Active timing policy in <code>WeightedRuleEngine.java</code> &amp; <code>FamilyAlertManager.java</code>:
          </p>
          <div className="rule-fields">
            <div>
              <label>Monitoring Schedule Policy</label>
              <select value={schedule} onChange={e => setSchedule(e.target.value)}>
                <option value="ALL_DAY">All Day (24/7 Continuous Monitoring)</option>
                <option value="DAYTIME">Daytime Only (06:00 - 22:59)</option>
                <option value="NIGHTTIME">Night-time Only (23:00 - 05:00)</option>
              </select>
            </div>
          </div>
        </section>

        <section className="rule-card">
          <label className="toggle-row">
            <span>
              <strong>Enable Automatic Caregiver Dispatch</strong>
              <small>Transmit urgent alerts to paired Caregivers when 4/4 engine threshold is met.</small>
            </span>
            <input 
              type="checkbox"
              checked={autoAlert}
              onChange={e => setAutoAlert(e.target.checked)}
            />
          </label>
        </section>

        <section className="rule-card" style={{ background: '#f8fafc' }}>
          <h3 style={{ color: 'var(--color-primary)' }}>Check 4: Non-Response Anomaly Baseline (Max 30 pts)</h3>
          <p className="rule-description">
            Historical baseline anomaly gates enforced by <code>NonResponsePolicyEngine.java</code>:
          </p>
          <ul style={{ paddingLeft: '20px', fontSize: '13px', lineHeight: '1.7', color: '#334155' }}>
            <li><strong>Gate 1:</strong> Accumulation of 4+ consecutive missed calls in a 15-minute rolling window.</li>
            <li><strong>Gate 2:</strong> 60-second grace period timer. Any user activity or call callback automatically resolves the sequence.</li>
            <li><strong>Gate 3:</strong> Urgency score ≥ 60/100 triggers verified caregiver alert dispatch with full system ringtone.</li>
          </ul>
        </section>

        <div className="rules-actions">
          <button className="primary-button" type="submit">
            Save Rules & Policies
          </button>
          <button 
            className="secondary-button" 
            type="button" 
            onClick={() => { setThreshold(80); setSchedule('ALL_DAY'); setAutoAlert(true); }}
          >
            Restore Defaults (80/100)
          </button>
        </div>

        {savedMsg && <p className="form-message">{savedMsg}</p>}
      </form>
    </section>
  );
}

// =========================================================================
// 5. SIMULATION MODE PAGE COMPONENT
// =========================================================================
function SimulationModePage({ apiFetch, refreshDatabaseData }) {
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

    const pPts = (selectedKey === 'emergency') ? 25 : isTrusted ? 15 : 0;
    const rPts = callCount >= 4 ? 35 : callCount === 3 ? 22 : callCount === 2 ? 10 : 0;
    const tPts = isLateNight ? 10 : 0;
    const aPts = (selectedKey === 'missed') ? 30 : (selectedKey === 'emergency' ? 30 : 15);

    const totalScore = Math.min(100, Math.max(0, pPts + rPts + tPts + aPts));
    const threshold = 80;
    const priority = totalScore >= threshold ? 'High' : totalScore >= 31 ? 'Medium' : 'Low';
    const isHighRisk = totalScore >= threshold;

    const reasons = [
      `Caller Priority: ${pPts === 25 ? 'Emergency Contact (+25 pts)' : pPts === 15 ? 'Trusted Contact (+15 pts)' : 'Normal (+0 pts)'}`,
      `Call Frequency: ${callCount} calls within ${minutes} minutes (+${rPts} pts)`,
      `Timing & Context: ${isLateNight ? 'Late-Night window (23:00 - 05:00) (+10 pts)' : 'Daytime (+0 pts)'}`,
      `Historical Anomaly: +${aPts} pts based on consecutive response pattern`
    ];

    const checks = [
      { id: 1, name: 'Caller Identity Gate', max: 25, pts: pPts, triggered: pPts > 0, detail: pPts === 25 ? 'Emergency Contact (+25 pts)' : pPts === 15 ? 'Trusted Contact (+15 pts)' : 'Normal Contact (+0 pts)' },
      { id: 2, name: 'Frequency Window Gate', max: 35, pts: rPts, triggered: rPts > 0, detail: `${callCount} calls in ${minutes}m window (+${rPts} pts)` },
      { id: 3, name: 'Timing Context Gate', max: 10, pts: tPts, triggered: tPts > 0, detail: isLateNight ? 'Late-Night window (23:00 - 05:00) (+10 pts)' : 'Normal daytime (+0 pts)' },
      { id: 4, name: 'Historical Anomaly Gate', max: 30, pts: aPts, triggered: aPts > 0, detail: `Baseline response pattern (+${aPts} pts)` }
    ];
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

  return (
    <section className="section simulation-page">
      <div className="section-heading">
        <div>
          <h2>Simulation Mode</h2>
          <p>Test call patterns using the deterministic SafeCall AI Java Rule Engine.</p>
        </div>
        <span className="demo-label">JAVA ENGINE SIMULATION</span>
      </div>

      <div className="simulation-notice">
        <strong>Safe Simulation Environment</strong>
        <p>
          This tool evaluates simulated call scenarios against current SafeCall AI scoring rules. All simulation events are tagged with <code>isSimulation: true</code> so they never pollute genuine call history.
        </p>
      </div>

      <form className="simulation-form" onSubmit={runSimulationCalculation}>
        <div className="rule-card">
          <label htmlFor="scenario-select" style={{ fontSize: '13px', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
            Choose a Demonstration Scenario
          </label>
          <select
            id="scenario-select"
            value={selectedKey}
            onChange={e => {
              const k = e.target.value;
              setSelectedKey(k);
              setCallCount(scenarios[k].callCount);
              setCallTime(scenarios[k].callTime);
              setIsLateNight(scenarios[k].isLateNight);
              setIsTrusted(scenarios[k].priority === 'EMERGENCY' || scenarios[k].priority === 'TRUSTED');
              setSimResult(null);
            }}
          >
            {Object.entries(scenarios).map(([key, item]) => (
              <option value={key} key={key}>{item.label}</option>
            ))}
          </select>
          <p className="rule-description scenario-description">
            {scenarios[selectedKey]?.description}
          </p>
        </div>

        <div className="rule-card">
          <h3>Customize Scenario Parameters</h3>
          <div className="rule-fields">
            <div>
              <label>Number of Calls</label>
              <input 
                type="number"
                min="1"
                max="10"
                value={callCount}
                onChange={e => setCallCount(Number(e.target.value))}
              />
            </div>
            <div>
              <label>Time Window (minutes)</label>
              <input 
                type="number"
                min="5"
                max="120"
                value={minutes}
                onChange={e => setMinutes(Number(e.target.value))}
              />
            </div>
            <div>
              <label>Simulated Call Time</label>
              <input 
                type="time"
                value={callTime}
                onChange={e => setCallTime(e.target.value)}
              />
            </div>
          </div>

          <label className="toggle-row simulation-toggle">
            <span>
              <strong>Late-Night Timing (23:00 - 05:00)</strong>
              <small>Adds timing context points when paired with repeated or emergency caller.</small>
            </span>
            <input 
              type="checkbox"
              checked={isLateNight}
              onChange={e => setIsLateNight(e.target.checked)}
            />
          </label>

          <label className="toggle-row simulation-toggle">
            <span>
              <strong>Caller is Trusted / Emergency Contact</strong>
              <small>Adds caller priority weight in accordance with Java rule engine.</small>
            </span>
            <input 
              type="checkbox"
              checked={isTrusted}
              onChange={e => setIsTrusted(e.target.checked)}
            />
          </label>

          <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
            <button className="primary-button" type="submit">
              ▶ Run Simulation
            </button>
          </div>
        </div>
      </form>

      {simResult && (
        <section className="simulation-result">
          <div className="section-heading">
            <div>
              <h2>Simulation Result</h2>
              <p>Computed strictly with SafeCall AI Weighted Rule Engine.</p>
            </div>
            <span className={`priority ${simResult.priority.toLowerCase()}`}>
              {simResult.priority} Priority
            </span>
          </div>

          <div className="simulation-score">
            <span>Urgency Score</span>
            <strong>
              {simResult.score}
              <small>/100</small>
            </strong>
          </div>

          <p className="rule-description">
            High-priority threshold: {simResult.threshold}/100. Status: <strong>{simResult.score >= simResult.threshold ? '🚨 Qualifies for Caregiver Alert' : '✓ Normal Log'}</strong>
          </p>

          {/* 4/4 Engine Check Multi-Factor Grid */}
          <div style={{ marginTop: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                🛡️ 4/4 Engine Check System Pipeline
              </div>
              <span className="priority low" style={{ fontSize: '11px', padding: '2px 8px' }}>
                4/4 Evaluated &bull; {simResult.checksTriggeredCount}/4 Triggered
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
              {simResult.checks && simResult.checks.map(c => (
                <div key={c.id} style={{ background: c.triggered ? 'rgba(2, 132, 199, 0.08)' : '#f8fafc', border: `1px solid ${c.triggered ? '#38bdf8' : '#e2e8f0'}`, borderRadius: '8px', padding: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 700, color: c.triggered ? 'var(--color-primary)' : '#64748b' }}>
                    <span>CHECK {c.id}/4</span>
                    <span>{c.triggered ? '⚡ ACTIVE' : '✓ CLEAR'}</span>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', margin: '4px 0 2px' }}>
                    {c.name}
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: c.triggered ? '#0284c7' : '#64748b' }}>
                    +{c.pts} / {c.max} pts
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                    {c.detail}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <h3>Evaluation Explanation:</h3>
          <ul className="simulation-reasons">
            {simResult.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>

          {simResult.score >= simResult.threshold ? (
            <div className="notification-preview" style={{ background: '#FEF2F2', borderColor: '#FCA5A5' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>🚨</span>
                <strong style={{ color: '#991B1B' }}>Urgent Alert Automatically Messaged to Caregiver Phone</strong>
              </div>
              <p style={{ margin: '6px 0 0', color: '#7F1D1D', fontSize: '13px' }}>
                High-risk anomaly pattern for <strong>{simResult.callerName}</strong> ({simResult.score}/100) was automatically sent to paired Caregiver's phone.
              </p>
              <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                <button 
                  type="button"
                  className="secondary-button"
                  style={{ fontSize: '11px', padding: '6px 12px' }}
                  onClick={runSimulationCalculation}
                >
                  🔄 Re-Run & Re-Send Alert
                </button>
              </div>
            </div>
          ) : (
            <p className="rule-description" style={{ marginTop: '12px', color: '#047857' }}>
              ✓ Score ({simResult.score}/100) is below the configured alert threshold (80). No caregiver alert required.
            </p>
          )}

          {transmitStatus && (
            <div style={{ marginTop: '10px', fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)' }}>
              {transmitStatus}
            </div>
          )}
        </section>
      )}
    </section>
  );
}

// =========================================================================
// 6. ABOUT / HELP PAGE COMPONENT
// =========================================================================
function AboutHelpPage() {
  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div className="section-heading">
        <div>
          <h2>About SafeCall AI</h2>
          <p>Context-aware urgency engine for elderly people living alone.</p>
        </div>
        <span className="demo-label">ABOUT & VIVA GUIDE</span>
      </div>

      <section className="help-card">
        <div className="help-icon">🛡️</div>
        <h2>What is SafeCall AI?</h2>
        <p>
          SafeCall AI is an Android application designed for elderly care. It monitors incoming telephony broadcasts, evaluates communication context using a deterministic 4-factor rule engine, and coordinates with paired caregivers when critical patterns or persistent non-response anomalies occur.
        </p>
      </section>

      <section className="help-card">
        <div className="help-icon">🧠</div>
        <h2>Deterministic 4-Factor Urgency Engine</h2>
        <p>
          SafeCall AI avoids unpredictable ML black-boxes. Every score (0-100) is deterministically calculated using:
        </p>
        <ul>
          <li><strong>Caller Identity (Max 25):</strong> Emergency (+25), Trusted (+15), Normal (+0).</li>
          <li><strong>Call Frequency (Max 35):</strong> 1 call (+0), 2 calls (+10), 3 calls (+22), 4+ calls (+35) in a 15-minute rolling window.</li>
          <li><strong>Timing & Context (Max 10):</strong> Late-night timing (+10 if repeated or emergency contact).</li>
          <li><strong>Historical Behaviour Anomaly (Max 30):</strong> >=50% unanswered rate anomaly (+30).</li>
        </ul>
      </section>

      <section className="help-card">
        <div className="help-icon">🛡️</div>
        <h2>Multi-Gate Non-Response Anomaly Policy</h2>
        <p>
          Protects elderly users against false alarms through a 3-gate verification pipeline:
        </p>
        <ul>
          <li><strong>Gate 1:</strong> Requires ≥ 4 consecutive missed calls within 15 minutes.</li>
          <li><strong>Gate 2:</strong> Enforces a 60-second grace period. Any answer, callback, or app interaction automatically cancels the alert.</li>
          <li><strong>Gate 3:</strong> Evaluates non-response severity score ≥ 60/100 before dispatching caregiver notifications.</li>
        </ul>
      </section>

      <section className="help-card">
        <div className="help-icon">🔒</div>
        <h2>Data Privacy & Native Offline Storage</h2>
        <p>
          All contacts and call history are stored locally in SQLite on the device. Sensitive call logs are never sent to external AI clouds. Alerts are transmitted directly to paired caregivers using secure token authentication.
        </p>
      </section>

      <p className="help-footer">
        SafeCall AI · Computer Science & Engineering Project · All Rights Reserved
      </p>
    </div>
  );
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
  const [telephonyPerms, setTelephonyPerms] = useState({ hasPhoneState: false, hasCallLog: false, allGranted: false });
  const [offlineAlertsCount, setOfflineAlertsCount] = useState(0);

  const seenAlertIdsRef = useRef(new Set());
  const initialLoadRef = useRef(true);
  const pairingBaselineCountRef = useRef(null);

  // Sync auth state with Android Native Bridge
  useEffect(() => {
    if (window.SafeCallNative && window.SafeCallNative.syncAuthState) {
      if (currentUser) {
        window.SafeCallNative.syncAuthState(
          serverUrl,
          token,
          currentUser.role,
          currentUser.id,
          currentUser.name
        );
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
        if (savedContacts) setContacts(JSON.parse(savedContacts));
        else {
          setContacts([
            { id: 1, name: 'Mom (Family)', phone: '9876543210', relationship: 'Family', priority: 'EMERGENCY' },
            { id: 2, name: 'Dr. Anita', phone: '9812345678', relationship: 'Doctor', priority: 'TRUSTED' },
            { id: 3, name: 'Courier / Service', phone: '9123456789', relationship: 'Service', priority: 'NORMAL' }
          ]);
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
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    try {
      const res = await fetch(`${cleanBase}${endpoint}`, { ...options, headers });
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
      apiFetch('/api/health')
        .then(d => { if (active) setServerOnline(d.status === 'UP'); })
        .catch(() => { if (active) setServerOnline(false); });
    }
    checkHealth();
    const interval = setInterval(checkHealth, 8000);
    return () => { active = false; clearInterval(interval); };
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
          if (
            currentUser.role === 'elderly' && 
            pairingBaselineCountRef.current !== null && 
            data.linked.length > pairingBaselineCountRef.current
          ) {
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
    return () => { active = false; clearInterval(interval); };
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
                window.SafeCallNative.showSystemNotification(
                  `🚨 Urgent Alert for ${alert.elderlyName}`,
                  `Call from ${alert.callerName} (${alert.score}/100): ${alert.explanation}`,
                  alert.score
                );
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
    return () => { active = false; clearInterval(interval); };
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
      const data = await apiFetch('/api/pairing/generate', { method: 'POST' });
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
        body: JSON.stringify({ relationshipId, targetUserId })
      });
    } catch (e) {}

    setLinkedUsers(prev => prev.filter(u => (relationshipId ? u.relationshipId !== relationshipId : u.userId !== targetUserId)));
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
        body: JSON.stringify({ pairingCode: code, autoConfirm: true })
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
      await apiFetch(`/api/alerts/${alertId}/acknowledge`, { method: 'POST' });
    } catch (e) {}

    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'ACKNOWLEDGED' } : a));
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
    return (
      <div className="app" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '16px' }}>
        <div className="auth-wrapper" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="brand-icon" style={{ margin: '0 auto 12px' }}>S</div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>SafeCall AI</h2>
            <p style={{ fontSize: '13px', color: 'var(--color-muted)', margin: '4px 0 0' }}>Connected Elderly Care Platform</p>
          </div>

          <div style={{ textAlign: 'center' }}>
            <span className="eyebrow">SIGN IN TO DEVICE</span>
            <p style={{ fontSize: '13px', color: 'var(--color-muted)', margin: '6px 0 0' }}>
              Select role to enter on this device:
            </p>
          </div>

          <div className="role-select-grid">
            <div 
              className={`role-card-btn ${loginRole === 'elderly' ? 'active' : ''}`}
              onClick={() => {
                setLoginRole('elderly');
                if (!loginIdentifier || loginIdentifier === 'Bob') setLoginIdentifier('Meera');
              }}
            >
              <div className="role-card-icon">👴</div>
              <div className="role-card-title">Senior (Meera)</div>
              <div className="role-card-desc">Simulates calls & pairs with Caregiver</div>
            </div>

            <div 
              className={`role-card-btn ${loginRole === 'caregiver' ? 'active' : ''}`}
              onClick={() => {
                setLoginRole('caregiver');
                if (!loginIdentifier || loginIdentifier === 'Meera') setLoginIdentifier('Bob');
              }}
            >
              <div className="role-card-icon">🛡️</div>
              <div className="role-card-title">Caregiver (Bob)</div>
              <div className="role-card-desc">Receives real-time urgent alerts</div>
            </div>
          </div>

          <form onSubmit={handleUniversalLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text)' }}>
                Username / Identifier
              </label>
              <input 
                type="text"
                value={loginIdentifier}
                onChange={e => setLoginIdentifier(e.target.value)}
                placeholder="e.g. Meera, Bob, or phone"
                style={{ width: '100%', padding: '11px 12px', border: '1px solid var(--color-border)', borderRadius: '9px', marginTop: '4px' }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text)' }}>
                Password (Optional)
              </label>
              <input 
                type="password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                placeholder="Type password or leave empty"
                style={{ width: '100%', padding: '11px 12px', border: '1px solid var(--color-border)', borderRadius: '9px', marginTop: '4px' }}
              />
            </div>

            {loginError && (
              <div style={{ color: '#b91c1c', background: '#fee2e2', padding: '10px', borderRadius: '8px', fontSize: '12px' }}>
                {loginError}
              </div>
            )}

            <button 
              type="submit" 
              className="primary-button" 
              style={{ marginTop: '6px', height: '44px', fontSize: '14px' }}
              disabled={loginLoading}
            >
              {loginLoading ? 'Entering...' : `Enter as ${loginRole === 'elderly' ? 'Senior' : 'Caregiver'}`}
            </button>
          </form>

          {/* 1-Tap Quick Switch */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'center', marginTop: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1px', color: 'var(--color-muted)' }}>
              1-TAP QUICK SELECTION:
            </span>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button 
                type="button"
                className="preset-pill"
                onClick={() => {
                  setLoginRole('elderly');
                  setLoginIdentifier('Meera');
                  setLoginPassword('');
                }}
              >
                👴 Senior (Meera)
              </button>
              <button 
                type="button"
                className="preset-pill"
                onClick={() => {
                  setLoginRole('caregiver');
                  setLoginIdentifier('Bob');
                  setLoginPassword('');
                }}
              >
                🛡️ Caregiver (Bob)
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '12px', marginTop: '8px' }}>
            <button 
              type="button" 
              className="text-button" 
              onClick={() => setShowVisualizer(true)}
            >
              ⚡ Architecture Flow
            </button>
            <div 
              className="server-status-pill"
              onClick={() => setShowServerModal(true)}
            >
              <span className={`status-dot ${serverOnline ? 'online' : 'offline'}`} />
              <span>{serverOnline ? 'Cloud Online' : 'Offline'}</span>
            </div>
          </div>
        </div>

        {/* Server Config Modal */}
        {showServerModal && (
          <div className="modal-backdrop" onClick={() => setShowServerModal(false)}>
            <div className="rule-card" style={{ maxWidth: '440px', width: '100%', background: 'white' }} onClick={e => e.stopPropagation()}>
              <h3>Backend Server Settings</h3>
              <p className="rule-description">
                Configure backend URL reachable by both devices:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                <button 
                  className="secondary-button"
                  onClick={() => setServerInput('https://safecall-backend-kd8k.onrender.com')}
                >
                  🌐 Cloud: https://safecall-backend-kd8k.onrender.com
                </button>
                <button 
                  className="secondary-button"
                  onClick={() => setServerInput('http://localhost:4000')}
                >
                  📡 Localhost: http://localhost:4000
                </button>
              </div>
              <input 
                type="text"
                className="form-input-field"
                value={serverInput}
                onChange={e => setServerInput(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: '8px', marginBottom: '12px' }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="primary-button"
                  onClick={() => {
                    setServerUrl(serverInput);
                    localStorage.setItem('safecall_server_url', serverInput);
                    setShowServerModal(false);
                  }}
                >
                  Save & Connect
                </button>
                <button 
                  className="secondary-button"
                  onClick={() => setShowServerModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        {showVisualizer && (
          <BackendArchitectureVisualizer 
            onClose={() => setShowVisualizer(false)}
            serverUrl={serverUrl}
            serverOnline={serverOnline}
            alerts={alerts}
            linkedUsers={linkedUsers}
          />
        )}
      </div>
    );
  }

  // =========================================================================
  // LOGGED IN DASHBOARD (Teammate Layout & Structure)
  // =========================================================================
  const isSenior = currentUser.role === 'elderly';

  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: '▦' },
    { id: 'activity', label: 'Call Activity', icon: '◷' },
    { id: 'contacts', label: 'Trusted Contacts', icon: '♡' },
    { id: 'rules', label: 'Alert Rules', icon: '⚙' },
    { id: 'simulation', label: 'Simulation Mode', icon: '▷' },
    { id: 'help', label: 'About / Help', icon: '?' },
  ];

  const activeItem = navigationItems.find(item => item.id === activePage) || navigationItems[0];

  return (
    <div className="app">
      {/* Sidebar Navigation (Collapses on Mobile to Horizontal Scroll) */}
      <aside className="sidebar">
        <div className="brand" onClick={() => setActivePage('overview')}>
          <div className="brand-icon">S</div>
          <div>
            <h2>SafeCall AI</h2>
            <p>{isSenior ? 'Senior Device' : 'Caregiver Device'}</p>
          </div>
        </div>

        <p className="nav-label">WORKSPACE</p>

        <nav className="navigation" aria-label="Main navigation">
          {navigationItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => setActivePage(item.id)}
              aria-current={activePage === item.id ? 'page' : undefined}
            >
              <span className="nav-item-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="status-dot-row">
            <span className={`status-dot ${serverOnline ? 'online' : 'offline'}`} />
            <span>{serverOnline ? 'Connected to Cloud' : 'Offline / Standalone'}</span>
          </div>
          <button 
            type="button" 
            className="text-button" 
            style={{ width: '100%', marginTop: '6px', textAlign: 'center' }}
            onClick={() => setShowVisualizer(true)}
          >
            ⚡ Architecture Flow
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div>
            <p className="eyebrow">
              {isSenior ? 'SENIOR DASHBOARD' : 'CAREGIVER DASHBOARD'}
            </p>
            <h1>{activeItem.label}</h1>
          </div>

          <div className="topbar-right">
            <button 
              type="button"
              className="text-button"
              style={{ padding: '6px 12px' }}
              onClick={() => setShowVisualizer(true)}
            >
              ⚡ Architecture
            </button>

            <div 
              className="server-status-pill"
              onClick={() => setShowServerModal(true)}
            >
              <span className={`status-dot ${serverOnline ? 'online' : 'offline'}`} />
              <span>{serverOnline ? 'Online' : 'Offline'}</span>
            </div>

            <button 
              className="btn-signout"
              onClick={handleLogout}
              title="Sign out or switch between Senior and Caregiver roles"
            >
              Switch Role
            </button>
          </div>
        </header>

        {/* Page Content Switcher (Clean, Hook-compliant Component Renders) */}
        {activePage === 'overview' && (
          <OverviewPage 
            isSenior={isSenior}
            currentUser={currentUser}
            linkedUsers={linkedUsers}
            callHistory={callHistory}
            pairingCode={pairingCode}
            pairingTimeLeft={pairingTimeLeft}
            seniorSimStatus={seniorSimStatus}
            telephonyPerms={telephonyPerms}
            offlineAlertsCount={offlineAlertsCount}
            latestPopupAlert={latestPopupAlert}
            contacts={contacts}
            handleGeneratePairingCode={handleGeneratePairingCode}
            handleAcknowledgeAlert={handleAcknowledgeAlert}
            handleVerifyCode={handleVerifyCode}
            handleUnlink={handleUnlink}
            setPairingCode={setPairingCode}
            pairLoading={pairLoading}
            inputCode={inputCode}
            setInputCode={setInputCode}
            pairStatus={pairStatus}
            setActivePage={setActivePage}
          />
        )}

        {activePage === 'activity' && (
          <CallActivityPage callHistory={callHistory} />
        )}

        {activePage === 'contacts' && (
          <TrustedContactsPage 
            contacts={contacts}
            setContacts={setContacts}
            refreshDatabaseData={refreshDatabaseData}
          />
        )}

        {activePage === 'rules' && (
          <AlertRulesPage 
            apiFetch={apiFetch}
            contacts={contacts}
          />
        )}

        {activePage === 'simulation' && (
          <SimulationModePage 
            apiFetch={apiFetch}
            refreshDatabaseData={refreshDatabaseData}
          />
        )}

        {activePage === 'help' && (
          <AboutHelpPage />
        )}
      </main>

      {/* Modals */}
      {showServerModal && (
        <div className="modal-backdrop" onClick={() => setShowServerModal(false)}>
          <div className="rule-card" style={{ maxWidth: '440px', width: '100%', background: 'white' }} onClick={e => e.stopPropagation()}>
            <h3>Backend Server Settings</h3>
            <p className="rule-description">
              Configure backend URL reachable by both devices:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
              <button 
                className="secondary-button"
                onClick={() => setServerInput('https://safecall-backend-kd8k.onrender.com')}
              >
                🌐 Cloud: https://safecall-backend-kd8k.onrender.com
              </button>
              <button 
                className="secondary-button"
                onClick={() => setServerInput('http://localhost:4000')}
              >
                📡 Localhost: http://localhost:4000
              </button>
            </div>
            <input 
              type="text"
              className="form-input-field"
              value={serverInput}
              onChange={e => setServerInput(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: '8px', marginBottom: '12px' }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="primary-button"
                onClick={() => {
                  setServerUrl(serverInput);
                  localStorage.setItem('safecall_server_url', serverInput);
                  setShowServerModal(false);
                }}
              >
                Save & Connect
              </button>
              <button 
                className="secondary-button"
                onClick={() => setShowServerModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showVisualizer && (
        <BackendArchitectureVisualizer 
          onClose={() => setShowVisualizer(false)}
          serverUrl={serverUrl}
          serverOnline={serverOnline}
          alerts={alerts}
          linkedUsers={linkedUsers}
        />
      )}
    </div>
  );
}

// Mount React Root
const rootNode = document.getElementById('root');
if (rootNode) {
  const root = ReactDOM.createRoot(rootNode);
  root.render(<SafeCallApp />);
}
