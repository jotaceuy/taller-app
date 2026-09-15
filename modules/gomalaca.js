/* Módulo: dilución de goma laca por corte. EN BACKLOG. */
App.register({
  id: "gomalaca",
  title: "Goma laca",
  icon: "🟠",
  status: "backlog",
  render(root, { el }) {
    root.append(
      el("div", { class: "card placeholder" }, [
        el("div", { class: "big", text: "🟠" }),
        el("p", { text: "Dilución de goma laca por corte" }),
        el("p", { class: "muted small", text: "Calcular gramos de escamas y mililitros de alcohol para un corte dado (1 lb, 2 lb, 3 lb…) o una cantidad final deseada. Pendiente de implementar." }),
      ]),
    );
  },
});
