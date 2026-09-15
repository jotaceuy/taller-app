/* Módulo: goma laca — cortes, preparación de mezclas y dilución.
   Unidad interna: gramos de escamas por litro de alcohol (g/L).
   Equivalencias: 1 lb cut = 1 lb (453,6 g) por galón US (3,785 L) = 119,8 g/L.
   Relación en peso 1:x = 1 g de escamas por x g de alcohol → x = (densidad·1000) / (g/L). */
App.register({
  id: "gomalaca",
  title: "Goma laca",
  icon: "🟠",
  render(root, { store, num, fmt, el, toast }) {
    const KEY_PRESETS = "taller:gomalaca:cortes";
    const KEY_STATE = "taller:gomalaca:estado";
    const G_PER_L_PER_LB = 453.592 / 3.78541;   // 119,83 g/L por cada lb cut
    const FLAKE_ML_PER_G = 0.9;                  // volumen aproximado que aportan las escamas disueltas

    const DEFAULT_PRESETS = [
      { id: "lavado",   name: "Lavado / sellador",           gpl: 0.5 * G_PER_L_PER_LB, notes: "Capa fina para sellar el poro antes del pulido. Disolver 24 h agitando de vez en cuando y filtrar.", builtin: true },
      { id: "pf-cuerpo", name: "Pulido francés — cuerpo",   gpl: 2 * G_PER_L_PER_LB,   notes: "Para levantar cuerpo en las primeras sesiones. Disolver 24 h y filtrar. Vida útil: unos 6 meses disuelta.", builtin: true },
      { id: "pf-final", name: "Pulido francés — terminación", gpl: 1 * G_PER_L_PER_LB, notes: "Últimas sesiones y aclarado. Disolver 24 h y filtrar. Vida útil: unos 6 meses disuelta.", builtin: true },
      { id: "pincel",   name: "A pincel",                     gpl: 2.5 * G_PER_L_PER_LB, notes: "Más espesa, pocas pasadas. Disolver 24 h y filtrar.", builtin: true },
    ];

    let presets = store.get(KEY_PRESETS, null) || DEFAULT_PRESETS;
    for (const d of DEFAULT_PRESETS) if (!presets.some(p => p.id === d.id)) presets.push(d);

    let state = Object.assign({
      presetId: presets[0].id, customGpl: 120, unit: "ratio", density: 0.79,
      mode: "escamas", inEscamas: "", inVolumen: "", dilVol: "", dilFromId: "pf-cuerpo", dilFromGpl: 240,
    }, store.get(KEY_STATE, {}));
    const save = () => { store.set(KEY_STATE, state); store.set(KEY_PRESETS, presets); };

    /* ---------- conversiones ---------- */
    const toLb = gpl => gpl / G_PER_L_PER_LB;
    const toRatio = gpl => (state.density * 1000) / gpl;   // x en 1:x (peso)
    const fromUnit = (v, unit) => unit === "lb" ? v * G_PER_L_PER_LB : unit === "gpl" ? v : (state.density * 1000) / v;
    const toUnit = (gpl, unit) => unit === "lb" ? toLb(gpl) : unit === "gpl" ? gpl : toRatio(gpl);
    const unitLabel = { ratio: "1 : x en peso", lb: "lb por galón", gpl: "g por litro" };
    const labelPreset = p => `${p.name}  (${fmt(toLb(p.gpl), 1)} lb · 1:${fmt(toRatio(p.gpl), 1)})`;

    function currentGpl() {
      if (state.presetId === "__custom") return state.customGpl;
      const p = presets.find(p => p.id === state.presetId) || presets[0];
      return p.gpl;
    }
    function currentPreset() { return state.presetId === "__custom" ? null : (presets.find(p => p.id === state.presetId) || presets[0]); }

    /* ---------- Card 1: corte ---------- */
    const selPreset = el("select", { id: "gl-preset", onchange: () => { state.presetId = selPreset.value; syncCut(); calcAll(); save(); } });
    const inpCustom = el("input", { type: "text", inputmode: "decimal", id: "gl-custom", "aria-label": "Valor del corte",
      oninput: () => { const v = num(inpCustom.value); const ok = v !== null && v > 0; inpCustom.classList.toggle("invalid", !ok); if (ok) { state.customGpl = fromUnit(v, state.unit); } calcAll(); save(); } });
    const segUnit = el("div", { class: "seg", role: "group", "aria-label": "Unidad del corte" },
      ["ratio", "lb", "gpl"].map(u => el("button", { type: "button", "data-u": u, text: unitLabel[u], onclick: () => { state.unit = u; syncCut(); calcAll(); save(); } })));
    const eqLb = el("span", { class: "v" }), eqGpl = el("span", { class: "v" }), eqRatio = el("span", { class: "v" });
    const notes = el("p", { class: "note small" });
    const btnDelete = el("button", { class: "btn danger", type: "button", text: "Quitar corte", onclick: deletePreset });

    function fillPresets() {
      selPreset.replaceChildren(
        ...presets.map(p => el("option", { value: p.id, text: labelPreset(p) })),
        el("option", { value: "__custom", text: "Corte manual…" }),
      );
      if (!presets.some(p => p.id === state.presetId) && state.presetId !== "__custom") state.presetId = presets[0].id;
      selPreset.value = state.presetId;
      selDilFrom.replaceChildren(...presets.map(p => el("option", { value: p.id, text: labelPreset(p) })), el("option", { value: "__custom", text: "Otro corte (indicar valor)…" }));
      if (!presets.some(p => p.id === state.dilFromId) && state.dilFromId !== "__custom") state.dilFromId = presets[0].id;
      selDilFrom.value = state.dilFromId;
    }
    function syncCut() {
      for (const b of segUnit.children) b.setAttribute("aria-pressed", b.dataset.u === state.unit ? "true" : "false");
      const p = currentPreset();
      inpCustom.readOnly = !!p;
      inpCustom.value = fmt(toUnit(currentGpl(), state.unit), state.unit === "gpl" ? 0 : 2);
      inpCustom.classList.remove("invalid");
      notes.textContent = p ? p.notes || "" : "";
      notes.hidden = !notes.textContent;
      btnDelete.hidden = !p || p.builtin;
      lblNewUnit.textContent = unitLabel[state.unit];
      syncDilFrom();
    }
    function showEquivalences() {
      const g = currentGpl();
      eqLb.innerHTML = `${fmt(toLb(g), 2)}<small>lb/gal</small>`;
      eqGpl.innerHTML = `${fmt(g, 0)}<small>g/L</small>`;
      eqRatio.innerHTML = `1 : ${fmt(toRatio(g), 2)}<small>en peso</small>`;
    }

    /* ---------- agregar / quitar cortes ---------- */
    const inpNewName = el("input", { type: "text", placeholder: "Nombre del corte", "aria-label": "Nombre" });
    const inpNewVal = el("input", { type: "text", inputmode: "decimal", placeholder: "valor", "aria-label": "Valor" });
    const lblNewUnit = el("span", { class: "unit fixed" });
    const inpNewNotes = el("input", { type: "text", placeholder: "Notas (opcional)", "aria-label": "Notas" });
    function addPreset() {
      const name = inpNewName.value.trim(); const v = num(inpNewVal.value);
      if (!name) { toast("Indicar un nombre"); inpNewName.focus(); return; }
      if (v === null || v <= 0) { toast(`Indicar el valor en ${unitLabel[state.unit]}`); inpNewVal.focus(); return; }
      const id = "c-" + Date.now();
      presets.push({ id, name, gpl: fromUnit(v, state.unit), notes: inpNewNotes.value.trim() });
      state.presetId = id; inpNewName.value = inpNewVal.value = inpNewNotes.value = "";
      fillPresets(); syncCut(); calcAll(); save(); toast(`Corte "${name}" guardado`);
    }
    function deletePreset() {
      const p = currentPreset(); if (!p || p.builtin) return;
      if (!confirm(`¿Quitar "${p.name}" de la lista?`)) return;
      presets = presets.filter(x => x.id !== p.id); state.presetId = presets[0].id;
      fillPresets(); syncCut(); calcAll(); save();
    }

    /* ---------- Card 2: preparar mezcla ---------- */
    const segMode = el("div", { class: "seg", role: "group", "aria-label": "Dato de partida" }, [
      el("button", { type: "button", "data-m": "escamas", text: "Tengo escamas", onclick: () => setMode("escamas") }),
      el("button", { type: "button", "data-m": "volumen", text: "Quiero un volumen", onclick: () => setMode("volumen") }),
    ]);
    const inpEscamas = el("input", { type: "text", inputmode: "decimal", id: "gl-escamas", placeholder: "0,0", autocomplete: "off", oninput: () => { state.inEscamas = inpEscamas.value; calcMix(); save(); } });
    const inpVolumen = el("input", { type: "text", inputmode: "decimal", id: "gl-volumen", placeholder: "0", autocomplete: "off", oninput: () => { state.inVolumen = inpVolumen.value; calcMix(); save(); } });
    const fieldEscamas = el("div", { class: "field" }, [el("label", { for: "gl-escamas", text: "Escamas de goma laca" }), el("div", { class: "row" }, [inpEscamas, el("span", { class: "unit fixed", text: "g" })])]);
    const fieldVolumen = el("div", { class: "field" }, [el("label", { for: "gl-volumen", text: "Mezcla que se quiere obtener" }), el("div", { class: "row" }, [inpVolumen, el("span", { class: "unit fixed", text: "mL" })])]);
    const outEscamas = el("span", { class: "v" }), outAlcMl = el("span", { class: "v" }), outAlcG = el("span", { class: "v" }), outMezcla = el("span", { class: "v" });
    const resEscamas = el("div", { class: "result hero" }, [el("span", { class: "k", text: "Escamas" }), outEscamas]);
    const resAlcMl = el("div", { class: "result hero" }, [el("span", { class: "k", text: "Alcohol" }), outAlcMl]);
    const resAlcG = el("div", { class: "result" }, [el("span", { class: "k", text: "Alcohol pesado en balanza" }), outAlcG]);
    const resMezcla = el("div", { class: "result" }, [el("span", { class: "k", text: "Mezcla aproximada" }), outMezcla]);

    function setMode(m) {
      state.mode = m;
      for (const b of segMode.children) b.setAttribute("aria-pressed", b.dataset.m === m ? "true" : "false");
      fieldEscamas.hidden = m !== "escamas"; fieldVolumen.hidden = m !== "volumen";
      resEscamas.hidden = m !== "volumen"; resAlcMl.classList.toggle("hero", true);
      calcMix(); save();
    }
    function calcMix() {
      const g = currentGpl(); const d = state.density;
      let flakes, alcMl;
      if (state.mode === "escamas") {
        flakes = num(inpEscamas.value);
        inpEscamas.classList.toggle("invalid", inpEscamas.value.trim() !== "" && (flakes === null || flakes <= 0));
        if (flakes === null || flakes <= 0) return blank([outEscamas, outAlcMl, outAlcG, outMezcla]);
        alcMl = flakes / g * 1000;
      } else {
        const vol = num(inpVolumen.value);
        inpVolumen.classList.toggle("invalid", inpVolumen.value.trim() !== "" && (vol === null || vol <= 0));
        if (vol === null || vol <= 0) return blank([outEscamas, outAlcMl, outAlcG, outMezcla]);
        alcMl = vol / (1 + FLAKE_ML_PER_G * g / 1000);
        flakes = alcMl * g / 1000;
      }
      outEscamas.innerHTML = `${fmt(flakes, 1)}<small>g</small>`;
      outAlcMl.innerHTML = `${fmt(alcMl, 0)}<small>mL</small>`;
      outAlcG.innerHTML = `${fmt(alcMl * d, 0)}<small>g</small>`;
      outMezcla.innerHTML = `${fmt(alcMl + FLAKE_ML_PER_G * flakes, 0)}<small>mL</small>`;
    }
    function blank(outs) { for (const o of outs) o.textContent = "—"; }

    /* ---------- Card 3: diluir una mezcla existente ---------- */
    const selDilFrom = el("select", { id: "gl-dil-from", onchange: () => { state.dilFromId = selDilFrom.value; syncDilFrom(); calcDil(); save(); } });
    const inpDilFrom = el("input", { type: "text", inputmode: "decimal", "aria-label": "Corte actual", oninput: () => { const v = num(inpDilFrom.value); if (v !== null && v > 0) state.dilFromGpl = fromUnit(v, state.unit); inpDilFrom.classList.toggle("invalid", v === null || v <= 0); calcDil(); save(); } });
    const inpDilVol = el("input", { type: "text", inputmode: "decimal", id: "gl-dil-vol", placeholder: "0", autocomplete: "off", oninput: () => { state.dilVol = inpDilVol.value; calcDil(); save(); } });
    const outDil = el("span", { class: "v" }); const lblDil = el("span", { class: "k", text: "Alcohol a agregar" });
    const resDil = el("div", { class: "result hero" }, [lblDil, outDil]);
    const dilTarget = el("p", { class: "muted small" });

    function dilFromGpl() { return state.dilFromId === "__custom" ? state.dilFromGpl : (presets.find(p => p.id === state.dilFromId) || presets[0]).gpl; }
    function syncDilFrom() {
      inpDilFrom.readOnly = state.dilFromId !== "__custom";
      inpDilFrom.value = fmt(toUnit(dilFromGpl(), state.unit), state.unit === "gpl" ? 0 : 2);
      inpDilFrom.classList.remove("invalid");
    }
    function calcDil() {
      const gA = dilFromGpl(), gB = currentGpl(), vol = num(inpDilVol.value);
      const p = currentPreset();
      dilTarget.textContent = `Corte de destino: el elegido arriba (${p ? p.name : "manual"}, ${fmt(toLb(gB), 2)} lb · ${fmt(gB, 0)} g/L · 1:${fmt(toRatio(gB), 2)}).`;
      inpDilVol.classList.toggle("invalid", inpDilVol.value.trim() !== "" && (vol === null || vol <= 0));
      if (vol === null || vol <= 0) { outDil.textContent = "—"; lblDil.textContent = "Alcohol a agregar"; return; }
      const alcA = vol / (1 + FLAKE_ML_PER_G * gA / 1000);
      const flakes = alcA * gA / 1000;
      if (gB < gA) {
        const add = flakes * 1000 / gB - alcA;
        lblDil.textContent = "Alcohol a agregar";
        outDil.innerHTML = `${fmt(add, 0)}<small>mL · ${fmt(add * state.density, 0)} g</small>`;
      } else if (gB > gA) {
        const addFlakes = alcA * gB / 1000 - flakes;
        lblDil.textContent = "Escamas a agregar (para subir el corte)";
        outDil.innerHTML = `${fmt(addFlakes, 1)}<small>g</small>`;
      } else {
        lblDil.textContent = "Mismo corte"; outDil.textContent = "—";
      }
    }

    /* ---------- densidad del alcohol ---------- */
    const inpDensity = el("input", { type: "text", inputmode: "decimal", id: "gl-dens", "aria-label": "Densidad del alcohol",
      oninput: () => { const v = num(inpDensity.value); const ok = v !== null && v > 0.5 && v < 1.2; inpDensity.classList.toggle("invalid", !ok); if (ok) { state.density = v; fillPresets(); syncCut(); calcAll(); save(); } } });

    function calcAll() { showEquivalences(); calcMix(); calcDil(); }

    /* ---------- armado ---------- */
    root.append(
      el("div", { class: "card" }, [
        el("h2", { text: "Corte" }),
        el("div", { class: "field" }, [el("label", { for: "gl-preset", text: "Mezcla" }), selPreset]),
        el("div", { class: "field" }, [
          el("label", { text: "Expresar el corte como" }), segUnit,
        ]),
        el("div", { class: "field" }, [
          el("label", { for: "gl-custom", text: "Valor del corte" }),
          el("div", { class: "row" }, [inpCustom, btnDelete]),
        ]),
        el("div", { class: "results" }, [
          el("div", { class: "result" }, [el("span", { class: "k", text: "Libras por galón" }), eqLb]),
          el("div", { class: "result" }, [el("span", { class: "k", text: "Gramos por litro de alcohol" }), eqGpl]),
          el("div", { class: "result" }, [el("span", { class: "k", text: "Relación escamas : alcohol" }), eqRatio]),
        ]),
        notes,
      ]),

      el("div", { class: "card" }, [
        el("h2", { text: "Preparar mezcla" }),
        el("div", { class: "field" }, [el("label", { text: "Dato de partida" }), segMode]),
        fieldEscamas, fieldVolumen,
        el("div", { class: "results" }, [resEscamas, resAlcMl, resAlcG, resMezcla]),
        el("p", { class: "muted small", text: "El volumen final es aproximado: las escamas disueltas aportan unos 0,9 mL por gramo." }),
      ]),

      el("div", { class: "card" }, [
        el("h2", { text: "Diluir una mezcla que ya está hecha" }),
        el("div", { class: "field" }, [el("label", { for: "gl-dil-from", text: "Corte actual de la mezcla" }), selDilFrom, el("div", { class: "row", style: "margin-top:8px" }, [inpDilFrom])]),
        el("div", { class: "field" }, [el("label", { for: "gl-dil-vol", text: "Cantidad que se tiene" }), el("div", { class: "row" }, [inpDilVol, el("span", { class: "unit fixed", text: "mL" })])]),
        dilTarget,
        el("div", { class: "results" }, [resDil]),
      ]),

      el("details", { class: "card" }, [
        el("summary", { text: "Agregar un corte / ajustes" }),
        el("div", { class: "field", style: "margin-top:12px" }, [el("label", { text: "Nombre" }), inpNewName]),
        el("div", { class: "field" }, [el("label", { text: "Valor (en la unidad elegida arriba)" }), el("div", { class: "row" }, [inpNewVal, lblNewUnit])]),
        el("div", { class: "field" }, [el("label", { text: "Notas" }), inpNewNotes]),
        el("button", { class: "btn primary", type: "button", text: "Guardar corte", onclick: addPreset }),
        el("div", { class: "field", style: "margin-top:20px" }, [
          el("label", { for: "gl-dens", text: "Densidad del alcohol (g/mL)" }),
          el("div", { class: "row" }, [inpDensity, el("span", { class: "unit fixed", text: "0,79 para alcohol de 96°" })]),
        ]),
      ]),
    );

    fillPresets(); syncCut(); setMode(state.mode);
    inpEscamas.value = state.inEscamas || ""; inpVolumen.value = state.inVolumen || ""; inpDilVol.value = state.dilVol || "";
    inpDensity.value = String(state.density).replace(".", ",");
    calcAll();
  },
});
