/* ============================================================
   BUDGET TRACKER — script.js
   All data stored in localStorage keyed by month (YYYY-MM)
   ============================================================ */

// ── STATE ──────────────────────────────────────────────────
let currentMonth = "";   // "YYYY-MM"
let monthData    = {};   // { income, categories: [{id,name,budget,spending}] }

// ── DOM REFS ───────────────────────────────────────────────
const monthPicker       = document.getElementById("monthPicker");
const loadMonthBtn      = document.getElementById("loadMonthBtn");
const summaryIncome     = document.getElementById("summaryIncome");
const summaryBudget     = document.getElementById("summaryBudget");
const summarySpent      = document.getElementById("summarySpent");
const summarySavings    = document.getElementById("summarySavings");
const progressFill      = document.getElementById("progressFill");
const progressPercent   = document.getElementById("progressPercent");
const tableBody         = document.getElementById("tableBody");
const emptyState        = document.getElementById("emptyState");
const historyGrid       = document.getElementById("historyGrid");
const historyEmpty      = document.getElementById("historyEmpty");

// Income modal
const editIncomeBtn     = document.getElementById("editIncomeBtn");
const incomeModal       = document.getElementById("incomeModal");
const incomeInput       = document.getElementById("incomeInput");
const saveIncomeBtn     = document.getElementById("saveIncomeBtn");
const cancelIncomeBtn   = document.getElementById("cancelIncomeBtn");

// Add category
const addCategoryBtn    = document.getElementById("addCategoryBtn");
const addCategoryForm   = document.getElementById("addCategoryForm");
const newCatName        = document.getElementById("newCatName");
const newCatBudget      = document.getElementById("newCatBudget");
const newCatSpending    = document.getElementById("newCatSpending");
const saveCategoryBtn   = document.getElementById("saveCategoryBtn");
const cancelCategoryBtn = document.getElementById("cancelCategoryBtn");

// ── HELPERS ────────────────────────────────────────────────
const fmt    = n => `RM ${parseFloat(n || 0).toFixed(2)}`;
const uid    = ()  => Math.random().toString(36).slice(2, 9);
const today  = ()  => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };

function saveMonth() {
  if (!currentMonth) return;
  localStorage.setItem(`budget_${currentMonth}`, JSON.stringify(monthData));
  renderHistory();
}

function loadMonth(month) {
  currentMonth = month;
  const raw = localStorage.getItem(`budget_${month}`);
  if (raw) {
    monthData = JSON.parse(raw);
  } else {
    // Default seed from their Excel data (only for first load)
    monthData = {
      income: 1700,
      categories: [
        { id: uid(), name: "eg: Your Categories",               budget: 500,    spending: 0 }
      ]
    };
    saveMonth();
  }
  renderAll();
}

// ── RENDER ─────────────────────────────────────────────────
function renderAll() {
  renderSummary();
  renderTable();
  renderHistory();
}

function renderSummary() {
  const income   = parseFloat(monthData.income || 0);
  const budgeted = monthData.categories.reduce((a, c) => a + parseFloat(c.budget  || 0), 0);
  const spent    = monthData.categories.reduce((a, c) => a + parseFloat(c.spending|| 0), 0);
  const savings  = income - spent;

  summaryIncome.textContent  = fmt(income);
  summaryBudget.textContent  = fmt(budgeted);
  summarySpent.textContent   = fmt(spent);
  summarySavings.textContent = fmt(savings);
  summarySavings.classList.toggle("negative", savings < 0);

  const pct = budgeted > 0 ? Math.min((spent / budgeted) * 100, 100) : 0;
  progressFill.style.width = pct + "%";
  progressPercent.textContent = `${Math.round((spent / (budgeted || 1)) * 100)}%`;
  progressFill.classList.toggle("over-budget", spent > budgeted);
}

function renderTable() {
  tableBody.innerHTML = "";
  const cats = monthData.categories;

  if (!cats || cats.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  cats.forEach(cat => {
    const budget    = parseFloat(cat.budget   || 0);
    const spending  = parseFloat(cat.spending || 0);
    const remaining = budget - spending;
    const pctUsed   = budget > 0 ? (spending / budget) * 100 : 0;

    let badge, badgeClass;
    if (spending === 0 && budget === 0) {
      badge = "—"; badgeClass = "badge-zero";
    } else if (spending === 0) {
      badge = "Not Started"; badgeClass = "badge-zero";
    } else if (pctUsed >= 100) {
      badge = "Over Budget"; badgeClass = "badge-over";
    } else if (pctUsed >= 80) {
      badge = "⚠ Almost"; badgeClass = "badge-warn";
    } else {
      badge = "✓ On Track"; badgeClass = "badge-ok";
    }

    const tr = document.createElement("tr");
    tr.dataset.id = cat.id;
    tr.innerHTML = `
      <td class="cat-name">${escHtml(cat.name)}</td>
      <td>
        <input class="inline-edit" type="number" value="${budget}" min="0" step="0.01"
          data-field="budget" data-id="${cat.id}" />
      </td>
      <td>
        <input class="inline-edit" type="number" value="${spending}" min="0" step="0.01"
          data-field="spending" data-id="${cat.id}" />
      </td>
      <td class="${remaining >= 0 ? 'remaining-pos' : 'remaining-neg'}">${fmt(remaining)}</td>
      <td><span class="badge ${badgeClass}">${badge}</span></td>
      <td>
        <div class="action-btns">
          <button class="btn-icon del" title="Delete" data-id="${cat.id}">🗑️</button>
        </div>
      </td>
    `;
    tableBody.appendChild(tr);
  });

  // Inline edit listeners
  tableBody.querySelectorAll(".inline-edit").forEach(input => {
    input.addEventListener("change", e => {
      const { id, field } = e.target.dataset;
      const cat = monthData.categories.find(c => c.id === id);
      if (cat) {
        cat[field] = parseFloat(e.target.value) || 0;
        saveMonth();
        renderSummary();
        // Re-render just that row's remaining + badge
        const tr = tableBody.querySelector(`tr[data-id="${id}"]`);
        const remaining = (cat.budget || 0) - (cat.spending || 0);
        tr.querySelector("td:nth-child(4)").textContent = fmt(remaining);
        tr.querySelector("td:nth-child(4)").className = remaining >= 0 ? "remaining-pos" : "remaining-neg";
        const pct = cat.budget > 0 ? (cat.spending / cat.budget) * 100 : 0;
        let badge, cls;
        if (cat.spending === 0 && cat.budget === 0) { badge = "—"; cls = "badge-zero"; }
        else if (cat.spending === 0) { badge = "Not Started"; cls = "badge-zero"; }
        else if (pct >= 100) { badge = "Over Budget"; cls = "badge-over"; }
        else if (pct >= 80)  { badge = "⚠ Almost";   cls = "badge-warn"; }
        else                 { badge = "✓ On Track";  cls = "badge-ok"; }
        const b = tr.querySelector(".badge");
        b.textContent = badge; b.className = `badge ${cls}`;
      }
    });
  });

  // Delete listeners
  tableBody.querySelectorAll(".btn-icon.del").forEach(btn => {
    btn.addEventListener("click", e => {
      const id = e.currentTarget.dataset.id;
      monthData.categories = monthData.categories.filter(c => c.id !== id);
      saveMonth();
      renderAll();
    });
  });
}

function renderHistory() {
  historyGrid.innerHTML = "";
  const keys = Object.keys(localStorage)
    .filter(k => k.startsWith("budget_"))
    .sort()
    .reverse();

  if (keys.length === 0) {
    historyEmpty.classList.remove("hidden");
    return;
  }
  historyEmpty.classList.add("hidden");

  keys.forEach(key => {
    const data   = JSON.parse(localStorage.getItem(key));
    const month  = key.replace("budget_", "");
    const income = parseFloat(data.income || 0);
    const spent  = data.categories.reduce((a, c) => a + parseFloat(c.spending || 0), 0);
    const saving = income - spent;

    const [yr, mo] = month.split("-");
    const label = new Date(yr, parseInt(mo)-1, 1).toLocaleString("default", { month: "long", year: "numeric" });

    const card = document.createElement("div");
    card.className = "history-card";
    card.innerHTML = `
      <p class="h-month">${label}</p>
      <p class="h-saving ${saving < 0 ? 'neg' : ''}">${fmt(saving)}</p>
      <p class="h-label">Savings (Income − Spent)</p>
    `;
    card.addEventListener("click", () => {
      monthPicker.value = month;
      loadMonth(month);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    historyGrid.appendChild(card);
  });
}

// ── INCOME MODAL ────────────────────────────────────────────
editIncomeBtn.addEventListener("click", () => {
  incomeInput.value = monthData.income || 0;
  incomeModal.classList.remove("hidden");
  incomeInput.focus();
});

saveIncomeBtn.addEventListener("click", () => {
  monthData.income = parseFloat(incomeInput.value) || 0;
  saveMonth();
  renderSummary();
  incomeModal.classList.add("hidden");
});

cancelIncomeBtn.addEventListener("click", () => incomeModal.classList.add("hidden"));

incomeModal.addEventListener("click", e => {
  if (e.target === incomeModal) incomeModal.classList.add("hidden");
});

incomeInput.addEventListener("keydown", e => {
  if (e.key === "Enter") saveIncomeBtn.click();
  if (e.key === "Escape") cancelIncomeBtn.click();
});

// ── ADD CATEGORY ────────────────────────────────────────────
addCategoryBtn.addEventListener("click", () => {
  addCategoryForm.classList.toggle("hidden");
  if (!addCategoryForm.classList.contains("hidden")) newCatName.focus();
});

cancelCategoryBtn.addEventListener("click", () => {
  addCategoryForm.classList.add("hidden");
  newCatName.value = ""; newCatBudget.value = ""; newCatSpending.value = "";
});

saveCategoryBtn.addEventListener("click", () => {
  const name     = newCatName.value.trim();
  const budget   = parseFloat(newCatBudget.value)   || 0;
  const spending = parseFloat(newCatSpending.value)  || 0;
  if (!name) { newCatName.focus(); return; }

  monthData.categories.push({ id: uid(), name, budget, spending });
  saveMonth();
  renderAll();
  cancelCategoryBtn.click();
});

newCatName.addEventListener("keydown", e => { if (e.key === "Enter") newCatBudget.focus(); });
newCatBudget.addEventListener("keydown", e => { if (e.key === "Enter") newCatSpending.focus(); });
newCatSpending.addEventListener("keydown", e => { if (e.key === "Enter") saveCategoryBtn.click(); });

// ── LOAD MONTH BUTTON ───────────────────────────────────────
loadMonthBtn.addEventListener("click", () => {
  const val = monthPicker.value;
  if (!val) { alert("Please pick a month first!"); return; }
  loadMonth(val);
});

// ── ESCAPE HELPER ───────────────────────────────────────────
function escHtml(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ── INIT ────────────────────────────────────────────────────
(function init() {
  const t = today();
  monthPicker.value = t;
  loadMonth(t);
})();
