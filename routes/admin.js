const express = require("express");
const router = express.Router();
const { requireAdmin } = require("../middleware/auth");
const { scanTable, getItem, putItem, deleteItem } = require("../lib/dynamo");

const COMPLIANCE_TABLE = process.env.COMPLIANCE_TABLE;
const RULES_TABLE = process.env.RULES_TABLE;

// ─────────────────── DASHBOARD ───────────────────
router.get("/dashboard", requireAdmin, async (req, res) => {
    try {
        const [compItems, ruleItems] = await Promise.all([
            scanTable(COMPLIANCE_TABLE),
            scanTable(RULES_TABLE),
        ]);
        res.render("admin/dashboard", {
            user: req.session.user,
            compCount: compItems.length,
            ruleCount: ruleItems.length,
            compHigh: compItems.filter((i) => i.risk_level === "High").length,
            ruleHigh: ruleItems.filter((i) => i["Risk Category"] === "High" || i["Risk Category"] === "Very High").length,
        });
    } catch (err) {
        res.render("error", { message: err.message, user: req.session.user });
    }
});

// ─────────────────── COMPLIANCE TABLE ───────────────────
router.get("/compliance", requireAdmin, async (req, res) => {
    try {
        const items = await scanTable(COMPLIANCE_TABLE);
        items.sort((a, b) => a.guideline_id.localeCompare(b.guideline_id));
        res.render("admin/compliance", { user: req.session.user, items, editItem: null, error: null });
    } catch (err) {
        res.render("error", { message: err.message, user: req.session.user });
    }
});

// Edit form
router.get("/compliance/edit/:id", requireAdmin, async (req, res) => {
    try {
        const items = await scanTable(COMPLIANCE_TABLE);
        items.sort((a, b) => a.guideline_id.localeCompare(b.guideline_id));
        const editItem = await getItem(COMPLIANCE_TABLE, { guideline_id: req.params.id });
        res.render("admin/compliance", { user: req.session.user, items, editItem, error: null });
    } catch (err) {
        res.render("error", { message: err.message, user: req.session.user });
    }
});

// Create / Update compliance
router.post("/compliance/save", requireAdmin, async (req, res) => {
    const item = {
        guideline_id: req.body.guideline_id.trim(),
        requirement: req.body.requirement,
        regulation_source: req.body.regulation_source,
        applies_to: req.body.applies_to,
        mandatory_stage: req.body.mandatory_stage,
        risk_level: req.body.risk_level,
        non_compliance_impact: req.body.non_compliance_impact,
        notes: req.body.notes || "",
    };
    try {
        await putItem(COMPLIANCE_TABLE, item);
        res.redirect("/admin/compliance");
    } catch (err) {
        const items = await scanTable(COMPLIANCE_TABLE);
        res.render("admin/compliance", { user: req.session.user, items, editItem: item, error: err.message });
    }
});

// Delete compliance
router.post("/compliance/delete/:id", requireAdmin, async (req, res) => {
    try {
        await deleteItem(COMPLIANCE_TABLE, { guideline_id: req.params.id });
        res.redirect("/admin/compliance");
    } catch (err) {
        res.render("error", { message: err.message, user: req.session.user });
    }
});

// ─────────────────── RULES TABLE ───────────────────
router.get("/rules", requireAdmin, async (req, res) => {
    try {
        const items = await scanTable(RULES_TABLE);
        items.sort((a, b) => (a["Rule ID"] || "").localeCompare(b["Rule ID"] || ""));
        res.render("admin/rules", { user: req.session.user, items, editItem: null, error: null });
    } catch (err) {
        res.render("error", { message: err.message, user: req.session.user });
    }
});

// Edit form
router.get("/rules/edit/:id", requireAdmin, async (req, res) => {
    try {
        const items = await scanTable(RULES_TABLE);
        items.sort((a, b) => (a["Rule ID"] || "").localeCompare(b["Rule ID"] || ""));
        const editItem = await getItem(RULES_TABLE, { "Rule ID": req.params.id });
        res.render("admin/rules", { user: req.session.user, items, editItem, error: null });
    } catch (err) {
        res.render("error", { message: err.message, user: req.session.user });
    }
});

// Save rule
router.post("/rules/save", requireAdmin, async (req, res) => {
    const item = {
        "Rule ID": req.body.rule_id.trim(),
        "Document Type": req.body.document_type || "Credit Policy",
        Description: req.body.description,
        Conditions: req.body.conditions,
        Exceptions: req.body.exceptions || "None",
        "Customer Segment": req.body.customer_segment,
        "Risk Category": req.body.risk_category,
        "Decision Impact": req.body.decision_impact,
        Priority: req.body.priority,
        Notes: req.body.notes || "",
    };
    try {
        await putItem(RULES_TABLE, item);
        res.redirect("/admin/rules");
    } catch (err) {
        const items = await scanTable(RULES_TABLE);
        res.render("admin/rules", { user: req.session.user, items, editItem: item, error: err.message });
    }
});

// Delete rule
router.post("/rules/delete/:id", requireAdmin, async (req, res) => {
    try {
        await deleteItem(RULES_TABLE, { "Rule ID": req.params.id });
        res.redirect("/admin/rules");
    } catch (err) {
        res.render("error", { message: err.message, user: req.session.user });
    }
});

module.exports = router;
