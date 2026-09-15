/* Núcleo de la app: registro de módulos, solapas, utilidades comunes.
   Cada módulo se registra con App.register({ id, title, icon, status?, render(root) }). */
const App = (() => {
  const VERSION = "0.1.0";
  const modules = [];
  const STORAGE_TAB = "taller:tab";

  /* ---------- Utilidades compartidas ---------- */
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); }
      catch { return fallback; }
    },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} },
  };

  /** Convierte "7,3" / "7.3" a número. Devuelve null si no es válido. */
  function num(text) {
    if (text === null || text === undefined) return null;
    const t = String(text).trim().replace(",", ".");
    if (t === "") return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }

  /** Formatea con decimales fijos y coma decimal. */
  function fmt(n, dec = 2) {
    if (n === null || n === undefined || !Number.isFinite(n)) return "—";
    return n.toFixed(dec).replace(".", ",");
  }

  /** Crea un elemento: el("div", {class:"x", text:"hola"}, [hijos]) */
  function el(tag, attrs = {}, children = []) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") e.className = v;
      else if (k === "text") e.textContent = v;
      else if (k === "html") e.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined && v !== false) e.setAttribute(k, v === true ? "" : v);
    }
    for (const c of [].concat(children)) if (c !== null && c !== undefined) e.append(c);
    return e;
  }

  let toastTimer = null;
  function toast(msg, ms = 2200) {
    const t = document.getElementById("toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, ms);
  }

  /* ---------- Módulos y solapas ---------- */
  function register(mod) { modules.push(mod); }

  function buildTabs() {
    const tabs = document.getElementById("tabs");
    const panels = document.getElementById("panels");
    for (const m of modules) {
      const tab = el("button", {
        class: "tab", role: "tab", type: "button", id: `tab-${m.id}`,
        "aria-selected": "false", "aria-controls": `panel-${m.id}`,
        onclick: () => select(m.id),
      }, [
        el("span", { class: "ico", text: m.icon || "" }),
        el("span", { text: m.title }),
        m.status ? el("span", { class: "badge", text: m.status }) : null,
      ]);
      tabs.append(tab);

      const panel = el("section", { class: "panel", role: "tabpanel", id: `panel-${m.id}`, "aria-labelledby": `tab-${m.id}`, hidden: true });
      panels.append(panel);
    }
  }

  const rendered = new Set();
  function select(id) {
    for (const m of modules) {
      const on = m.id === id;
      document.getElementById(`tab-${m.id}`).setAttribute("aria-selected", on ? "true" : "false");
      const panel = document.getElementById(`panel-${m.id}`);
      panel.hidden = !on;
      if (on && !rendered.has(m.id)) { m.render(panel, api); rendered.add(m.id); }
    }
    store.set(STORAGE_TAB, id);
  }

  /* ---------- Pantalla encendida (Wake Lock) ---------- */
  let wakeLock = null;
  async function toggleWake(btn) {
    if (!("wakeLock" in navigator)) { toast("Este navegador no permite bloquear la pantalla"); return; }
    if (wakeLock) { await wakeLock.release(); wakeLock = null; btn.setAttribute("aria-pressed", "false"); return; }
    try {
      wakeLock = await navigator.wakeLock.request("screen");
      btn.setAttribute("aria-pressed", "true");
      wakeLock.addEventListener("release", () => { wakeLock = null; btn.setAttribute("aria-pressed", "false"); });
    } catch { toast("No se pudo mantener la pantalla encendida"); }
  }
  document.addEventListener("visibilitychange", async () => {
    // Al volver a la app, reintentar el bloqueo si estaba activo
    const btn = document.getElementById("btn-wake");
    if (document.visibilityState === "visible" && btn.getAttribute("aria-pressed") === "true" && !wakeLock) {
      try { wakeLock = await navigator.wakeLock.request("screen"); } catch {}
    }
  });

  /* ---------- Estado de red y service worker ---------- */
  function updateOnline() {
    document.getElementById("online-state").textContent = navigator.onLine ? "" : "Sin conexión · funciona igual";
  }

  function start() {
    buildTabs();
    const last = store.get(STORAGE_TAB, modules[0]?.id);
    select(modules.some(m => m.id === last) ? last : modules[0].id);

    document.getElementById("version").textContent = `v${VERSION}`;
    document.getElementById("btn-wake").addEventListener("click", (e) => toggleWake(e.currentTarget));
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    updateOnline();

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").then(reg => {
        reg.addEventListener("updatefound", () => {
          const nw = reg.installing;
          nw && nw.addEventListener("statechange", () => {
            if (nw.state === "installed" && navigator.serviceWorker.controller) toast("Aplicación actualizada.", 3000);
          });
        });
      }).catch(() => {});
    }
  }

  const api = { store, num, fmt, el, toast, VERSION };
  return { register, start, ...api };
})();
