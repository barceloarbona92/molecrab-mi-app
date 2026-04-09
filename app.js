// Dopamine Reset Mini · 100% local · sin dependencias
(() => {
  "use strict";

  const HABITS = [
    { id: "screen",    emoji: "📱", label: "Menos de 2h de pantalla recreativa" },
    { id: "morning",   emoji: "🌅", label: "Sin redes sociales por la mañana" },
    { id: "boredom",   emoji: "🧘", label: "10 min de aburrimiento consciente" },
    { id: "move",      emoji: "🏃", label: "20 min de actividad física" },
    { id: "read",      emoji: "📖", label: "15 min de lectura en papel" },
    { id: "eat",       emoji: "🍽️", label: "Comer sin distracciones" },
    { id: "night",     emoji: "🌙", label: "Sin doomscrolling antes de dormir" }
  ];

  const KEY = "dopamine-reset-v1";
  const TODAY = () => new Date().toISOString().slice(0, 10);
  const DAYNAMES = ["D", "L", "M", "X", "J", "V", "S"];

  // ---------- STATE ----------
  const load = () => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : { days: {} };
    } catch {
      return { days: {} };
    }
  };
  const save = (s) => localStorage.setItem(KEY, JSON.stringify(s));

  let state = load();

  const getDay = (date = TODAY()) => {
    if (!state.days[date]) {
      state.days[date] = Object.fromEntries(HABITS.map(h => [h.id, false]));
    }
    return state.days[date];
  };

  const countDone = (day) => Object.values(day).filter(Boolean).length;

  const calcStreak = () => {
    let s = 0;
    const d = new Date();
    while (true) {
      const iso = d.toISOString().slice(0, 10);
      const day = state.days[iso];
      if (!day) break;
      if (countDone(day) >= 5) {
        s++;
        d.setDate(d.getDate() - 1);
      } else break;
    }
    return s;
  };

  const calcTotalDaysOk = () => Object.values(state.days).filter(d => countDone(d) >= 5).length;

  const calcLevel = () => {
    const total = calcTotalDaysOk();
    if (total >= 30) return "N5";
    if (total >= 14) return "N4";
    if (total >= 7)  return "N3";
    if (total >= 3)  return "N2";
    return "N1";
  };

  // ---------- RENDER ----------
  const $ = (sel) => document.querySelector(sel);
  const habitsEl = $("#habits");
  const ringEl = $("#ring");
  const ringCountEl = $("#ringCount");
  const streakEl = $("#streak");
  const totalEl = $("#totalDays");
  const levelEl = $("#level");
  const weekEl = $("#weekGrid");

  const RING_CIRC = 2 * Math.PI * 52;
  ringEl.style.strokeDasharray = RING_CIRC;

  const renderHabits = () => {
    const day = getDay();
    habitsEl.innerHTML = HABITS.map(h => `
      <div class="habit ${day[h.id] ? "done" : ""}" data-id="${h.id}" role="button" tabindex="0" aria-pressed="${day[h.id]}">
        <div class="check">✓</div>
        <div class="emoji">${h.emoji}</div>
        <div class="label">${h.label}</div>
      </div>
    `).join("");
    habitsEl.querySelectorAll(".habit").forEach(el => {
      el.addEventListener("click", () => toggleHabit(el.dataset.id));
      el.addEventListener("keydown", (e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          toggleHabit(el.dataset.id);
        }
      });
    });
  };

  const renderRing = () => {
    const day = getDay();
    const done = countDone(day);
    const pct = done / HABITS.length;
    ringEl.style.strokeDashoffset = RING_CIRC * (1 - pct);
    ringCountEl.innerHTML = `${done}<span>/${HABITS.length}</span>`;
    if (done === HABITS.length) {
      ringEl.style.stroke = "#4ade80";
    } else if (done >= 5) {
      ringEl.style.stroke = "#c084fc";
    } else {
      ringEl.style.stroke = "#a855f7";
    }
  };

  const renderStats = () => {
    streakEl.textContent = calcStreak();
    totalEl.textContent = calcTotalDaysOk();
    levelEl.textContent = calcLevel();
  };

  const renderWeek = () => {
    const out = [];
    const today = TODAY();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const day = state.days[iso];
      const done = day ? countDone(day) : 0;
      const total = HABITS.length;
      let pct = "0";
      if (done === 0) pct = "0";
      else if (done / total < 0.5) pct = "low";
      else if (done / total < 1)   pct = "mid";
      else                          pct = "high";
      const isToday = iso === today;
      out.push(`
        <div class="day ${isToday ? "today" : ""}" data-pct="${pct}" title="${iso}: ${done}/${total}">
          <div class="num">${DAYNAMES[d.getDay()]}</div>
          <div class="val">${done || "·"}</div>
        </div>
      `);
    }
    weekEl.innerHTML = out.join("");
  };

  const renderAll = () => {
    renderHabits();
    renderRing();
    renderStats();
    renderWeek();
  };

  // ---------- ACTIONS ----------
  const toggleHabit = (id) => {
    const day = getDay();
    day[id] = !day[id];
    save(state);
    renderAll();
    if (navigator.vibrate) navigator.vibrate(10);
    const done = countDone(day);
    if (done === HABITS.length) {
      toast("🔥 Día completo. Racha viva.");
    } else if (done === 5) {
      toast("✅ Día cuenta para la racha");
    }
  };

  const toast = (msg) => {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("show"), 2400);
  };

  // ---------- MENU ----------
  const menuEl = $("#menu");
  $("#menuBtn").addEventListener("click", () => menuEl.showModal());
  menuEl.addEventListener("close", () => {
    const v = menuEl.returnValue;
    if (v === "export") exportData();
    else if (v === "import") importData();
    else if (v === "about") toast("Dopamine Reset · Mini Tracker · v1.0");
  });

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dopamine-reset-${TODAY()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Datos exportados");
  };

  const importData = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target.result);
          if (parsed && typeof parsed === "object" && parsed.days) {
            state = parsed;
            save(state);
            renderAll();
            toast("Datos importados");
          } else {
            toast("Archivo inválido");
          }
        } catch {
          toast("Error al importar");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // ---------- RESET ----------
  $("#resetBtn").addEventListener("click", () => {
    if (confirm("¿Borrar todos los datos? Esta acción no se puede deshacer.")) {
      localStorage.removeItem(KEY);
      state = { days: {} };
      renderAll();
      toast("Datos borrados");
    }
  });

  // ---------- INIT ----------
  renderAll();

  // PWA
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }
})();
