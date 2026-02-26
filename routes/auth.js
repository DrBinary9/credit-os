const express = require("express");
const router = express.Router();

// GET /login
router.get("/", (req, res) => {
    if (req.session && req.session.user) {
        return req.session.user.role === "admin"
            ? res.redirect("/admin/dashboard")
            : res.redirect("/chat");
    }
    res.render("login", { error: null });
});

// POST /login
router.post("/", (req, res) => {
    const { username, password, role } = req.body;

    const adminUser = process.env.ADMIN_PASSWORD;
    const userPass = process.env.USER_PASSWORD;

    if (role === "admin" && username === "admin" && password === adminUser) {
        req.session.user = { username: "admin", role: "admin" };
        return res.redirect("/admin/dashboard");
    }

    if (role === "user" && username === "user" && password === userPass) {
        req.session.user = { username: "user", role: "user" };
        return res.redirect("/chat");
    }

    res.render("login", { error: "Invalid credentials. Please try again." });
});

// GET /logout
router.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
});

module.exports = router;
