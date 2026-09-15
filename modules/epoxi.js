/* Módulo: mezcla de epoxi.
   Proporción expresada como 1 parte de resina : x partes de endurecedor (en peso). */
App.register({
  id: "epoxi",
  title: "Epoxi",
  icon: "🧪",
  render(root, { store, num, fmt, el, toast }) {
    const KEY_PRODUCTS = "taller:epoxi:productos";
    const KEY_STATE = "taller:epoxi:estado";

    const DEFAULT_PRODUCTS = [
      { id: "tort-super-cristal", name: "TORT Super Cristal", ratio: 0.6, notes: "Mezclar 3 min raspando fondo y paredes. Curado ideal: 7 días.", builtin: true },
    ];

    let products = store.get(KEY_PRODUCTS, null) || DEFAULT_PRODUCTS;
    // Garantizar que los productos de fábrica sigan existiendo
    for (const d of DEFAULT_PRODUCTS) if (!products.some(p => p.id === d.id)) products.unshift(d);

    let state = Object.assign({ productId: products[0].id, customRatio: 0.6, tare: "vaso", resina: "" }, store.get(KEY_STATE, {}));
    const save = () => { store.set(KEY_STATE, state); store.set(KEY_PRODUCTS, products); };

    /* ---------- Producto y proporción ---------- */
    const selProduct = el("select", { id: "ep-product", onchange: () => { state.productId = selProduct.value; syncRatio(); calc(); } });
    const inpRatio = el("input", { type: "text", inputmode: "decimal", id: "ep-ratio", "aria-label": "Partes de endurecedor por 1 de resina",
      oninput: () => { const v = num(inpRatio.value); inpRatio.classList.toggle("invalid", v === null || v < 0); if (v !== null && v >= 0) { state.customRatio = v; } calc(); } });
    const ratioBox = el("div", { class: "ratio-box" }, [
      el("span", { class: "one", text: "1" }), el("span", { class: "unit", text: "/" }), inpRatio,
    ]);
    const btnDelete = el("button", { class: "btn danger", type: "button", text: "Quitar producto", onclick: deleteProduct });
    const notes = el("p", { class: "note small" });

    function fillProducts() {
      selProduct.replaceChildren(
        ...products.map(p => el("option", { value: p.id, text: `${p.name}  (1/${String(p.ratio).replace(".", ",")})` })),
        el("option", { value: "__custom", text: "Proporción manual…" }),
      );
      if (!products.some(p => p.id === state.productId) && state.productId !== "__custom") state.productId = products[0].id;
      selProduct.value = state.productId;
    }

    function current() {
      if (state.productId === "__custom") return { ratio: state.customRatio, notes: "", custom: true };
      const p = products.find(p => p.id === state.productId) || products[0];
      return { ratio: p.ratio, notes: p.notes || "", custom: false, product: p };
    }

    function syncRatio() {
      const c = current();
      inpRatio.value = String(c.ratio).replace(".", ",");
      inpRatio.readOnly = !c.custom;
      inpRatio.classList.remove("invalid");
      notes.textContent = c.notes;
      notes.hidden = !c.notes;
      btnDelete.hidden = c.custom || c.product?.builtin;
    }

    /* ---------- Agregar / quitar productos ---------- */
    const inpNewName = el("input", { type: "text", placeholder: "Nombre del producto", "aria-label": "Nombre del producto" });
    const inpNewRatio = el("input", { type: "text", inputmode: "decimal", placeholder: "0,6", "aria-label": "Partes de endurecedor" });
    const inpNewNotes = el("input", { type: "text", placeholder: "Notas (opcional): tiempo de mezcla, curado…", "aria-label": "Notas" });
    function addProduct() {
      const name = inpNewName.value.trim(); const ratio = num(inpNewRatio.value);
      if (!name) { toast("Indicar un nombre de producto"); inpNewName.focus(); return; }
      if (ratio === null || ratio < 0) { toast("Indicar la proporción, por ejemplo 0,6"); inpNewRatio.focus(); return; }
      const id = "p-" + Date.now();
      products.push({ id, name, ratio, notes: inpNewNotes.value.trim() });
      state.productId = id;
      inpNewName.value = inpNewRatio.value = inpNewNotes.value = "";
      fillProducts(); syncRatio(); calc(); save();
      toast(`Producto "${name}" guardado`);
    }
    function deleteProduct() {
      const c = current();
      if (!c.product || c.product.builtin) return;
      if (!confirm(`¿Quitar "${c.product.name}" de la lista?`)) return;
      products = products.filter(p => p.id !== c.product.id);
      state.productId = products[0].id;
      fillProducts(); syncRatio(); calc(); save();
    }

    /* ---------- Cálculo ---------- */
    const inpResina = el("input", { type: "text", inputmode: "decimal", id: "ep-resina", placeholder: "0,0", autocomplete: "off",
      oninput: () => { state.resina = inpResina.value; calc(); } });
    const outEnd = el("span", { class: "v" });
    const outTotal = el("span", { class: "v" });
    const outRead = el("span", { class: "v" });
    const lblRead = el("span", { class: "k", text: "Llevar la balanza a" });

    const segTare = el("div", { class: "seg", role: "group", "aria-label": "Momento del tarado" }, [
      el("button", { type: "button", "data-tare": "vaso", text: "Con el vaso vacío", onclick: () => setTare("vaso") }),
      el("button", { type: "button", "data-tare": "resina", text: "Después de la resina", onclick: () => setTare("resina") }),
    ]);
    function setTare(t) {
      state.tare = t;
      for (const b of segTare.children) b.setAttribute("aria-pressed", b.dataset.tare === t ? "true" : "false");
      calc(); save();
    }

    function calc() {
      const r = num(inpResina.value);
      const { ratio } = current();
      inpResina.classList.toggle("invalid", inpResina.value.trim() !== "" && (r === null || r <= 0));
      if (r === null || r <= 0 || ratio === null || ratio < 0) {
        outEnd.textContent = outTotal.textContent = outRead.textContent = "—";
        return;
      }
      const end = r * ratio;
      const total = r + end;
      outEnd.innerHTML = `${fmt(end)}<small>g</small>`;
      outTotal.innerHTML = `${fmt(total)}<small>g</small>`;
      outRead.innerHTML = `${fmt(state.tare === "vaso" ? total : end)}<small>g</small>`;
      save();
    }

    /* ---------- Armado del panel ---------- */
    root.append(
      el("div", { class: "card" }, [
        el("h2", { text: "Producto" }),
        el("div", { class: "field" }, [
          el("label", { for: "ep-product", text: "Resina epoxi" }),
          selProduct,
        ]),
        el("div", { class: "field" }, [
          el("label", { for: "ep-ratio", text: "Proporción resina / endurecedor (en peso)" }),
          el("div", { class: "row" }, [ratioBox, btnDelete]),
        ]),
        notes,
      ]),

      el("div", { class: "card" }, [
        el("h2", { text: "Mezcla" }),
        el("div", { class: "field" }, [
          el("label", { for: "ep-resina", text: "Resina en el vaso" }),
          el("div", { class: "row" }, [inpResina, el("span", { class: "unit fixed", text: "g" })]),
        ]),
        el("div", { class: "results" }, [
          el("div", { class: "result hero" }, [el("span", { class: "k", text: "Endurecedor a agregar" }), outEnd]),
          el("div", { class: "result" }, [el("span", { class: "k", text: "Peso final de la mezcla" }), outTotal]),
        ]),
      ]),

      el("div", { class: "card" }, [
        el("h2", { text: "Lectura de la balanza" }),
        el("div", { class: "field" }, [
          el("label", { text: "Balanza tarada…" }),
          segTare,
        ]),
        el("div", { class: "results" }, [
          el("div", { class: "result" }, [lblRead, outRead]),
        ]),
        el("p", { class: "muted small", text: "Agregar endurecedor hasta que la balanza marque ese valor." }),
      ]),

      el("details", { class: "card" }, [
        el("summary", { text: "Agregar un producto" }),
        el("div", { class: "field", style: "margin-top:12px" }, [el("label", { text: "Nombre" }), inpNewName]),
        el("div", { class: "field" }, [
          el("label", { text: "Proporción: 1 de resina por…" }),
          el("div", { class: "row" }, [inpNewRatio, el("span", { class: "unit fixed", text: "de endurecedor" })]),
        ]),
        el("div", { class: "field" }, [el("label", { text: "Notas" }), inpNewNotes]),
        el("button", { class: "btn primary", type: "button", text: "Guardar producto", onclick: addProduct }),
      ]),
    );

    fillProducts(); syncRatio(); setTare(state.tare);
    inpResina.value = state.resina || "";
    calc();
  },
});
