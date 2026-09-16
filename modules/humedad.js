/* Módulo: humedad relativa + temperatura → contenido de humedad de equilibrio (EMC) de la madera.
   Fórmula de Hailwood–Horrobin ajustada por Simpson (USDA Wood Handbook, cap. 4), con T en °F.
   Verificada contra la tabla 4-2 del Wood Handbook (21 °C: 30 % → 6,2 · 50 % → 9,2 · 65 % → 12,0 · 80 % → 16,0). */
App.register({
  id: "humedad",
  title: "Humedad",
  icon: "💧",
  render(root, { store, num, fmt, el }) {
    const KEY_STATE = "taller:humedad:estado";
    let state = Object.assign({ rh: "", temp: "20", okMin: 40, okMax: 50, tolerancia: 5 }, store.get(KEY_STATE, {}));
    const save = () => store.set(KEY_STATE, state);

    /* ---------- cálculo ---------- */
    function emc(rh, tc) {
      const T = tc * 9 / 5 + 32;
      const W = 330 + 0.452 * T + 0.00415 * T * T;
      const K = 0.791 + 0.000463 * T - 0.000000844 * T * T;
      const K1 = 6.34 + 0.000775 * T - 0.0000935 * T * T;
      const K2 = 1.09 + 0.0284 * T - 0.0000904 * T * T;
      const h = Math.min(rh, 99.5) / 100;
      const Kh = K * h;
      return 1800 / W * (Kh / (1 - Kh) + (K1 * Kh + 2 * K1 * K2 * Kh * Kh) / (1 + K1 * Kh + K1 * K2 * Kh * Kh));
    }
    /** HR necesaria para un EMC dado (bisección). */
    function rhForEmc(target, tc) {
      let lo = 0, hi = 99.5;
      for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (emc(mid, tc) < target) lo = mid; else hi = mid; }
      return (lo + hi) / 2;
    }

    function estado(rh) {
      const { okMin, okMax, tolerancia: t } = state;
      if (rh >= okMin && rh <= okMax) return { nivel: "ok", titulo: "Buen momento para encolar y armar", detalle: "La humedad está dentro del rango objetivo del taller." };
      if (rh >= okMin - t && rh < okMin) return { nivel: "casi", titulo: "Aceptable, algo seco", detalle: "Apenas por debajo del rango. Se puede trabajar; evitar que la madera siga secando." };
      if (rh > okMax && rh <= okMax + t) return { nivel: "casi", titulo: "Aceptable, algo húmedo", detalle: "Apenas por encima del rango. Conviene esperar si no hay apuro." };
      if (rh < okMin - t) return { nivel: "no", titulo: "Muy seco: no encolar tapas ni fondos", detalle: "La madera está más seca de lo previsto; al subir la humedad va a hincharse y puede abovedar o rajar." };
      return { nivel: "no", titulo: "Demasiado húmedo: esperar", detalle: "Si se encola ahora, al bajar la humedad la madera va a contraerse y puede rajar." };
    }

    /* ---------- entradas ---------- */
    const inpRh = el("input", { type: "text", inputmode: "decimal", id: "hu-rh", placeholder: "45", autocomplete: "off", oninput: () => { state.rh = inpRh.value; calc(); save(); } });
    const inpTemp = el("input", { type: "text", inputmode: "decimal", id: "hu-temp", placeholder: "20", autocomplete: "off", oninput: () => { state.temp = inpTemp.value; calc(); save(); } });

    const outEmc = el("span", { class: "v" });
    const resEmc = el("div", { class: "result hero" }, [el("span", { class: "k", text: "Humedad de la madera (EMC)" }), outEmc]);
    const semTitulo = el("p", { class: "sem-titulo" });
    const semDetalle = el("p", { class: "muted small" });
    const semaforo = el("div", { class: "semaforo" }, [semTitulo, semDetalle]);
    const outRango = el("p", { class: "muted small" });

    /* ---------- rango objetivo ---------- */
    const inpMin = el("input", { type: "text", inputmode: "decimal", id: "hu-min", "aria-label": "HR mínima", oninput: () => { const v = num(inpMin.value); if (v !== null && v >= 0 && v < state.okMax) { state.okMin = v; calc(); save(); } } });
    const inpMax = el("input", { type: "text", inputmode: "decimal", id: "hu-max", "aria-label": "HR máxima", oninput: () => { const v = num(inpMax.value); if (v !== null && v > state.okMin && v <= 100) { state.okMax = v; calc(); save(); } } });
    const inpTol = el("input", { type: "text", inputmode: "decimal", id: "hu-tol", "aria-label": "Tolerancia", oninput: () => { const v = num(inpTol.value); if (v !== null && v >= 0) { state.tolerancia = v; calc(); save(); } } });

    /* ---------- tabla de referencia ---------- */
    const tabla = el("table", { class: "tabla" });
    function renderTabla(tc, rhActual) {
      const filas = [];
      for (let rh = 30; rh <= 80; rh += 5) {
        const e = estado(rh);
        const esActual = rhActual !== null && Math.abs(rh - rhActual) < 2.5;
        filas.push(el("tr", { class: `niv-${e.nivel}${esActual ? " actual" : ""}` }, [
          el("td", { text: `${rh} %` }),
          el("td", { text: `${fmt(emc(rh, tc), 1)} %` }),
          el("td", { text: e.nivel === "ok" ? "encolar" : e.nivel === "casi" ? "aceptable" : rh < state.okMin ? "seco" : "húmedo" }),
        ]));
      }
      tabla.replaceChildren(
        el("thead", {}, el("tr", {}, [el("th", { text: "HR" }), el("th", { text: "EMC madera" }), el("th", { text: "" })])),
        el("tbody", {}, filas),
      );
    }

    function calc() {
      const rh = num(inpRh.value), tc = num(inpTemp.value);
      inpRh.classList.toggle("invalid", inpRh.value.trim() !== "" && (rh === null || rh < 0 || rh > 100));
      inpTemp.classList.toggle("invalid", inpTemp.value.trim() !== "" && (tc === null || tc < -20 || tc > 60));
      const tcOk = tc !== null && tc >= -20 && tc <= 60 ? tc : 20;
      const emcMin = emc(state.okMin, tcOk), emcMax = emc(state.okMax, tcOk);
      outRango.textContent = `Rango objetivo: HR ${fmt(state.okMin, 0)}–${fmt(state.okMax, 0)} % (± ${fmt(state.tolerancia, 0)} % aceptable), que a ${fmt(tcOk, 0)} °C deja la madera entre ${fmt(emcMin, 1)} y ${fmt(emcMax, 1)} % de humedad.`;
      if (rh === null || rh < 0 || rh > 100) {
        outEmc.textContent = "—"; semaforo.className = "semaforo"; semTitulo.textContent = "Indicar la humedad relativa del taller"; semDetalle.textContent = "";
        renderTabla(tcOk, null); return;
      }
      outEmc.innerHTML = `${fmt(emc(rh, tcOk), 1)}<small>%</small>`;
      const e = estado(rh);
      semaforo.className = `semaforo niv-${e.nivel}`;
      semTitulo.textContent = e.titulo; semDetalle.textContent = e.detalle;
      renderTabla(tcOk, rh);
    }

    /* ---------- armado ---------- */
    root.append(
      el("div", { class: "card" }, [
        el("h2", { text: "Ambiente del taller" }),
        el("div", { class: "row" }, [
          el("div", { class: "field" }, [el("label", { for: "hu-rh", text: "Humedad relativa" }), el("div", { class: "row" }, [inpRh, el("span", { class: "unit fixed", text: "%" })])]),
          el("div", { class: "field" }, [el("label", { for: "hu-temp", text: "Temperatura" }), el("div", { class: "row" }, [inpTemp, el("span", { class: "unit fixed", text: "°C" })])]),
        ]),
        el("div", { class: "results" }, [resEmc]),
        semaforo,
        outRango,
      ]),

      el("div", { class: "card" }, [
        el("h2", { text: "Referencia a esta temperatura" }),
        el("div", { style: "overflow-x:auto" }, tabla),
        el("p", { class: "muted small", text: "EMC = contenido de humedad que alcanza la madera si se estabiliza en ese ambiente. Estabilizar lleva días o semanas según el espesor; el valor indica hacia dónde va, no dónde está hoy." }),
      ]),

      el("details", { class: "card" }, [
        el("summary", { text: "Rango objetivo del taller" }),
        el("p", { class: "muted small", style: "margin-top:12px", text: "Humedad relativa en la que conviene encolar y armar. El valor habitual para guitarra clásica es 40–50 %." }),
        el("div", { class: "row" }, [
          el("div", { class: "field" }, [el("label", { for: "hu-min", text: "HR mínima" }), el("div", { class: "row" }, [inpMin, el("span", { class: "unit fixed", text: "%" })])]),
          el("div", { class: "field" }, [el("label", { for: "hu-max", text: "HR máxima" }), el("div", { class: "row" }, [inpMax, el("span", { class: "unit fixed", text: "%" })])]),
          el("div", { class: "field" }, [el("label", { for: "hu-tol", text: "Tolerancia" }), el("div", { class: "row" }, [inpTol, el("span", { class: "unit fixed", text: "%" })])]),
        ]),
      ]),
    );

    inpRh.value = state.rh || ""; inpTemp.value = state.temp || "";
    inpMin.value = fmt(state.okMin, 0); inpMax.value = fmt(state.okMax, 0); inpTol.value = fmt(state.tolerancia, 0);
    calc();
  },
});
