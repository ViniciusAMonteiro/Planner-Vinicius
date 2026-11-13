"use strict";
/* Compasso 2.0 — recursos extras. Carregado depois do script principal; usa o mesmo estado global. */
(() => {
  const KEY = "compasso_plus_v1";
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  let plus = load();
  const savePlus = () => localStorage.setItem(KEY, JSON.stringify(plus));
  plus.essentials = Array.isArray(plus.essentials) ? plus.essentials : [];

  const dayOf = (ms) => { const d = new Date(ms); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); };
  const doneDays = () => {
    const set = new Set();
    for (const t of state.tasks) if (t.done && t.completedAt) set.add(dayOf(t.completedAt));
    for (const h of state.history) if (h.type === "task" && h.at) set.add(dayOf(h.at));
    return set;
  };
  function streak() {
    const days = doneDays(); let d = Core.today(), n = 0;
    if (!days.has(d)) d = Core.addDays(d, -1);
    while (days.has(d)) { n++; d = Core.addDays(d, -1); }
    return n;
  }
  function bestStreak() {
    const days = [...doneDays()].sort(); let best = 0, run = 0, prev = null;
    for (const d of days) { run = prev && Core.addDays(prev, 1) === d ? run + 1 : 1; best = Math.max(best, run); prev = d; }
    return best;
  }

  const essentialsToday = () => {
    const ids = new Set(state.tasks.map(t => t.id));
    plus.essentials = plus.essentials.filter(id => ids.has(id));
    return plus.essentials;
  };

  function greeting() {
    const h = new Date().getHours();
    const g = h < 5 ? "Boa noite" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
    const phrases = {
      "Bom dia": ["Um passo de cada vez.", "Comece pelo essencial.", "Hoje é um bom dia para avançar."],
      "Boa tarde": ["Ainda dá tempo de fazer o que importa.", "Respire e siga.", "Metade do dia, muito caminho feito."],
      "Boa noite": ["Hora de olhar o dia com carinho.", "Descanse: amanhã tem mais.", "Feche o dia em ordem."],
    }[g];
    const phrase = phrases[new Date().getDate() % phrases.length];
    return `<h1>${g}${state.name ? ", " + esc(state.name) : ""}.</h1><p class="plus-phrase">${phrase}</p>`;
  }

  const MS7 = 7 * 864e5;
  function backupBanner() {
    const last = plus.lastBackup || 0;
    if (Date.now() - last < MS7) return "";
    const txt = last ? "Seu último backup tem mais de 7 dias." : "Você ainda não salvou um backup.";
    return `<section class="plus-banner" role="status"><div><b>Proteja seus dados</b><small>${txt} Os dados ficam só neste aparelho.</small></div><div class="row"><button class="primary" data-action="backup">Salvar backup</button><button class="quiet" data-plus="backup-later">Depois</button></div></section>`;
  }

  function eveningReview() {
    const h = new Date().getHours(); if (h < 18) return "";
    const today = Core.today();
    if (plus.reviewDismissed === today) return "";
    const pending = state.tasks.filter(t => !t.archived && !t.done && t.date <= today && t.repeat === "none");
    if (!pending.length) return "";
    return `<section class="plus-review"><div><span class="eyebrow">RESUMO DA NOITE</span><b>${pending.length} tarefa(s) ainda pendente(s)</b><small>Quer passar para amanhã e começar o dia leve?</small></div><div class="row"><button class="primary" data-plus="move-tomorrow">Passar para amanhã</button><button class="quiet" data-plus="review-dismiss">Deixar como está</button></div></section>`;
  }

  function streakCard() {
    const s = streak(), b = bestStreak();
    return `<button class="plus-streak" data-plus="week-panel" aria-label="Ver resumo da semana"><span class="plus-flame" aria-hidden="true">${s ? "🔥" : "✦"}</span><span class="grow"><b>${s} dia(s) seguido(s)</b><small>${s ? "concluindo tarefas" : "Conclua uma tarefa hoje para começar"} · recorde ${b}</small></span><span class="plus-chev">Semana ›</span></button>`;
  }

  function essentialsSection() {
    const ids = essentialsToday();
    const items = ids.map(id => state.tasks.find(t => t.id === id)).filter(t => t && !t.archived);
    return `<section class="section plus-essentials"><div class="row"><h2>Essenciais do dia</h2><small class="muted">${items.length}/3</small></div>${items.length ? taskList(items) : '<p class="plus-hint">Toque na estrela ☆ de uma tarefa para marcá-la como essencial (até 3).</p>'}</section>`;
  }

  const origHome = home;
  home = function () {
    let html = origHome();
    html = html.replace(/^<h1>[\s\S]*?<\/h1>/, greeting());
    html = html.replace('<section class="daily-overview"', backupBanner() + eveningReview() + streakCard() + '<section class="daily-overview"');
    html = html.replace("</form>", "</form>" + essentialsSection());
    return html;
  };
  window.home = home;

  const origTaskList = taskList;
  taskList = function (tasks) {
    const ess = new Set(essentialsToday());
    let html = origTaskList(tasks);
    for (const t of tasks) {
      const on = ess.has(t.id);
      const star = `<button class="plus-star ${on ? "on" : ""}" data-plus="essential" data-id="${esc(t.id)}" aria-pressed="${on}" aria-label="${on ? "Remover dos essenciais" : "Marcar como essencial"}">${on ? "★" : "☆"}</button></article>`;
      const marker = `data-action="task-detail" data-id="${esc(t.id)}"`;
      const i = html.indexOf(marker); if (i < 0) continue;
      const j = html.indexOf("</article>", i);
      html = html.slice(0, j) + star + html.slice(j + 10);
      if (on) html = html.replace(new RegExp('<article class="task ([^"]*)"((?:(?!<article)[\\s\\S])*?' + marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ')'), '<article class="task $1 essential"$2');
    }
    return html;
  };

  /* Gráfico em rosca das despesas */
  const PALETTE = ["#2f6b55", "#e08a4b", "#5b8fb9", "#c9a227", "#9a6fb0", "#d0645a", "#6aa38a", "#8a7f6b"];
  spendingChart = function () {
    const rows = Core.spendByCategory(state, finMonth), total = rows.reduce((a, r) => a + r.amount, 0);
    if (!rows.length) return "";
    let acc = 0;
    const stops = rows.map((r, i) => { const a = acc; acc += r.amount / total * 360; return `${PALETTE[i % PALETTE.length]} ${a}deg ${acc}deg`; }).join(",");
    return `<div class="section row"><h2>Para onde foi?</h2><small>Despesas pagas</small></div><div class="card plus-donut-card"><div class="plus-donut" role="img" aria-label="Distribuição de despesas pagas por categoria" style="background:conic-gradient(${stops})"><span><small>Total</small><b>${money(total)}</b></span></div><div class="plus-legend">${rows.map((r, i) => `<div class="spending-row"><span><i class="plus-dot" style="background:${PALETTE[i % PALETTE.length]}"></i>${esc(r.category)}</span><small>${Math.round(r.amount / total * 100)}%</small><b>${money(r.amount)}</b></div>`).join("")}</div></div>`;
  };

  function waterWeek() {
    const h = waterData(), t = Core.today();
    const days = Array.from({ length: 7 }, (_, i) => { const date = Core.addDays(t, i - 6); return { date, ...Hydration.day(h, date) }; });
    const max = Math.max(1, ...days.map(d => d.water), Hydration.goal(h, t) || 0);
    const names = ["D","S","T","Q","Q","S","S"];
    return `<div class="section"><h2>Sua semana</h2></div><div class="card plus-bars" aria-label="Água nos últimos 7 dias">${days.map(d => `<div class="plus-bar ${d.date === t ? "today" : ""}"><small>${d.water ? (d.water/1000).toFixed(1).replace(".", ",") + "L" : ""}</small><span><i style="height:${d.water / max * 100}%"></i></span><b>${names[new Date(d.date + "T12:00").getDay()]}</b></div>`).join("")}</div>`;
  }
  const origHydration = hydration;
  hydration = function () {
    const html = origHydration();
    if (!html.includes("water-hero")) return html;
    return html.replace('<div class="section"><h2>Já bebeu', waterWeek() + '<div class="section"><h2>Já bebeu');
  };

  /* Painel semanal */
  function weekPanel() {
    const t = Core.today(), from = Core.addDays(t, -6), inWeek = ms => { const d = dayOf(ms); return d >= from && d <= t; };
    const tasksDone = state.history.filter(h => h.type === "task" && h.at && inWeek(h.at)).length;
    const workouts = state.history.filter(h => h.type === "workout" && h.at && inWeek(h.at)).length;
    const hd = waterData(); let water = 0;
    for (let i = 0; i < 7; i++) water += Hydration.day(hd, Core.addDays(t, -i)).water;
    const spent = state.finance.entries.filter(e => e.type === "expense" && e.paid && e.date >= from && e.date <= t).reduce((a, e) => a + e.amount, 0);
    const week = Core.week(state);
    const max = Math.max(1, ...week.map(d => d.count));
    const body = `<p class="muted">Últimos 7 dias, de ${shortDate(from)} a hoje.</p><div class="plus-week-grid">
      <div class="plus-kpi"><span>✓</span><b>${tasksDone}</b><small>tarefas feitas</small></div>
      <div class="plus-kpi"><span>🏋</span><b>${workouts}</b><small>treino(s)</small></div>
      <div class="plus-kpi"><span>💧</span><b>${(water/1000).toFixed(1).replace(".", ",")} L</b><small>de água</small></div>
      <div class="plus-kpi"><span>R$</span><b>${money(spent)}</b><small>gastos pagos</small></div></div>
      <h3>Tarefas por dia</h3><div class="plus-bars small">${week.map(d => `<div class="plus-bar"><small>${d.count || ""}</small><span><i style="height:${d.count / max * 100}%"></i></span><b>${d.day.slice(8)}</b></div>`).join("")}</div>
      <p class="footnote">Sequência atual: ${streak()} dia(s) · Recorde: ${bestStreak()} dia(s)</p>`;
    modal("Sua semana", body);
  }

  /* Comemoração e vibração */
  function burst(x, y, big) {
    const layer = document.createElement("div"); layer.className = "plus-burst"; layer.setAttribute("aria-hidden", "true");
    const n = big ? 36 : 14;
    for (let i = 0; i < n; i++) {
      const p = document.createElement("i");
      const ang = Math.random() * Math.PI * 2, dist = (big ? 120 : 50) + Math.random() * (big ? 160 : 40);
      p.style.cssText = `left:${x}px;top:${y}px;--dx:${Math.cos(ang) * dist}px;--dy:${Math.sin(ang) * dist}px;background:${PALETTE[i % 4]}`;
      layer.appendChild(p);
    }
    document.body.appendChild(layer); setTimeout(() => layer.remove(), 1100);
  }
  function celebrateIfRecord() {
    const s = streak(), b = bestStreak(), today = Core.today();
    if (s >= 2 && s === b && plus.celebrated !== today + ":" + s) {
      plus.celebrated = today + ":" + s; savePlus();
      burst(innerWidth / 2, innerHeight / 3, true);
      setTimeout(() => toast(`Novo recorde: ${s} dias seguidos! 🔥`), 300);
    }
  }

  document.addEventListener("click", (e) => {
    const check = e.target.closest('[data-action="complete"]');
    if (check && check.getAttribute("aria-pressed") === "false") {
      const r = check.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, false);
      navigator.vibrate?.(25);
      setTimeout(celebrateIfRecord, 60);
    }
    if (e.target.closest('[data-action="backup"]')) { plus.lastBackup = Date.now(); savePlus(); setTimeout(() => page === "home" && render(), 50); }
    const el = e.target.closest("[data-plus]"); if (!el) return;
    e.preventDefault(); e.stopPropagation();
    const a = el.dataset.plus;
    if (a === "essential") {
      const id = el.dataset.id, list = essentialsToday();
      if (list.includes(id)) plus.essentials = list.filter(x => x !== id);
      else if (list.length >= 3) { toast("Você já tem 3 essenciais. Remova um para escolher outro."); return; }
      else { plus.essentials.push(id); navigator.vibrate?.(10); }
      savePlus(); render();
    }
    if (a === "backup-later") { plus.lastBackup = Date.now() - MS7 + 864e5; savePlus(); render(); }
    if (a === "review-dismiss") { plus.reviewDismissed = Core.today(); savePlus(); render(); }
    if (a === "move-tomorrow") {
      const today = Core.today(), tomorrow = Core.addDays(today, 1); let n = 0;
      commit(s => { for (const t of s.tasks) if (!t.archived && !t.done && t.date <= today && t.repeat === "none") { t.date = tomorrow; n++; } }, { message: "Tarefas passadas para amanhã." });
      plus.reviewDismissed = today; savePlus(); render();
    }
    if (a === "week-panel") weekPanel();
  }, true);

  /* Deslizar tarefas: direita conclui, esquerda adia um dia */
  let sw = null;
  document.addEventListener("touchstart", (e) => {
    const card = e.target.closest(".task"); if (!card || e.touches.length > 1) return;
    sw = { card, x: e.touches[0].clientX, y: e.touches[0].clientY, dx: 0, lock: null };
  }, { passive: true });
  document.addEventListener("touchmove", (e) => {
    if (!sw) return;
    const dx = e.touches[0].clientX - sw.x, dy = e.touches[0].clientY - sw.y;
    if (sw.lock === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) sw.lock = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    if (sw.lock !== "x") return;
    sw.dx = dx; sw.card.style.transform = `translateX(${dx}px)`;
    sw.card.classList.toggle("swipe-done", dx > 60); sw.card.classList.toggle("swipe-later", dx < -60);
  }, { passive: true });
  document.addEventListener("touchend", () => {
    if (!sw) return; const { card, dx } = sw; sw = null;
    card.style.transform = ""; card.classList.remove("swipe-done", "swipe-later");
    if (dx > 80) card.querySelector('[data-action="complete"]')?.click();
    else if (dx < -80) {
      const id = card.querySelector('[data-action="complete"]')?.dataset.id;
      const t = state.tasks.find(x => x.id === id);
      if (!t) return;
      if (t.repeat !== "none") { toast("Tarefas recorrentes não podem ser adiadas por aqui."); return; }
      navigator.vibrate?.(15);
      commit(s => { const x = s.tasks.find(x => x.id === id); x.date = Core.addDays(x.date > Core.today() ? x.date : Core.today(), 1); }, { message: "Tarefa adiada para amanhã." });
    }
  });

  render();
})();
