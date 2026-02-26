function requireLogin(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.redirect("/login");
    }
    next();
}

function requireAdmin(req, res, next) {
    if (!req.session || !req.session.user || req.session.user.role !== "admin") {
        return res.status(403).render("403", { user: req.session.user || null });
    }
    next();
}

function requireUser(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.redirect("/login");
    }
    next();
}

module.exports = { requireLogin, requireAdmin, requireUser };
