// ─── ADMIN PAGE JAVASCRIPT ───

function toggleForm() {
    const panel = document.getElementById("formPanel");
    if (panel.style.display === "none" || panel.style.display === "") {
        panel.style.display = "block";
        panel.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
        panel.style.display = "none";
    }
}

function filterTable() {
    const q = document.getElementById("tableSearch").value.toLowerCase();
    const rows = document.querySelectorAll("#dataTable tbody tr");
    let visible = 0;
    rows.forEach((row) => {
        const text = row.textContent.toLowerCase();
        const show = text.includes(q);
        row.style.display = show ? "" : "none";
        if (show) visible++;
    });
    const counter = document.getElementById("tableCount");
    if (counter) counter.textContent = `${visible} items`;
}

// If URL has #add, auto-open form
if (window.location.hash === "#add") {
    const panel = document.getElementById("formPanel");
    if (panel) panel.style.display = "block";
}
