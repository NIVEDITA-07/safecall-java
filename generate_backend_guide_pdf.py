import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 750, "SafeCall AI — Full Backend Architecture & Engineering Guide")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(54, 742, 558, 742)
            
        # Footer
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 36, page_str)
        self.drawString(54, 36, "CONFIDENTIAL & PROPRIETARY — SAFECALL AI ARCHITECTURE")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(54, 48, 558, 48)
        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom styles
    c_primary = colors.HexColor("#123D3A")
    c_secondary = colors.HexColor("#1E5652")
    c_accent = colors.HexColor("#0D9488")
    c_dark = colors.HexColor("#0F172A")
    c_muted = colors.HexColor("#475569")
    c_bg_light = colors.HexColor("#F8FAFC")
    c_card_border = colors.HexColor("#E2E8F0")

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=c_primary,
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=c_accent,
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=c_primary,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=c_secondary,
        spaceBefore=10,
        spaceAfter=5,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=c_dark,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=c_dark,
        leftIndent=14,
        spaceAfter=4
    )

    code_style = ParagraphStyle(
        'Code_Custom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#0F172A")
    )

    callout_style = ParagraphStyle(
        'Callout_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9,
        leading=13,
        textColor=c_secondary
    )

    story = []

    # Title Block
    story.append(Paragraph("SafeCall AI", title_style))
    story.append(Paragraph("Complete Backend Architecture, Native Classes & Real-Time Alert Pipeline Guide", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=c_primary, spaceBefore=0, spaceAfter=12))

    # Meta table
    meta_data = [
        [Paragraph("<b>System Name:</b> SafeCall AI", body_style), Paragraph("<b>Target Environment:</b> Android Native (Java 17 / API 34)", body_style)],
        [Paragraph("<b>Scoring Model:</b> 4-Factor WeightedRuleEngine", body_style), Paragraph("<b>Database:</b> Embedded SQLite + Cloud Token Sync", body_style)],
        [Paragraph("<b>Author / Project:</b> SafeCall Engineering Team", body_style), Paragraph("<b>Release Version:</b> Production v2.0", body_style)]
    ]
    meta_table = Table(meta_data, colWidths=[250, 254])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F0FDF4")),
        ('BORDER', (0,0), (-1,-1), 1, colors.HexColor("#BBF7D0")),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 12))

    # SECTION 1
    story.append(Paragraph("1. Executive Architecture Overview", h1_style))
    story.append(Paragraph(
        "SafeCall AI is a dual-tier connected healthcare platform built specifically for elderly users living independently. "
        "Unlike generic cloud-dependent solutions, SafeCall AI executes its core telemetry processing and urgency classification "
        "<b>directly on the mobile handset</b> using native Android operating system facilities, an embedded SQLite database, and a deterministic "
        "Java rule engine. Sensitive call records and personal phone numbers never leave the user's phone for remote AI inference.",
        body_style
    ))
    story.append(Paragraph(
        "<b>Core architectural pillars:</b>", body_style
    ))
    story.append(Paragraph("&bull; <b>Zero ML Hallucination:</b> Urgency scores (0–100) are evaluated using a deterministic, 100% auditable mathematical rule engine rather than unpredictable deep learning models.", bullet_style))
    story.append(Paragraph("&bull; <b>Zero-Latency Telephony Interception:</b> Intercepts native telephony broadcasts via Android OS <code>TelephonyManager</code> within milliseconds of an incoming call ring.", bullet_style))
    story.append(Paragraph("&bull; <b>Multi-Gate Anomaly Pipeline:</b> Enforces a 3-gate filter (accumulated frequency, 60s grace period, and score severity) to virtually eliminate false alarms.", bullet_style))
    story.append(Paragraph("&bull; <b>Dual-Mode Operation:</b> Full offline resilience with local SQLite queueing, seamlessly syncing with paired Caregivers via Render cloud backend and Firebase Cloud Messaging (FCM).", bullet_style))

    story.append(Spacer(1, 8))

    # SECTION 2
    story.append(Paragraph("2. Device Pairing Protocol & Multi-Device Security", h1_style))
    story.append(Paragraph(
        "Device pairing links an elderly user's phone with one or more designated caregiver smartphones through a cryptographic, "
        "ephemeral token handshake. This prevents unauthorized surveillance and guarantees server-side consent.",
        body_style
    ))

    pairing_steps = [
        [Paragraph("<b>Step</b>", body_style), Paragraph("<b>Actor</b>", body_style), Paragraph("<b>Protocol & Technical Operation</b>", body_style)],
        [Paragraph("1. Code Generation", body_style), Paragraph("Senior Device", body_style), Paragraph("Senior taps <i>Generate 6-Character Pairing Code</i>. The phone issues a <code>POST /api/pairing/generate</code> request. Backend generates a cryptographically secure 6-character uppercase alphanumeric code (e.g. <code>SWFTUB</code>) with a strict 300-second (5 min) Time-To-Live (TTL).", body_style)],
        [Paragraph("2. Real-Time Countdown", body_style), Paragraph("Senior Device", body_style), Paragraph("The 6-char code is rendered in the UI with a live 1-second countdown timer. If already connected, the Senior can tap <i>Re-generate New Code</i> anytime to link an additional caregiver or reconnect.", body_style)],
        [Paragraph("3. Token Verification", body_style), Paragraph("Caregiver Device", body_style), Paragraph("Caregiver inputs the 6-character code under <i>Pair Senior</i> and taps <i>Connect</i>. Device sends <code>POST /api/pairing/verify</code> with the Caregiver's Bearer JWT.", body_style)],
        [Paragraph("4. Link Establishment", body_style), Paragraph("Backend Engine", body_style), Paragraph("Backend validates token, ensures code is unexpired, matches Senior ID to Caregiver ID, and creates an active relationship record. Returns confirmed pairing payload.", body_style)],
        [Paragraph("5. State Synchronization", body_style), Paragraph("Both Devices", body_style), Paragraph("Senior device's background polling loop detects the new link, plays a soft confirmation chime, and displays the Caregiver under <i>Active Vigilance</i> with an <i>Unlink</i> option.", body_style)]
    ]
    t_pair = Table(pairing_steps, colWidths=[100, 90, 314])
    t_pair.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('BORDER', (0,0), (-1,-1), 0.5, c_card_border),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_light]),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_pair)
    story.append(Spacer(1, 10))

    # SECTION 3
    story.append(Paragraph("3. Android Telephony Broadcast Interception & Finite State Machine (FSM)", h1_style))
    story.append(Paragraph(
        "Real-time incoming call detection is powered by <code>SafeCallPhoneStateReceiver.java</code>. "
        "The receiver models the call lifecycle as an explicit <b>Finite State Machine (FSM)</b> transitioning across "
        "Android OS telephony states: <code>CALL_STATE_IDLE</code>, <code>CALL_STATE_RINGING</code>, and <code>CALL_STATE_OFFHOOK</code>.",
        body_style
    ))

    fsm_data = [
        [Paragraph("<b>Current State</b>", body_style), Paragraph("<b>Trigger / Broadcast</b>", body_style), Paragraph("<b>Next State</b>", body_style), Paragraph("<b>Engine Action Executed</b>", body_style)],
        [Paragraph("IDLE", body_style), Paragraph("EXTRA_STATE_RINGING", body_style), Paragraph("RINGING", body_style), Paragraph("Captures incoming phone number, normalizes E.164 format, records <code>ringStartTime = currentTimeMillis()</code>.", body_style)],
        [Paragraph("RINGING", body_style), Paragraph("EXTRA_STATE_IDLE", body_style), Paragraph("IDLE (MISSED)", body_style), Paragraph("Duration = 0s. Flags call as <b>MISSED</b>. Dispatches call to <code>SequenceTracker</code> and <code>WeightedRuleEngine</code> in background thread.", body_style)],
        [Paragraph("RINGING", body_style), Paragraph("EXTRA_STATE_OFFHOOK", body_style), Paragraph("OFFHOOK (ANSWERED)", body_style), Paragraph("Senior picked up the call. Sets <code>callAnsweredTime = currentTimeMillis()</code>. Cancels any active grace-period timers.", body_style)],
        [Paragraph("OFFHOOK", body_style), Paragraph("EXTRA_STATE_IDLE", body_style), Paragraph("IDLE (TERMINATED)", body_style), Paragraph("Call ended. Computes talk duration: <code>(now - callAnsweredTime) / 1000</code>. Logs answered record with neutral urgency score.", body_style)]
    ]
    t_fsm = Table(fsm_data, colWidths=[80, 110, 100, 214])
    t_fsm.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_secondary),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('BORDER', (0,0), (-1,-1), 0.5, c_card_border),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_light]),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_fsm)
    story.append(Spacer(1, 10))

    # SECTION 4
    story.append(Paragraph("4. Complete Breakdown of Core Android Backend Classes", h1_style))
    story.append(Paragraph(
        "The SafeCall AI Java codebase follows strict Object-Oriented principles, separating concerns across "
        "Telephony Receivers, Repositories (DAO), Evaluation Engines, Anomaly Trackers, and Native WebView Bridges.",
        body_style
    ))

    classes_data = [
        [Paragraph("<b>Class Name & Package</b>", body_style), Paragraph("<b>Role, Responsibility & Architectural Pattern</b>", body_style)],
        [
            Paragraph("<b>SafeCallPhoneStateReceiver</b><br/><code>com.safecall.receiver</code>", body_style),
            Paragraph("<b>BroadcastReceiver (Observer Pattern):</b> Intercepts <code>android.intent.action.PHONE_STATE</code> and <code>NEW_OUTGOING_CALL</code>. Contains the FSM logic to distinguish missed from answered calls. Sanitizes telephone strings and offloads processing to a dedicated background worker thread to prevent Android ANR (Application Not Responding) timeouts.", body_style)
        ],
        [
            Paragraph("<b>WeightedRuleEngine</b><br/><code>com.safecall.engine</code>", body_style),
            Paragraph("<b>Pure Domain Service (Strategy Pattern):</b> Evaluates a <code>CallContext</code> object against the 4 context factors (Identity max 25, Frequency max 35, Timing max 10, Anomaly max 30). Produces an immutable <code>UrgencyResult</code> containing the score (0–100), urgency Level enum (LOW, MEDIUM, HIGH), and a human-readable explanation.", body_style)
        ],
        [
            Paragraph("<b>SequenceTracker</b><br/><code>com.safecall.engine</code>", body_style),
            Paragraph("<b>Multi-Gate Anomaly Pipeline:</b> Implements the 3-gate non-response anomaly workflow. Accumulates missed call sequences, initiates a 60-second grace period timer upon 4 consecutive missed calls, and aborts if the elder answers, calls back, or interacts with the handset.", body_style)
        ],
        [
            Paragraph("<b>FamilyAlertManager</b><br/><code>com.safecall.engine</code>", body_style),
            Paragraph("<b>Policy & Dispatch Coordinator:</b> Manages threshold filtering (standard 80/100), quiet-hours evaluation, and cooldown throttling (preventing repeated spam notifications within 10 minutes). Serializes verified alerts for FCM transmission or offline queueing.", body_style)
        ],
        [
            Paragraph("<b>CallRepository & CallDatabaseHelper</b><br/><code>com.safecall.data</code>", body_style),
            Paragraph("<b>Data Access Layer (Repository Pattern):</b> Wraps an Android SQLite database containing three core tables: <code>contacts</code>, <code>call_history</code>, and <code>pending_alerts</code>. Guarantees ACID compliance, thread-safe access, and fast query execution through indexed telephone columns.", body_style)
        ],
        [
            Paragraph("<b>SafeCallNative</b><br/><code>com.safecall.bridge</code>", body_style),
            Paragraph("<b>JavaScript Interface Bridge:</b> Exposes privileged native methods to the React frontend running inside Android WebView: <code>getCallHistory()</code>, <code>getContacts()</code>, <code>saveContact()</code>, <code>saveAlertSettings()</code>, <code>launchDialler()</code>, <code>vibrate()</code>, and <code>triggerOfflineSync()</code>.", body_style)
        ],
        [
            Paragraph("<b>MainActivity</b><br/><code>com.safecall</code>", body_style),
            Paragraph("<b>Host Application Entry Point:</b> Configures WebView security settings (disables unrestricted universal access, blocks mixed content, restricts bridge access to local assets), handles Android runtime permissions (<code>READ_PHONE_STATE</code>, <code>READ_CALL_LOG</code>), and manages app lifecycle.", body_style)
        ]
    ]

    t_classes = Table(classes_data, colWidths=[160, 344])
    t_classes.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('BORDER', (0,0), (-1,-1), 0.5, c_card_border),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_light]),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_classes)
    story.append(Spacer(1, 10))

    # SECTION 5
    story.append(Paragraph("5. The 4/4 Engine Check System & Mathematical Model", h1_style))
    story.append(Paragraph(
        "The SafeCall AI <b>4/4 Engine Check System</b> deterministically evaluates every incoming phone call against four independent, "
        "additive check gates implemented in <code>WeightedRuleEngine.java</code>. Every call executes all 4 checks in sequence without skipping: "
        "Check 1 (Caller Identity Gate, 25 pts), Check 2 (Frequency Window Gate, 35 pts), Check 3 (Timing Context Gate, 10 pts), and "
        "Check 4 (Historical Baseline Gate, 30 pts). The maximum sum is strictly bounded: 25 + 35 + 10 + 30 = 100 points.",
        body_style
    ))

    formula_box = [
        [Paragraph("<b>Urgency Score Formula:</b><br/><code>Score = Min(100, W_Identity + W_Frequency + W_Timing + W_Anomaly)</code>", body_style)]
    ]
    t_formula = Table(formula_box, colWidths=[504])
    t_formula.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#EFF6FF")),
        ('BORDER', (0,0), (-1,-1), 1, colors.HexColor("#93C5FD")),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_formula)
    story.append(Spacer(1, 8))

    factors_table = [
        [Paragraph("<b>Factor & Weight</b>", body_style), Paragraph("<b>Trigger Condition in Java Rule Engine</b>", body_style), Paragraph("<b>Allocated Pts</b>", body_style), Paragraph("<b>Rationale & Clinical Justification</b>", body_style)],
        [
            Paragraph("<b>1. Caller Identity</b><br/>(Max 25 pts)", body_style),
            Paragraph("&bull; Priority == EMERGENCY<br/>&bull; Priority == TRUSTED<br/>&bull; Priority == NORMAL / UNKNOWN", body_style),
            Paragraph("<b>+25 pts</b><br/><b>+15 pts</b><br/>+0 pts", body_style),
            Paragraph("Designated doctors, hospitals, and primary family contacts carry elevated baseline urgency over unfamiliar numbers.", body_style)
        ],
        [
            Paragraph("<b>2. Call Frequency</b><br/>(Max 35 pts)", body_style),
            Paragraph("&bull; 4+ calls in 15m window<br/>&bull; 3 calls in 15m window<br/>&bull; 2 calls in 15m window<br/>&bull; 1 call in 15m window", body_style),
            Paragraph("<b>+35 pts</b><br/><b>+22 pts</b><br/><b>+10 pts</b><br/>+0 pts", body_style),
            Paragraph("Rapid, repeated redials within a narrow 15-minute window strongly indicate an urgent situation requiring immediate attention.", body_style)
        ],
        [
            Paragraph("<b>3. Timing & Context</b><br/>(Max 10 pts)", body_style),
            Paragraph("&bull; Late-Night (23:00–05:00) with repeated or emergency caller<br/>&bull; Late-Night standalone<br/>&bull; Daytime (06:00–22:59)", body_style),
            Paragraph("<b>+10 pts</b><br/><br/><b>+5 pts</b><br/>+0 pts", body_style),
            Paragraph("Middle-of-the-night calls from family members or doctors are statistically rare and warrant instant escalation.", body_style)
        ],
        [
            Paragraph("<b>4. Historical Anomaly</b><br/>(Max 30 pts)", body_style),
            Paragraph("&bull; &ge;50% unanswered rate (valid &ge; 3)<br/>&bull; &ge;33% unanswered rate (valid &ge; 3)<br/>&bull; Insufficient history / normal", body_style),
            Paragraph("<b>+30 pts</b><br/><b>+15 pts</b><br/>+0 pts", body_style),
            Paragraph("Compares against the contact's historical baseline. When normally answered callers go unanswered, it indicates a potential senior incapacitation.", body_style)
        ]
    ]

    t_factors = Table(factors_table, colWidths=[110, 160, 64, 170])
    t_factors.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('BORDER', (0,0), (-1,-1), 0.5, c_card_border),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_light]),
        ('PADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_factors)
    story.append(Spacer(1, 10))

    # SECTION 6
    story.append(Paragraph("6. How Real-Time & Offline Alerts Are Dispatched", h1_style))
    story.append(Paragraph(
        "Alert dispatch is fully automated. When a real call or high-risk simulation event triggers an urgency score &ge; 80/100, "
        "the alert travels through the dual-mode transmission pipeline:",
        body_style
    ))

    story.append(Paragraph("<b>A. Online Real-Time Cloud Pipeline:</b>", h2_style))
    story.append(Paragraph(
        "1. <b>Payload Construction:</b> The Android engine builds a JSON payload containing <code>idempotentId</code>, <code>callerName</code>, "
        "<code>callerPhone</code>, <code>score</code>, <code>level: HIGH</code>, <code>explanation</code>, and <code>timestamp</code>.<br/>"
        "2. <b>Cloud Transmission:</b> Dispatches a secure <code>POST /api/alerts/trigger</code> request to the Render backend.<br/>"
        "3. <b>Caregiver Notification:</b> The backend authenticates the sender, verifies the active paired relationship, and broadcasts an FCM Push Notification "
        "to the Caregiver's handset. If the Caregiver dashboard is active, it sounds a soft warning chime and presents an interactive Alert Banner.<br/>"
        "4. <b>Acknowledgment:</b> Caregiver taps <i>Acknowledge Alert</i>, issuing <code>POST /api/alerts/acknowledge</code>, updating the audit trail across both devices.",
        body_style
    ))

    story.append(Paragraph("<b>B. Resilient Offline SQLite Queuing Pipeline:</b>", h2_style))
    story.append(Paragraph(
        "If the Senior's device has no internet connectivity (airplane mode, rural signal loss), SafeCall AI ensures <b>zero alert loss</b>:<br/>"
        "1. The alert is saved to the SQLite table <code>pending_alerts</code> with status <code>QUEUED</code>.<br/>"
        "2. An in-app warning badge indicates: <i>⚠️ N offline alert(s) queued</i>.<br/>"
        "3. The native service registers an Android <code>ConnectivityManager.NetworkCallback</code>. As soon as cellular data or Wi-Fi is restored, "
        "<code>triggerOfflineSync()</code> flushes all queued records to the cloud backend with idempotent deduplication.",
        body_style
    ))
    story.append(Spacer(1, 10))

    # SECTION 7
    story.append(Paragraph("7. Comprehensive Viva Voce & Oral Defense Reference", h1_style))
    viva_qa = [
        [Paragraph("<b>Viva Examiner Question</b>", body_style), Paragraph("<b>Definitive Architectural Answer</b>", body_style)],
        [
            Paragraph("<b>Q1: Why did you choose a Weighted Rule Engine over Deep Learning / LLMs?</b>", body_style),
            Paragraph("In emergency elderly healthcare, AI black-boxes are hazardous due to non-deterministic hallucinations, latency, high battery drain, and lack of legal auditability. The 4-factor additive model calculates urgency deterministically in &lt;1 ms on low-end hardware with 100% explainable justifications for emergency responders.", body_style)
        ],
        [
            Paragraph("<b>Q2: How do you prevent false alarms from waking caregivers at night?</b>", body_style),
            Paragraph("Through a 3-gate filter in <code>SequenceTracker.java</code>: Gate 1 requires 4+ consecutive missed calls in 15 mins. Gate 2 enforces a 60-second grace period (cancelling if senior answers or dials out). Gate 3 checks whether severity score &ge; 80/100 and verifies against caregiver quiet-hour schedules.", body_style)
        ],
        [
            Paragraph("<b>Q3: How are user call privacy and GDPR / HIPAA compliance handled?</b>", body_style),
            Paragraph("SafeCall AI does NOT record, stream, or transcribe audio conversations. Telemetry evaluation is performed solely on call metadata (timestamps, caller identity, frequency). All call logs are stored in on-device SQLite, not in third-party clouds.", body_style)
        ],
        [
            Paragraph("<b>Q4: What happens if the caregiver's phone is unreachable?</b>", body_style),
            Paragraph("The cloud backend queues the push notification via Firebase Cloud Messaging (FCM) High-Priority channel, which triggers persistent heads-up notifications that bypass Android Doze mode and ringtone mutes.", body_style)
        ]
    ]

    t_viva = Table(viva_qa, colWidths=[160, 344])
    t_viva.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_secondary),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('BORDER', (0,0), (-1,-1), 0.5, c_card_border),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_light]),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_viva)

    # Build document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF successfully generated at: {filename}")

if __name__ == '__main__':
    out_dir_1 = "D:/safecall-dashboard/SafeCall_AI_Backend_Architecture_Guide.pdf"
    out_dir_2 = "d:/safecall-java/SafeCall_AI_Backend_Architecture_Guide.pdf"
    build_pdf(out_dir_1)
    build_pdf(out_dir_2)
