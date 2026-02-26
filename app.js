require("dotenv").config();
const express = require("express");
const session = require("express-session");
const morgan = require("morgan");
const path = require("path");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Static files
app.use(express.static(path.join(__dirname, "public")));

// Middleware
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
    session({
        secret: process.env.SESSION_SECRET || "dev-secret",
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 1000 * 60 * 60 * 4 }, // 4 hours
    })
);

// Routes
app.get("/", (req, res) => {
    if (req.session && req.session.user) {
        return req.session.user.role === "admin"
            ? res.redirect("/admin/dashboard")
            : res.redirect("/chat");
    }
    res.redirect("/login");
});
app.use("/login", authRoutes);
app.get("/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/login"));
});
app.use("/chat", userRoutes);
app.use("/admin", adminRoutes);

// 404
app.use((req, res) => {
    res.status(404).render("404", { user: req.session?.user || null });
});

// Error
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).render("error", { message: err.message, user: req.session?.user || null });
});

app.listen(PORT, () => {
    console.log(`\n🚀 Credit-OS App running at http://localhost:${PORT}`);
    console.log(`   User login   → username: user     | password: user123`);
    console.log(`   Admin login  → username: admin    | password: admin123\n`);
});
