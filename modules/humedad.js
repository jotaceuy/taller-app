/* Módulo: humedad relativa → contenido de humedad de equilibrio de la madera (EMC). EN BACKLOG. */
App.register({
  id: "humedad",
  title: "Humedad",
  icon: "💧",
  status: "backlog",
  render(root, { el }) {
    root.append(
      el("div", { class: "card placeholder" }, [
        el("div", { class: "big", text: "💧" }),
        el("p", { text: "Humedad relativa → contenido de humedad de la madera" }),
        el("p", { class: "muted small", text: "A partir de la humedad relativa y la temperatura del taller, estimar el contenido de humedad de equilibrio (EMC) de la madera y si conviene encolar. Pendiente de implementar." }),
      ]),
    );
  },
});
