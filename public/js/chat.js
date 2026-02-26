// ─── CHAT PAGE JAVASCRIPT ───

const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const typingIndicator = document.getElementById("typingIndicator");
const charCount = document.getElementById("charCount");
const resetBtn = document.getElementById("resetChat");
const fillBtn = document.getElementById("fillExample");

// Char counter
chatInput.addEventListener("input", () => {
  const len = chatInput.value.length;
  charCount.textContent = `${len} / 2000`;
  if (len > 1800) charCount.style.color = "#ef4444";
  else charCount.style.color = "";
});

// Send on Enter (Shift+Enter = newline)
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.addEventListener("click", sendMessage);

async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text || sendBtn.disabled) return;

  appendUserMsg(text);
  chatInput.value = "";
  charCount.textContent = "0 / 2000";
  sendBtn.disabled = true;
  typingIndicator.style.display = "flex";
  scrollBottom();

  try {
    const res = await fetch("/chat/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    const data = await res.json();
    typingIndicator.style.display = "none";

    if (data.success) {
      appendAgentMsg(data.reply, data.parsed);
    } else {
      appendAgentMsg("❌ Error: " + (data.error || "Something went wrong"), null);
    }
  } catch (err) {
    typingIndicator.style.display = "none";
    appendAgentMsg("❌ Network error. Please try again.", null);
  } finally {
    sendBtn.disabled = false;
    scrollBottom();
  }
}

function appendUserMsg(text) {
  const row = document.createElement("div");
  row.className = "msg-row user";
  row.innerHTML = `
    <div class="msg-bubble user-bubble">${escapeHtml(text)}</div>
    <div class="msg-avatar user-avatar">U</div>
  `;
  chatMessages.appendChild(row);
}

function appendAgentMsg(rawText, parsed) {
  const row = document.createElement("div");
  row.className = "msg-row agent";

  let content = "";
  if (parsed) {
    content = buildDecisionCard(parsed);
  } else {
    content = `<p class="raw-text">${escapeHtml(rawText)}</p>`;
  }

  row.innerHTML = `
    <div class="msg-avatar agent-avatar">AI</div>
    <div class="msg-bubble agent-bubble">${content}</div>
  `;
  chatMessages.appendChild(row);
}

function buildDecisionCard(p) {

  // ── Helpers ──────────────────────────────────────────────────────────────
  const val = (v) => (v || "").trim();

  const decisionMeta = (v) => {
    v = val(v).toLowerCase();
    if (v.includes("approve")) return { cls: "dc-approve", icon: "✅", label: "Approved" };
    if (v.includes("reject")) return { cls: "dc-reject", icon: "❌", label: "Rejected" };
    if (v.includes("manual") || v.includes("review")) return { cls: "dc-review", icon: "🔎", label: "Manual Review" };
    if (v.includes("refer")) return { cls: "dc-refer", icon: "↗️", label: "Referred" };
    return { cls: "dc-pending", icon: "⏳", label: v || "Pending" };
  };

  const violations = Array.isArray(p.violations) ? p.violations.filter(Boolean) : [];
  const applied = Array.isArray(p.applied_rules) ? p.applied_rules.filter(Boolean) : [];

  // ── Determine overall card state ─────────────────────────────────────────
  const hasDecision = val(p.final_decision) || val(p.credit_decision);
  const fdMeta = decisionMeta(val(p.final_decision) || val(p.credit_decision));
  const isPending = !hasDecision;

  // ── Status Banner ────────────────────────────────────────────────────────
  const banner = isPending
    ? `<div class="dc-banner dc-banner-pending">
              <span class="dc-banner-icon">📋</span>
              <div class="dc-banner-text">
                <strong>Additional Information Required</strong>
                <span>${escapeHtml(val(p.decision_summary))}</span>
              </div>
           </div>`
    : `<div class="dc-banner ${fdMeta.cls}-banner">
              <span class="dc-banner-icon">${fdMeta.icon}</span>
              <div class="dc-banner-text">
                <strong>Final Decision: ${escapeHtml(val(p.final_decision) || val(p.credit_decision))}</strong>
                <span>${escapeHtml(val(p.decision_summary))}</span>
              </div>
           </div>`;

  // ── Metric boxes ─────────────────────────────────────────────────────────
  const metrics = [
    { label: "Credit Decision", value: val(p.credit_decision), meta: decisionMeta(p.credit_decision), show: true },
    { label: "Compliance Status", value: val(p.compliance_status), meta: decisionMeta(p.compliance_status), show: true },
    { label: "Final Decision", value: val(p.final_decision), meta: decisionMeta(p.final_decision), show: true },
    { label: "Policy Version", value: val(p.policy_version), meta: { cls: "dc-info", icon: "📄" }, show: !!val(p.policy_version) },
  ];

  const metricBoxes = metrics.filter(m => m.show).map(m => {
    const isEmpty = !m.value;
    return `<div class="dc-metric ${isEmpty ? "dc-metric-empty" : m.meta.cls}">
            <span class="dc-metric-label">${m.label}</span>
            <span class="dc-metric-value">${isEmpty ? "—" : escapeHtml(m.value)}</span>
        </div>`;
  }).join("");

  // ── Applied Rules ─────────────────────────────────────────────────────────
  const rulesBlock = applied.length
    ? `<div class="dc-section">
             <div class="dc-section-head"><span class="dc-section-icon dc-icon-rule">✓</span> Applied Rules <span class="dc-count">${applied.length}</span></div>
             <div class="dc-tags">${applied.map(r => `<span class="dc-tag dc-tag-rule">${escapeHtml(String(r))}</span>`).join("")}</div>
           </div>`
    : `<div class="dc-section dc-section-muted">
             <div class="dc-section-head"><span class="dc-section-icon dc-icon-rule">✓</span> Applied Rules</div>
             <p class="dc-empty-hint">No rules evaluated yet — please provide more details.</p>
           </div>`;

  // ── Violations ────────────────────────────────────────────────────────────
  const violationsBlock = violations.length
    ? `<div class="dc-section dc-section-violations">
             <div class="dc-section-head"><span class="dc-section-icon dc-icon-violation">⚠</span> Violations Found <span class="dc-count dc-count-red">${violations.length}</span></div>
             <div class="dc-violations-list">${violations.map(v =>
      `<div class="dc-violation-item"><span class="dc-violation-dot"></span>${escapeHtml(String(v))}</div>`
    ).join("")}</div>
           </div>`
    : `<div class="dc-section dc-section-ok">
             <div class="dc-section-head"><span class="dc-section-icon dc-icon-ok">✓</span> No Violations</div>
           </div>`;

  // ── Explanation ───────────────────────────────────────────────────────────
  const expText = val(p.explanation);
  const explanationBlock = expText
    ? `<div class="dc-section dc-section-explanation">
             <div class="dc-section-head"><span class="dc-section-icon dc-icon-exp">💬</span> AI Explanation</div>
             <div class="dc-explanation">${escapeHtml(expText)}</div>
           </div>`
    : "";

  return `
    <div class="decision-card">
        <div class="dc-card-title">📊 Credit Evaluation Result</div>
        ${banner}
        <div class="dc-metrics">${metricBoxes}</div>
        ${rulesBlock}
        ${violationsBlock}
        ${explanationBlock}
    </div>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function scrollBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Reset chat
resetBtn && resetBtn.addEventListener("click", async () => {
  if (!confirm("Clear the entire chat history?")) return;
  await fetch("/chat/reset", { method: "POST" });
  chatMessages.innerHTML = `<div class="msg-row agent">
    <div class="msg-avatar agent-avatar">AI</div>
    <div class="msg-bubble agent-bubble"><p>Chat cleared. Ready for a new evaluation.</p></div>
  </div>`;
});

// Fill example
fillBtn && fillBtn.addEventListener("click", () => {
  chatInput.value = EXAMPLE;
  chatInput.dispatchEvent(new Event("input"));
  chatInput.focus();
});

// Auto-scroll existing messages
scrollBottom();
