const express = require("express");
const router = express.Router();
const { requireUser } = require("../middleware/auth");
const { invokeAgent } = require("../lib/bedrock");
const { v4: uuidv4 } = require("uuid");

// GET /chat
router.get("/", requireUser, (req, res) => {
    if (!req.session.chatSessionId) {
        req.session.chatSessionId = uuidv4();
    }
    res.render("user/chat", {
        user: req.session.user,
        messages: req.session.messages || [],
    });
});

// POST /chat/send
router.post("/send", requireUser, async (req, res) => {
    const { message } = req.body;
    if (!message || !message.trim()) {
        return res.json({ success: false, error: "Empty message" });
    }

    if (!req.session.chatSessionId) {
        req.session.chatSessionId = uuidv4();
    }
    if (!req.session.messages) {
        req.session.messages = [];
    }

    req.session.messages.push({ role: "user", text: message, time: new Date().toISOString() });

    try {
        const rawReply = await invokeAgent(message, req.session.chatSessionId);

        // Try to parse JSON from the response
        let parsed = null;
        const jsonMatch = rawReply.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                parsed = JSON.parse(jsonMatch[0]);
            } catch (_) {
                parsed = null;
            }
        }

        const agentMsg = {
            role: "agent",
            text: rawReply,
            parsed,
            time: new Date().toISOString(),
        };

        req.session.messages.push(agentMsg);
        req.session.save(() => { });

        res.json({ success: true, reply: rawReply, parsed });
    } catch (err) {
        console.error("Bedrock error:", err);
        res.json({ success: false, error: err.message || "Agent error" });
    }
});

// POST /chat/reset
router.post("/reset", requireUser, (req, res) => {
    req.session.messages = [];
    req.session.chatSessionId = uuidv4();
    req.session.save(() => { });
    res.json({ success: true });
});

module.exports = router;
