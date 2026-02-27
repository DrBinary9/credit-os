// ═══════════════════════════════════════════════
//  Credit-OS Chat + Guided Wizard Script
// ═══════════════════════════════════════════════

// ── DOM refs ─────────────────────────────────
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const typingIndicator = document.getElementById("typingIndicator");
const charCount = document.getElementById("charCount");
const resetBtn = document.getElementById("resetChat");
const chatInputArea = document.getElementById("chatInputArea");
const wizardInputArea = document.getElementById("wizardInputArea");
const wizardOptions = document.getElementById("wizardOptions");
const wizardTextInput = document.getElementById("wizardTextInput");
const wizardSlider = document.getElementById("wizardSliderArea");
const wizardNextBtn = document.getElementById("wizardNextBtn");
const sliderNextBtn = document.getElementById("sliderNextBtn");
const wizardProgressBar = document.getElementById("wizardProgressBar");
const wpbFill = document.getElementById("wpbFill");
const wpbStep = document.getElementById("wpbStep");
const wizardMeta = document.getElementById("wizardMeta");
const chatTitle = document.getElementById("chatTitle");
const startWizardBtn = document.getElementById("startWizard");
// ── Skip ref ─────────────────────────────────
const wizardSkipBtn = document.getElementById("wizardSkipBtn");

// ── Wizard step definitions ───────────────────
const STEPS = [
  {
    id: "age",
    icon: "👤",
    question: "What is your age?",
    hint: "Minimum: 21 years. Maximum at maturity: Salaried → 60 | Self-employed → 65",
    type: "number",
    min: 18, max: 80,
    unit: "years",
    placeholder: "e.g. 30",
    validate: v => v >= 21 && v <= 80 ? null : "Age must be between 21 and 80 years."
  },
  {
    id: "employment",
    icon: "💼",
    question: "What is your employment type?",
    hint: "Determines income requirements and work experience criteria.",
    type: "options",
    options: ["Salaried", "Self-employed", "Professional (Self-employed)"]
  },
  {
    id: "income",
    icon: "💰",
    question: "What is your monthly income?",
    hint: "Min: ₹30,000/month (Salaried) | ₹41,667/month equiv. (Self-employed ≥ ₹5L/yr)",
    type: "number",
    min: 0, max: null,
    unit: "₹/month",
    placeholder: "e.g. 55000",
    validate: v => v >= 10000 ? null : "Please enter a realistic monthly income."
  },
  {
    id: "credit_score",
    icon: "📊",
    question: "What is your CIBIL credit score?",
    hint: "Score bands: < 650 → Reject | 650–699 → Manual Review | 700–749 → Standard Review | ≥ 750 → Auto Approval",
    type: "slider",
    min: 300, max: 900
  },
  {
    id: "existing_emi",
    icon: "🏦",
    question: "What is your total existing monthly EMI?",
    hint: "All current credit EMIs (excluding this limit). FOIR must stay below 60% of income (65% for high income).",
    type: "number",
    min: 0, max: null,
    unit: "₹/month",
    placeholder: "Enter 0 if no existing EMIs",
    validate: v => v >= 0 ? null : "EMI cannot be negative."
  },
  {
    id: "loan_amount",
    icon: "💳",
    question: "How much credit limit are you requesting?",
    hint: "Min: ₹50,000 | Max: ₹25,00,000 (also subject to income multiplier and exposure cap)",
    type: "number",
    min: 50000, max: 2500000,
    unit: "₹",
    placeholder: "e.g. 500000",
    validate: v => v >= 50000 && v <= 2500000 ? null : "Requested limit must be between ₹50,000 and ₹25,00,000."
  },
  {
    id: "tenure",
    icon: "📅",
    question: "What repayment tenure do you prefer?",
    hint: "Min: 12 months | Max: 60 months (also constrained by age at maturity)",
    type: "options",
    options: ["12 months", "18 months", "24 months", "36 months", "48 months", "60 months"]
  },
  {
    id: "city",
    icon: "📍",
    question: "Which city/location are you applying from?",
    hint: "Applications from negative geography zones are rejected per location exclusion rules.",
    type: "text",
    placeholder: "e.g. Mumbai",
    validate: v => v.trim().length > 1 ? null : "Please enter your city."
  },
  {
    id: "kyc",
    icon: "📄",
    question: "Is your KYC (Know Your Customer) process completed?",
    hint: "RBI mandates KYC completion before any financial relationship or credit disbursement.",
    type: "options",
    options: ["✅ Yes — Fully Completed", "❌ No — Not Started", "⏳ Pending — In Progress", "⚠️ Invalid — Rejected / Flagged"]
  },
  {
    id: "additional_info",
    icon: "💬",
    question: "Anything else you'd like to tell us?",
    hint: "Optional: mention any special circumstances, existing credit lines with other lenders, employment gaps, or anything else relevant to your application.",
    type: "text",
    placeholder: "e.g. I have a co-applicant, or I recently changed jobs…",
    validate: null
  }
];

// ── Wizard state ──────────────────────────────
let wizardActive = false;
let wizardStep = 0;
let wizardAnswers = {};

// ── Normal chat helpers ────────────────────────
chatInput && chatInput.addEventListener("input", () => {
  const len = chatInput.value.length;
  charCount.textContent = `${len} / 2000`;
  charCount.style.color = len > 1800 ? "#ef4444" : "";
});

chatInput && chatInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

sendBtn && sendBtn.addEventListener("click", sendMessage);

async function sendMessage(overrideText) {
  const text = overrideText || (chatInput ? chatInput.value.trim() : "");
  if (!text || sendBtn.disabled) return;

  appendUserMsg(text);
  if (chatInput && !overrideText) chatInput.value = "";
  if (charCount) charCount.textContent = "0 / 2000";
  sendBtn.disabled = true;
  typingIndicator.style.display = "flex";
  scrollBottom();

  try {
    const res = await fetch("/chat/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text })
    });
    const data = await res.json();
    typingIndicator.style.display = "none";

    if (data.success) appendAgentMsg(data.reply, data.parsed);
    else appendAgentMsg("❌ Error: " + (data.error || "Something went wrong"), null);
  } catch (err) {
    typingIndicator.style.display = "none";
    appendAgentMsg("❌ Network error. Please try again.", null);
  } finally {
    sendBtn.disabled = false;
    scrollBottom();
  }
}

// ── Wizard start ──────────────────────────────
startWizardBtn && startWizardBtn.addEventListener("click", () => {
  startWizard();
});

// Skip button
wizardSkipBtn && wizardSkipBtn.addEventListener("click", () => {
  submitAnswer("", true);
});

function startWizard() {
  wizardActive = true;
  wizardStep = 0;
  wizardAnswers = {};

  // Swap UI
  chatInputArea.style.display = "none";
  wizardInputArea.style.display = "block";
  wizardProgressBar.style.display = "block";
  chatTitle.textContent = "Guided Credit Evaluation";
  startWizardBtn.disabled = true;
  startWizardBtn.textContent = "In progress...";

  // Intro bubble
  appendAgentBubble(
    `🧭 <strong>Guided Credit Evaluation Started!</strong><br>` +
    `I'll ask you <strong>${STEPS.length} questions</strong> about your application — answer each one or skip it using the button below. ` +
    `Once done, I'll evaluate your application using credit policy and RBI compliance rules.`
  );

  setTimeout(() => askStep(0), 600);
}

function askStep(idx) {
  const step = STEPS[idx];
  updateProgress(idx);

  // Post question as agent bubble
  appendAgentBubble(
    `<div class="wiz-q-num">Question ${idx + 1} of ${STEPS.length}</div>` +
    `<div class="wiz-q-icon">${step.icon}</div>` +
    `<div class="wiz-q-text">${step.question}</div>` +
    `<div class="wiz-q-hint">${step.hint}</div>`
  );

  // Show appropriate input control
  renderStepControl(step);
  // Double rAF ensures scroll happens after browser paint
  requestAnimationFrame(() => requestAnimationFrame(() => scrollBottom()));
}

function renderStepControl(step) {
  // Hide all controls first
  wizardOptions.innerHTML = "";
  wizardTextInput.style.display = "none";
  wizardSlider.style.display = "none";
  wizardOptions.style.display = "none";

  wizardMeta.innerHTML = `<span class="wiz-meta-icon">${step.icon}</span> ${step.question}`;

  if (step.type === "options") {
    wizardOptions.style.display = "flex";
    step.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "wizard-opt-btn";
      btn.textContent = opt;
      btn.addEventListener("click", () => selectOption(opt));
      wizardOptions.appendChild(btn);
    });

  } else if (step.type === "slider") {
    wizardSlider.style.display = "block";
    const slider = document.getElementById("scoreSlider");
    slider.value = 700;
    updateScoreDisplay(700);
    slider.oninput = () => updateScoreDisplay(parseInt(slider.value));
    sliderNextBtn.onclick = () => {
      submitAnswer(String(slider.value));
    };

  } else {
    // number or text
    wizardTextInput.style.display = "block";
    const field = document.getElementById("wizardNumberField");
    const unitEl = document.getElementById("wizardUnit");
    const hintEl = document.getElementById("wizardInputHint");

    field.type = step.type === "number" ? "number" : "text";
    field.placeholder = step.placeholder || "";
    field.min = step.min != null ? step.min : "";
    field.max = step.max != null ? step.max : "";
    field.value = "";
    unitEl.textContent = step.unit || "";
    hintEl.textContent = step.hint;

    field.focus();

    const go = () => {
      const rawVal = field.value.trim();
      const numVal = step.type === "number" ? parseFloat(rawVal) : rawVal;
      if (step.validate) {
        const err = step.validate(numVal);
        if (err) { hintEl.textContent = "⚠ " + err; hintEl.style.color = "#fca5a5"; return; }
      }
      hintEl.style.color = "";
      submitAnswer(String(rawVal));
    };

    wizardNextBtn.onclick = go;
    field.onkeydown = e => { if (e.key === "Enter") go(); };
  }
}

function selectOption(value) {
  submitAnswer(value);
}

function submitAnswer(value, isSkip = false) {
  const step = STEPS[wizardStep];

  if (isSkip) {
    wizardAnswers[step.id] = "";
    appendUserMsg(`${step.icon} Skipped`);
  } else {
    wizardAnswers[step.id] = value;
    appendUserMsg(`${step.icon} ${value}`);
  }

  const next = wizardStep + 1;
  if (next < STEPS.length) {
    wizardStep = next;
    setTimeout(() => askStep(next), 450);
  } else {
    finishWizard();
  }
  scrollBottom();
}

function finishWizard() {
  wizardActive = false;
  wizardInputArea.style.display = "none";
  wizardProgressBar.style.display = "none";
  chatTitle.textContent = "Credit Evaluation Assistant";

  // Show summary card as agent bubble
  const a = wizardAnswers;
  const summaryHtml = buildSummaryCard(a);
  appendAgentBubble(summaryHtml);

  // Build structured prompt → send to Bedrock
  const prompt = buildPromptFromWizard(a);

  // Short delay then send
  setTimeout(() => {
    sendBtn.disabled = true;
    typingIndicator.style.display = "flex";
    scrollBottom();
    fetch("/chat/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: prompt })
    })
      .then(r => r.json())
      .then(data => {
        typingIndicator.style.display = "none";
        if (data.success) appendAgentMsg(data.reply, data.parsed);
        else appendAgentMsg("❌ Error: " + (data.error || "Something went wrong"), null);
      })
      .catch(() => {
        typingIndicator.style.display = "none";
        appendAgentMsg("❌ Network error. Contact administrator.", null);
      })
      .finally(() => {
        sendBtn.disabled = false;
        chatInputArea.style.display = "block";
        startWizardBtn.disabled = false;
        startWizardBtn.textContent = "Start ↗";
        scrollBottom();
      });
  }, 800);
}

function buildPromptFromWizard(a) {
  const fmt = (v) => (v && v.trim()) ? v : "Not provided (skipped)";
  const fmtMoney = (v) => (v && v.trim()) ? `₹${Number(v).toLocaleString("en-IN")}` : "Not provided (skipped)";

  const lines = [
    `Credit Application Evaluation Request:`,
    `- Applicant Age: ${fmt(a.age)} years`,
    `- Employment Type: ${fmt(a.employment)}`,
    `- Monthly Income: ${fmtMoney(a.income)}`,
    `- CIBIL Credit Score: ${fmt(a.credit_score)}`,
    `- Existing Monthly EMI Obligations: ${fmtMoney(a.existing_emi)}`,
    `- Requested Credit Amount: ${fmtMoney(a.loan_amount)}`,
    `- Preferred Repayment Tenure: ${fmt(a.tenure)}`,
    `- Applicant Location: ${fmt(a.city)}`,
    `- KYC Status: ${fmt(a.kyc)}`,
    `- Citizenship: Indian`,
    `- Fraud Flag / DPD / Write-offs: None declared`,
  ];

  if (a.additional_info && a.additional_info.trim()) {
    lines.push(`- Additional Information from Applicant: "${a.additional_info.trim()}"`);
  }

  lines.push(``);
  lines.push(
    `Please evaluate this application against the full credit policy and RBI compliance guidelines. ` +
    `Return a structured JSON response with: decision_summary, credit_decision, compliance_status, ` +
    `final_decision, violations, applied_rules, policy_version, and explanation.`
  );

  return lines.join("\n");
}

function buildSummaryCard(a) {
  const score = parseInt(a.credit_score || 0);
  const scoreBand = score >= 750 ? { label: "Auto Approval", cls: "sb-green" } :
    score >= 700 ? { label: "Standard Review", cls: "sb-yellow" } :
      score >= 650 ? { label: "Manual Review", cls: "sb-orange" } :
        { label: "Reject Zone", cls: "sb-red" };

  const foir = a.income > 0
    ? Math.round((parseInt(a.existing_emi || 0) / parseInt(a.income)) * 100)
    : 0;

  return `
  <div class="wiz-summary">
    <div class="wiz-summary-title">📋 Application Summary — Sending to Agent now…</div>
    <div class="wiz-summary-grid">
      <div class="wsb wsb-blue"><span class="wsb-label">Age</span><span class="wsb-val">${escapeHtml(a.age)} yrs</span></div>
      <div class="wsb wsb-purple"><span class="wsb-label">Employment</span><span class="wsb-val">${escapeHtml((a.employment || "").split(" ")[0])}</span></div>
      <div class="wsb wsb-blue"><span class="wsb-label">Monthly Income</span><span class="wsb-val">₹${Number(a.income).toLocaleString("en-IN")}</span></div>
      <div class="wsb ${scoreBand.cls}"><span class="wsb-label">Credit Score</span><span class="wsb-val">${escapeHtml(a.credit_score)} <small>${scoreBand.label}</small></span></div>
      <div class="wsb wsb-blue"><span class="wsb-label">Existing EMI</span><span class="wsb-val">₹${Number(a.existing_emi).toLocaleString("en-IN")}/mo</span></div>
      <div class="wsb wsb-purple"><span class="wsb-label">FOIR (current)</span><span class="wsb-val">${foir}%</span></div>
      <div class="wsb wsb-blue"><span class="wsb-label">Credit Requested</span><span class="wsb-val">₹${Number(a.loan_amount).toLocaleString("en-IN")}</span></div>
      <div class="wsb wsb-blue"><span class="wsb-label">Tenure</span><span class="wsb-val">${escapeHtml(a.tenure)}</span></div>
      <div class="wsb wsb-purple"><span class="wsb-label">Location</span><span class="wsb-val">${escapeHtml(a.city)}</span></div>
      <div class="wsb wsb-purple"><span class="wsb-label">KYC</span><span class="wsb-val">${escapeHtml((a.kyc || "").replace(/^[^\w]*/, ""))}</span></div>
    </div>
  </div>`;
}

// ── Progress bar ──────────────────────────────
function updateProgress(idx) {
  const pct = Math.round((idx / STEPS.length) * 100);
  wpbFill.style.width = pct + "%";
  wpbStep.textContent = `Step ${idx + 1} / ${STEPS.length}`;
}

// ── Score slider display ──────────────────────
function updateScoreDisplay(val) {
  const numEl = document.getElementById("scoreNumber");
  const labelEl = document.getElementById("scoreLabel");
  if (!numEl) return;
  numEl.textContent = val;
  let label = "", cls = "";
  if (val >= 750) { label = "Auto Approval"; cls = "score-green"; }
  else if (val >= 700) { label = "Standard Review"; cls = "score-yellow"; }
  else if (val >= 650) { label = "Manual Review"; cls = "score-orange"; }
  else { label = "Reject Zone"; cls = "score-red"; }
  labelEl.textContent = label;
  labelEl.className = "score-label " + cls;
  numEl.className = "score-number " + cls;

  // Colour the track
  const slider = document.getElementById("scoreSlider");
  const pct = ((val - 300) / 600) * 100;
  const color = cls === "score-green" ? "#10b981" : cls === "score-yellow" ? "#f59e0b" : cls === "score-orange" ? "#f97316" : "#ef4444";
  slider.style.setProperty("--track-fill", color);
  slider.style.background = `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, #2a2f45 ${pct}%, #2a2f45 100%)`;
}

// ── Append helpers ────────────────────────────
function appendUserMsg(text) {
  const row = document.createElement("div");
  row.className = "msg-row user";
  row.innerHTML = `
    <div class="msg-bubble user-bubble">${escapeHtml(text)}</div>
    <div class="msg-avatar user-avatar">U</div>`;
  chatMessages.appendChild(row);
  scrollBottom();
}

function appendAgentBubble(html) {
  const row = document.createElement("div");
  row.className = "msg-row agent";
  row.innerHTML = `
    <div class="msg-avatar agent-avatar">Agent</div>
    <div class="msg-bubble agent-bubble">${html}</div>`;
  chatMessages.appendChild(row);
  scrollBottom();
}

function appendAgentMsg(rawText, parsed) {
  const row = document.createElement("div");
  row.className = "msg-row agent";
  const content = parsed ? buildDecisionCard(parsed) : `<p class="raw-text">${escapeHtml(rawText)}</p>`;
  row.innerHTML = `
    <div class="msg-avatar agent-avatar">Agent</div>
    <div class="msg-bubble agent-bubble">${content}</div>`;
  chatMessages.appendChild(row);
  scrollBottom();
}

// ── Decision card ─────────────────────────────
function buildDecisionCard(p) {
  const val = v => (v || "").trim();

  const decisionMeta = v => {
    v = val(v).toLowerCase();
    if (v.includes("approve")) return { cls: "dc-approve", icon: "✅" };
    if (v.includes("reject")) return { cls: "dc-reject", icon: "❌" };
    if (v.includes("manual") || v.includes("review")) return { cls: "dc-review", icon: "🔎" };
    if (v.includes("refer")) return { cls: "dc-refer", icon: "↗️" };
    return { cls: "dc-pending", icon: "⏳" };
  };

  const violations = Array.isArray(p.violations) ? p.violations.filter(Boolean) : [];
  const applied = Array.isArray(p.applied_rules) ? p.applied_rules.filter(Boolean) : [];
  const isPending = !val(p.final_decision) && !val(p.credit_decision);
  const fdMeta = decisionMeta(val(p.final_decision) || val(p.credit_decision));

  const banner = isPending
    ? `<div class="dc-banner dc-banner-pending"><span class="dc-banner-icon">📋</span><div class="dc-banner-text"><strong>Additional Information Required</strong><span>${escapeHtml(val(p.decision_summary))}</span></div></div>`
    : `<div class="dc-banner ${fdMeta.cls}-banner"><span class="dc-banner-icon">${fdMeta.icon}</span><div class="dc-banner-text"><strong>Final Decision: ${escapeHtml(val(p.final_decision) || val(p.credit_decision))}</strong><span>${escapeHtml(val(p.decision_summary))}</span></div></div>`;

  const metrics = [
    { label: "Credit Decision", value: val(p.credit_decision), meta: decisionMeta(p.credit_decision) },
    { label: "Compliance Status", value: val(p.compliance_status), meta: decisionMeta(p.compliance_status) },
    { label: "Final Decision", value: val(p.final_decision), meta: decisionMeta(p.final_decision) },
  ];
  if (val(p.policy_version)) metrics.push({ label: "Policy", value: val(p.policy_version), meta: { cls: "dc-info" } });

  const metricBoxes = metrics.map(m => {
    const empty = !m.value;
    return `<div class="dc-metric ${empty ? "dc-metric-empty" : m.meta.cls}">
        <span class="dc-metric-label">${m.label}</span>
        <span class="dc-metric-value">${empty ? "—" : escapeHtml(m.value)}</span>
      </div>`;
  }).join("");

  const rulesBlock = applied.length
    ? `<div class="dc-section"><div class="dc-section-head"><span class="dc-section-icon dc-icon-rule">✓</span>Applied Rules<span class="dc-count">${applied.length}</span></div><div class="dc-tags">${applied.map(r => {
      const rStr = String(r);
      const idMatch = rStr.match(/^([A-Z]+-\d+)/);
      const ruleId = idMatch ? idMatch[1] : rStr;
      return `<span class="dc-tag dc-tag-rule rule-link" data-id="${escapeHtml(ruleId)}">${escapeHtml(rStr)}</span>`;
    }).join("")}</div></div>`
    : `<div class="dc-section dc-section-muted"><div class="dc-section-head"><span class="dc-section-icon dc-icon-rule">✓</span>Applied Rules</div><p class="dc-empty-hint">No rules evaluated yet.</p></div>`;

  const violationsBlock = violations.length
    ? `<div class="dc-section dc-section-violations"><div class="dc-section-head"><span class="dc-section-icon dc-icon-violation">⚠</span>Violations Found<span class="dc-count dc-count-red">${violations.length}</span></div><div class="dc-violations-list">${violations.map(v => `<div class="dc-violation-item"><span class="dc-violation-dot"></span>${escapeHtml(String(v))}</div>`).join("")}</div></div>`
    : `<div class="dc-section dc-section-ok"><div class="dc-section-head"><span class="dc-section-icon dc-icon-ok">✓</span>No Violations Detected</div></div>`;

  const expBlock = val(p.explanation)
    ? `<div class="dc-section dc-section-explanation"><div class="dc-section-head"><span class="dc-section-icon dc-icon-exp"></span> Explanation</div><div class="dc-explanation">${escapeHtml(val(p.explanation))}</div></div>`
    : "";

  return `<div class="decision-card"><div class="dc-card-title">📊 Credit Evaluation Result</div>${banner}<div class="dc-metrics">${metricBoxes}</div>${rulesBlock}${violationsBlock}${expBlock}</div>`;
}

// ── Utils ─────────────────────────────────────
function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function scrollBottom() {
  // Use rAF to wait for DOM paint before scrolling
  requestAnimationFrame(() => {
    chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: "smooth" });
  });
}

// Reset
resetBtn && resetBtn.addEventListener("click", async () => {
  if (!confirm("Clear the entire chat?")) return;
  wizardActive = false;
  wizardStep = 0;
  wizardAnswers = {};
  wizardInputArea.style.display = "none";
  wizardProgressBar.style.display = "none";
  chatInputArea.style.display = "block";
  chatTitle.textContent = "Credit Evaluation Assistant";
  startWizardBtn.disabled = false;
  startWizardBtn.textContent = "Start ↗";
  await fetch("/chat/reset", { method: "POST" });
  chatMessages.innerHTML = `<div class="msg-row agent"><div class="msg-avatar agent-avatar">Agent</div><div class="msg-bubble agent-bubble"><p>Chat cleared. Ready for a new evaluation — use the Guided Evaluation or type freely.</p></div></div>`;
});

// ── Rule Details Modal Logic ────────────────────────
const ruleModalOverlay = document.getElementById("ruleModalOverlay");
const ruleModal = document.getElementById("ruleModal");
const ruleModalTitle = document.getElementById("ruleModalTitle");
const ruleModalBody = document.getElementById("ruleModalBody");
const ruleModalClose = document.getElementById("ruleModalClose");

function openRuleModal(ruleId) {
  ruleModalTitle.textContent = "Rule Details (" + ruleId + ")";
  ruleModalBody.innerHTML = '<div class="rm-loading">Loading rule data...</div>';
  ruleModalOverlay.style.display = "block";
  ruleModal.style.display = "flex";

  fetch(`/chat/api/rule/${ruleId}`)
    .then(r => r.json())
    .then(data => {
      if (!data.success || !data.rule) {
        ruleModalBody.innerHTML = `<div class="rm-loading">Error: ${escapeHtml(data.error || "Rule not found")}</div>`;
        return;
      }

      const r = data.rule;
      let html = "";

      // Determine if Compliance or Credit rule by checking properties
      if (r.guideline_id) {
        // Compliance Rule
        html += `<div class="rm-attr"><strong>Guideline ID</strong>${escapeHtml(r.guideline_id)}</div>`;
        html += `<div class="rm-attr"><strong>Requirement</strong>${escapeHtml(r.requirement)}</div>`;
        html += `<div class="rm-attr"><strong>Regulation Source</strong>${escapeHtml(r.regulation_source)}</div>`;
        html += `<div class="rm-attr"><strong>Applies To</strong>${escapeHtml(r.applies_to)}</div>`;
        html += `<div class="rm-attr"><strong>Risk Level</strong>${escapeHtml(r.risk_level)}</div>`;
        if (r.non_compliance_impact) html += `<div class="rm-attr"><strong>Non-Compliance Impact</strong>${escapeHtml(r.non_compliance_impact)}</div>`;
      } else {
        // Credit Policy Rule
        html += `<div class="rm-attr"><strong>Rule ID</strong>${escapeHtml(r["Rule ID"])}</div>`;
        html += `<div class="rm-attr"><strong>Document Type</strong>${escapeHtml(r["Document Type"])}</div>`;
        html += `<div class="rm-attr"><strong>Description</strong>${escapeHtml(r.Description)}</div>`;
        html += `<div class="rm-attr"><strong>Conditions</strong>${escapeHtml(r.Conditions)}</div>`;
        html += `<div class="rm-attr"><strong>Risk Category</strong>${escapeHtml(r["Risk Category"])}</div>`;
        html += `<div class="rm-attr"><strong>Decision Impact</strong>${escapeHtml(r["Decision Impact"])}</div>`;
        if (r.Exceptions && r.Exceptions !== "None") html += `<div class="rm-attr"><strong>Exceptions</strong>${escapeHtml(r.Exceptions)}</div>`;
      }

      ruleModalBody.innerHTML = html;
    })
    .catch(err => {
      ruleModalBody.innerHTML = '<div class="rm-loading">Failed to fetch rule data.</div>';
    });
}

function closeRuleModal() {
  ruleModalOverlay.style.display = "none";
  ruleModal.style.display = "none";
}

ruleModalClose && ruleModalClose.addEventListener("click", closeRuleModal);
ruleModalOverlay && ruleModalOverlay.addEventListener("click", closeRuleModal);

// Delegate clicks on rule links natively
document.addEventListener("click", (e) => {
  const link = e.target.closest(".rule-link");
  if (link) {
    const ruleId = link.getAttribute("data-id");
    if (ruleId) openRuleModal(ruleId);
  }
});

// Auto-scroll on load
if (chatMessages) scrollBottom();
