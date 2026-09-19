/* Módulo: Adhesivos — hoja de referencia. El contenido NO está en el código:
   se lee de data/adhesivos.json (secciones[] → bloques[] de tipo parrafo | subtitulo | tabla | lista | pasos).
   Los textos traen **negrita** estilo markdown; se renderiza con nodos DOM (sin innerHTML). */
App.register({
  id: "adhesivos",
  title: "Adhesivos",
  icon: "🧴",
  render(root, { el }) {
    const DATA_URL = "data/adhesivos.json";
    const DEFAULT_SECTION = "referencia-rapida-cola-caliente";

    let data = null;
    let activeId = DEFAULT_SECTION;
    let query = "";

    /* ---------- texto: normalización, negrita y resaltado ---------- */
    const normChar = c => (c.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()[0] || c);
    const norm = s => Array.from(String(s), normChar).join("");
    const plain = s => String(s).replace(/\*\*/g, "");
    const matches = (s, q) => norm(plain(s)).includes(q);

    /** Devuelve nodos DOM para un texto con **negrita**, resaltando q (ya normalizada) si se indica. */
    function rich(text, q) {
      const out = [];
      const parts = String(text).split(/(\*\*[^*]+\*\*)/g).filter(p => p !== "");
      for (const part of parts) {
        const bold = part.startsWith("**") && part.endsWith("**") && part.length > 4;
        const txt = bold ? part.slice(2, -2) : part;
        const nodes = highlight(txt, q);
        out.push(bold ? el("strong", {}, nodes) : nodes);
      }
      return out.flat();
    }
    function highlight(txt, q) {
      if (!q) return [document.createTextNode(txt)];
      const chars = Array.from(txt); const n = chars.map(normChar).join("");
      const nodes = []; let from = 0, i;
      while ((i = n.indexOf(q, from)) !== -1) {
        if (i > from) nodes.push(document.createTextNode(chars.slice(from, i).join("")));
        nodes.push(el("mark", { text: chars.slice(i, i + q.length).join("") }));
        from = i + q.length;
      }
      if (from < chars.length) nodes.push(document.createTextNode(chars.slice(from).join("")));
      return nodes;
    }

    /* ---------- bloques ---------- */
    function renderTabla(b, q) {
      const filas = q ? b.filas.filter(f => f.some(c => matches(c, q))) : b.filas;
      if (q && filas.length === 0) return null;
      const tabla = el("table", { class: "adh-tabla", style: `--cols:${b.columnas.length}` }, [
        el("thead", {}, el("tr", {}, b.columnas.map(c => el("th", { scope: "col" }, rich(c))))),
        el("tbody", {}, filas.map(f => el("tr", {}, f.map((c, i) => el(i === 0 ? "th" : "td", i === 0 ? { scope: "row" } : {}, rich(c, q)))))),
      ]);
      return el("div", { class: "adh-bloque" }, [
        el("div", { class: "adh-tabla-wrap", tabindex: "0", role: "region", "aria-label": `Tabla: ${b.columnas.join(", ")}` }, tabla),
        q ? el("p", { class: "muted small adh-cuenta", text: `${filas.length} de ${b.filas.length} filas` }) : null,
      ]);
    }
    function renderLista(b, q) {
      const ordered = b.tipo === "pasos";
      const items = b.items.map((t, i) => ({ t, n: i + 1 })).filter(it => !q || matches(it.t, q));
      if (q && items.length === 0) return null;
      return el("div", { class: "adh-bloque" }, [
        el(ordered ? "ol" : "ul", { class: ordered ? "adh-pasos" : "adh-lista" },
          items.map(it => el("li", ordered ? { value: String(it.n) } : {}, rich(it.t, q)))),
        q ? el("p", { class: "muted small adh-cuenta", text: `${items.length} de ${b.items.length} ${ordered ? "pasos" : "items"}` }) : null,
      ]);
    }

    /** Sección completa (sin búsqueda) o solo tablas/listas con coincidencias (con búsqueda). */
    function renderSeccion(sec, q) {
      const hijos = []; let hits = 0; let subtituloPendiente = null;
      for (const b of sec.bloques) {
        if (b.tipo === "parrafo") { if (!q) hijos.push(el("p", { class: "adh-parrafo" }, rich(b.texto))); }
        else if (b.tipo === "subtitulo") { const h = el("h3", { class: "adh-subtitulo" }, rich(b.texto)); if (q) subtituloPendiente = h; else hijos.push(h); }
        else if (b.tipo === "tabla" || b.tipo === "lista" || b.tipo === "pasos") {
          const nodo = b.tipo === "tabla" ? renderTabla(b, q) : renderLista(b, q);
          if (!nodo) continue;
          if (q) {
            hits += nodo.querySelectorAll(b.tipo === "tabla" ? "tbody tr" : "li").length;
            if (subtituloPendiente) { hijos.push(subtituloPendiente); subtituloPendiente = null; }
          }
          hijos.push(nodo);
        }
      }
      if (q && hits === 0) return { nodo: null, hits: 0 };
      const nodo = el("section", { class: "card adh-seccion", id: `adh-${sec.id}`, "data-sec": sec.id }, [
        el("h2", {}, [document.createTextNode(sec.titulo), q ? el("span", { class: "adh-hits", text: ` · ${hits}` }) : null]),
        ...hijos,
      ]);
      return { nodo, hits };
    }

    /* ---------- estructura fija del panel ---------- */
    const cabecera = el("div", { class: "adh-cabecera" });
    const inpBuscar = el("input", { type: "search", id: "adh-buscar", placeholder: "Buscar en tablas y listas…", autocomplete: "off", enterkeyhint: "search",
      "aria-label": "Buscar en tablas y listas", oninput: () => { query = norm(inpBuscar.value.trim()); pintar(); } });
    const btnLimpiar = el("button", { class: "btn fixed", type: "button", text: "Limpiar", hidden: true, onclick: () => { inpBuscar.value = ""; query = ""; pintar(); inpBuscar.focus(); } });
    const subnav = el("nav", { class: "adh-subnav", "aria-label": "Secciones de adhesivos" });
    const resumen = el("p", { class: "muted small adh-resumen", role: "status", "aria-live": "polite" });
    const barra = el("div", { class: "card adh-barra" }, [el("div", { class: "row" }, [inpBuscar, btnLimpiar]), subnav, resumen]);
    const contenido = el("div", { class: "adh-contenido" });
    root.append(cabecera, barra, contenido);

    function pintarSubnav(hitsPorSeccion) {
      subnav.replaceChildren(...data.secciones.map(sec => {
        const hits = hitsPorSeccion ? hitsPorSeccion[sec.id] || 0 : null;
        return el("button", {
          type: "button", class: "adh-chip", "data-sec": sec.id,
          "aria-pressed": !query && sec.id === activeId ? "true" : "false",
          disabled: !!query && hits === 0,
          onclick: () => irA(sec.id),
        }, [document.createTextNode(sec.titulo), hits ? el("span", { class: "adh-chip-n", text: String(hits) }) : null]);
      }));
    }

    function irA(id) {
      activeId = id;
      if (query) { document.getElementById(`adh-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
      pintar();
      barra.scrollIntoView({ block: "start" });
    }

    function pintar() {
      if (!data) return;
      btnLimpiar.hidden = !query;
      if (!query) {
        const sec = data.secciones.find(s => s.id === activeId) || data.secciones[0];
        activeId = sec.id;
        contenido.replaceChildren(renderSeccion(sec, "").nodo);
        resumen.textContent = "";
        pintarSubnav(null);
        subnav.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: "nearest", inline: "center" });
        return;
      }
      const hitsPorSeccion = {}; const nodos = []; let total = 0;
      for (const sec of data.secciones) {
        const r = renderSeccion(sec, query);
        hitsPorSeccion[sec.id] = r.hits; total += r.hits;
        if (r.nodo) nodos.push(r.nodo);
      }
      contenido.replaceChildren(...(nodos.length ? nodos : [el("div", { class: "card placeholder" }, [
        el("p", { text: "Sin coincidencias en tablas ni listas." }),
        el("p", { class: "muted small", text: "Probar con otra palabra. La búsqueda ignora mayúsculas y tildes." }),
      ])]));
      resumen.textContent = total ? `${total} ${total === 1 ? "coincidencia" : "coincidencias"} en ${nodos.length} ${nodos.length === 1 ? "sección" : "secciones"}` : "";
      pintarSubnav(hitsPorSeccion);
    }

    /* ---------- carga de datos ---------- */
    async function cargar() {
      contenido.replaceChildren(el("div", { class: "card placeholder" }, [el("p", { class: "muted", text: "Cargando…" })]));
      try {
        const res = await fetch(DATA_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json || !Array.isArray(json.secciones) || json.secciones.length === 0) throw new Error("formato inesperado");
        data = json;
        if (!data.secciones.some(s => s.id === activeId)) activeId = data.secciones[0].id;
        cabecera.replaceChildren(
          el("h2", { class: "adh-titulo", text: data.titulo || "Adhesivos" }),
          el("p", { class: "muted small", text: [data.subtitulo, data.actualizado ? `Actualizado: ${data.actualizado}` : ""].filter(Boolean).join(" · ") }),
        );
        pintar();
      } catch (e) {
        barra.hidden = true;
        contenido.replaceChildren(el("div", { class: "card placeholder" }, [
          el("p", { text: "No se pudo cargar el contenido de adhesivos." }),
          el("p", { class: "muted small", text: `Archivo: ${DATA_URL} (${e.message}). Abrir la app una vez con conexión para que quede guardado.` }),
          el("button", { class: "btn primary", type: "button", text: "Reintentar", onclick: () => { barra.hidden = false; cargar(); } }),
        ]));
      }
    }
    cargar();
  },
});
