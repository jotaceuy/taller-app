/* Módulo: humedad relativa + temperatura → contenido de humedad de equilibrio (EMC) de la madera.
   Fórmula de Hailwood–Horrobin ajustada por Simpson (USDA Wood Handbook, cap. 4), con T en °F.
   Verificada contra la tabla 4-2 del Wood Handbook (21 °C: 30 % → 6,2 · 50 % → 9,2 · 65 % → 12,0 · 80 % → 16,0). */
App.register({
  id: "humedad",
  title: "Humedad",
  icon: "💧",
  render(root, { store, num, fmt, el }) {
    const KEY_STATE = "taller:humedad:estado";
    let state = Object.assign({ rh: "", temp: "20", okMin: 40, okMax: 50, tolerancia: 5, pin: "", sup: "", esp: "", minEsp: 10 }, store.get(KEY_STATE, {}));
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

    /* ---------- medición de la pieza ---------- */
    const inpPin = el("input", { type: "text", inputmode: "decimal", id: "hu-pin", placeholder: "—", autocomplete: "off", oninput: () => { state.pin = inpPin.value; calc(); save(); } });
    const inpSup = el("input", { type: "text", inputmode: "decimal", id: "hu-sup", placeholder: "—", autocomplete: "off", oninput: () => { state.sup = inpSup.value; calc(); save(); } });
    const inpEsp = el("input", { type: "text", inputmode: "decimal", id: "hu-esp", placeholder: "—", autocomplete: "off", oninput: () => { state.esp = inpEsp.value; calc(); save(); } });
    const inpMinEsp = el("input", { type: "text", inputmode: "decimal", id: "hu-minesp", "aria-label": "Espesor mínimo del medidor de superficie", oninput: () => { const v = num(inpMinEsp.value); if (v !== null && v >= 0) { state.minEsp = v; calc(); save(); } } });

    const outPieza = el("span", { class: "v" });
    const resPieza = el("div", { class: "result hero" }, [el("span", { class: "k", text: "Humedad estimada de la pieza" }), outPieza]);
    const avisoSup = el("p", { class: "note small" });
    const diagGrad = el("p", { class: "small" });
    const diagAmb = el("p", { class: "small" });
    const verTitulo = el("p", { class: "sem-titulo" });
    const verDetalle = el("p", { class: "muted small" });
    const veredicto = el("div", { class: "semaforo" }, [verTitulo, verDetalle]);

    /** Devuelve {est, margen, uniforme, gradiente, supValida} o null si no hay lecturas. */
    function analizarPieza() {
      const pin = num(inpPin.value), sup = num(inpSup.value), esp = num(inpEsp.value);
      const pinOk = pin !== null && pin >= 0 && pin <= 40, supOk = sup !== null && sup >= 0 && sup <= 40;
      inpPin.classList.toggle("invalid", inpPin.value.trim() !== "" && !pinOk);
      inpSup.classList.toggle("invalid", inpSup.value.trim() !== "" && !supOk);
      const supValida = supOk && (esp === null || esp >= state.minEsp);
      avisoSup.hidden = !(supOk && esp !== null && esp < state.minEsp);
      avisoSup.textContent = avisoSup.hidden ? "" : `Con ${fmt(esp, 1)} mm de espesor la lectura de superficie no es confiable (mínimo ${fmt(state.minEsp, 0)} mm): se usa solo la de pinchos. Para piezas finas, apilar varias o pesarlas.`;
      if (!pinOk && !supValida) return null;
      if (pinOk && supValida) {
        const d = sup - pin, ad = Math.abs(d);
        if (ad <= 1) return { est: (pin + sup) / 2, margen: 1, uniforme: true, gradiente: "uniforme", inconsistente: false };
        if (ad <= 2.5) return { est: (pin + sup) / 2, margen: 1.5, uniforme: false, gradiente: d > 0 ? "nucleo" : "cara", inconsistente: false };
        return { est: pin, margen: 2, uniforme: false, gradiente: d > 0 ? "nucleo" : "cara", inconsistente: true };
      }
      return { est: pinOk ? pin : sup, margen: 1, uniforme: true, gradiente: "solo", fuente: pinOk ? "pinchos" : "superficie", inconsistente: false };
    }

    function calcPieza(rh, tc) {
      const a = analizarPieza();
      if (!a) {
        outPieza.textContent = "—"; diagGrad.textContent = ""; diagAmb.textContent = "";
        veredicto.className = "semaforo"; verTitulo.textContent = "Cargar las lecturas del medidor"; verDetalle.textContent = "Con pinchos, superficie o ambos. El espesor sirve para saber si la lectura de superficie vale."; return;
      }
      outPieza.innerHTML = `${fmt(a.est, 1)}<small>% ± ${fmt(a.margen, 1)}</small>`;
      const textoGrad = {
        uniforme: "Las dos lecturas coinciden: humedad uniforme entre cara y núcleo.",
        nucleo: "Superficie por encima de pinchos: el núcleo está más húmedo que la cara. La pieza sigue secando desde adentro.",
        cara: "Pinchos por encima de superficie: la cara absorbió humedad hace poco. Suele emparejarse en pocos días.",
        solo: `Una sola lectura (${a.fuente}); no se puede saber si hay gradiente entre cara y núcleo.`,
      }[a.gradiente];
      diagGrad.textContent = a.inconsistente ? `Las lecturas difieren más de 2,5 puntos: revisar la medición (especie mal corregida, espesor, contacto) antes que la madera. ${textoGrad}` : textoGrad;

      // Comparación con el ambiente
      const hayAmbiente = rh !== null;
      const e = hayAmbiente ? emc(rh, tc) : null;
      const emcMin = emc(state.okMin, tc), emcMax = emc(state.okMax, tc);
      const enObjetivo = a.est >= emcMin - 0.5 && a.est <= emcMax + 0.5;
      let dif = null;
      if (hayAmbiente) {
        dif = a.est - e;
        diagAmb.textContent = Math.abs(dif) <= 1
          ? `En equilibrio con el taller (EMC ${fmt(e, 1)} %).`
          : dif > 0
            ? `La pieza está ${fmt(dif, 1)} puntos más húmeda que el ambiente (EMC ${fmt(e, 1)} %): va a contraerse al seguir secando.`
            : `La pieza está ${fmt(-dif, 1)} puntos más seca que el ambiente (EMC ${fmt(e, 1)} %): va a hincharse al absorber.`;
      } else {
        diagAmb.textContent = `Sin humedad del taller cargada. Objetivo para la madera a ${fmt(tc, 0)} °C: ${fmt(emcMin, 1)}–${fmt(emcMax, 1)} %.`;
      }

      // Veredicto combinado
      const amb = hayAmbiente ? estado(rh).nivel : null;
      let nivel, titulo, detalle;
      if (a.inconsistente) {
        nivel = "casi"; titulo = "Repetir la medición"; detalle = "Las lecturas no son coherentes entre sí. Corregir especie o espesor y medir de nuevo antes de decidir.";
      } else if (a.gradiente === "nucleo") {
        nivel = "no"; titulo = "Esperar: la pieza sigue secando"; detalle = "Aunque el ambiente esté bien, el núcleo todavía no llegó. Volver a medir en unos días.";
      } else if (a.gradiente === "cara") {
        nivel = "casi"; titulo = "Esperar unos días"; detalle = "La cara está húmeda por un cambio reciente. Cuando pinchos y superficie coincidan, medir de nuevo.";
      } else if (hayAmbiente && Math.abs(dif) > 2) {
        nivel = "no"; titulo = dif > 0 ? "Esperar: la pieza está más húmeda que el taller" : "Esperar: la pieza está más seca que el taller"; detalle = "Se va a mover al equilibrarse. Dejarla en el taller hasta que se acerque al EMC.";
      } else if (hayAmbiente && Math.abs(dif) > 1) {
        nivel = "casi"; titulo = "Casi: esperar unos días más"; detalle = "La pieza está cerca del equilibrio pero todavía se mueve. Medir de nuevo en dos o tres días.";
      } else if (!enObjetivo) {
        nivel = "no"; titulo = a.est > emcMax ? "No encolar: madera demasiado húmeda" : "No encolar: madera demasiado seca"; detalle = `Fuera del objetivo de ${fmt(emcMin, 1)}–${fmt(emcMax, 1)} % para el rango de HR del taller.`;
      } else if (!hayAmbiente) {
        nivel = "casi"; titulo = "Pieza en objetivo; falta el ambiente"; detalle = "Cargar la humedad relativa del taller arriba para confirmar que la pieza está en equilibrio y no se va a mover.";
      } else if (amb === "no") {
        nivel = "no"; titulo = "La pieza está bien, el ambiente no"; detalle = "Si se encola ahora, el ambiente la va a mover después. Esperar a que el taller entre en rango.";
      } else if (amb === "casi") {
        nivel = "casi"; titulo = "Se puede encolar; ambiente al límite"; detalle = "La pieza está estable y en objetivo. Trabajar rápido y no dejar la caja abierta días en este ambiente.";
      } else if (a.gradiente === "solo") {
        nivel = "casi"; titulo = "Probablemente sí, con una sola lectura"; detalle = "Pieza en objetivo y en equilibrio, pero sin confirmar el gradiente. Si se puede, medir con el otro medidor.";
      } else {
        nivel = "ok"; titulo = "Encolar: pieza y ambiente en equilibrio"; detalle = "Las lecturas coinciden entre sí, con el ambiente y con el objetivo. Es el mejor momento.";
      }
      veredicto.className = `semaforo niv-${nivel}`; verTitulo.textContent = titulo; verDetalle.textContent = detalle;
    }

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
        renderTabla(tcOk, null); calcPieza(null, tcOk); return;
      }
      outEmc.innerHTML = `${fmt(emc(rh, tcOk), 1)}<small>%</small>`;
      const e = estado(rh);
      semaforo.className = `semaforo niv-${e.nivel}`;
      semTitulo.textContent = e.titulo; semDetalle.textContent = e.detalle;
      renderTabla(tcOk, rh);
      calcPieza(rh, tcOk);
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
        el("h2", { text: "Medición de la pieza" }),
        el("div", { class: "row" }, [
          el("div", { class: "field" }, [el("label", { for: "hu-pin", text: "Medidor de pinchos" }), el("div", { class: "row" }, [inpPin, el("span", { class: "unit fixed", text: "%" })])]),
          el("div", { class: "field" }, [el("label", { for: "hu-sup", text: "Medidor de superficie" }), el("div", { class: "row" }, [inpSup, el("span", { class: "unit fixed", text: "%" })])]),
          el("div", { class: "field" }, [el("label", { for: "hu-esp", text: "Espesor de la pieza" }), el("div", { class: "row" }, [inpEsp, el("span", { class: "unit fixed", text: "mm" })])]),
        ]),
        avisoSup,
        el("div", { class: "results" }, [resPieza]),
        diagGrad, diagAmb,
        veredicto,
        el("p", { class: "muted small", text: "Pinchos: humedad local en los primeros milímetros, corregir por especie. Superficie: promedio de 6 a 20 mm de profundidad, necesita espesor. Para tapas y fondos finos, pesar la pieza hasta que el peso se estabilice." }),
      ]),

      el("div", { class: "card" }, [
        el("h2", { text: "Referencia a esta temperatura" }),
        el("div", { style: "overflow-x:auto" }, tabla),
        el("p", { class: "muted small", text: "EMC = contenido de humedad que alcanza la madera si se estabiliza en ese ambiente. Estabilizar lleva días o semanas según el espesor; el valor indica hacia dónde va, no dónde está hoy." }),
      ]),

      el("details", { class: "card" }, [
        el("summary", { text: "Rango objetivo y ajustes" }),
        el("p", { class: "muted small", style: "margin-top:12px", text: "Humedad relativa en la que conviene encolar y armar. El valor habitual para guitarra clásica es 40–50 %." }),
        el("div", { class: "row" }, [
          el("div", { class: "field" }, [el("label", { for: "hu-min", text: "HR mínima" }), el("div", { class: "row" }, [inpMin, el("span", { class: "unit fixed", text: "%" })])]),
          el("div", { class: "field" }, [el("label", { for: "hu-max", text: "HR máxima" }), el("div", { class: "row" }, [inpMax, el("span", { class: "unit fixed", text: "%" })])]),
          el("div", { class: "field" }, [el("label", { for: "hu-tol", text: "Tolerancia" }), el("div", { class: "row" }, [inpTol, el("span", { class: "unit fixed", text: "%" })])]),
        ]),
        el("div", { class: "field", style: "margin-top:16px" }, [
          el("label", { for: "hu-minesp", text: "Espesor mínimo para el medidor de superficie (según su manual)" }),
          el("div", { class: "row" }, [inpMinEsp, el("span", { class: "unit fixed", text: "mm" })]),
        ]),
      ]),
    );

    inpRh.value = state.rh || ""; inpTemp.value = state.temp || "";
    inpMin.value = fmt(state.okMin, 0); inpMax.value = fmt(state.okMax, 0); inpTol.value = fmt(state.tolerancia, 0);
    inpPin.value = state.pin || ""; inpSup.value = state.sup || ""; inpEsp.value = state.esp || ""; inpMinEsp.value = fmt(state.minEsp, 0);
    calc();
  },
});
