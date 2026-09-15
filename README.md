# Taller — calculadoras de luthería (PWA)

App web instalable (PWA) pensada para tablet Android en el taller. Sin dependencias ni build: HTML + CSS + JS vanilla.

## Estructura
- `index.html` — esqueleto: barra superior, solapas, paneles.
- `app.js` — núcleo: registro de módulos, solapas, `store` (localStorage), `num`/`fmt`, `el`, `toast`, wake lock, service worker.
- `modules/*.js` — un archivo por módulo. Cada uno llama a `App.register({ id, title, icon, status?, render(root, api) })`.
- `sw.js` — cache offline (red primero, caché de respaldo). **Subir `CACHE_VERSION` en cada release** y agregar a `ASSETS` cualquier archivo nuevo.
- `manifest.webmanifest`, `icons/` — instalación en Android.

## Agregar un módulo
1. Crear `modules/nuevo.js` con `App.register({...})`.
2. Agregarlo como `<script>` en `index.html` (antes de `App.start()`).
3. Agregarlo a `ASSETS` en `sw.js` y subir `CACHE_VERSION`.

## Probar en la Mac
```bash
python3 -m http.server 8765 --directory ~/obsidian/second-brain/taller-app
```
Abrir http://localhost:8765

## Publicación e instalación en la tablet
La app se publica en **GitHub Pages** desde la rama `main` del repo `jotaceuy/taller-app`:

**https://jotaceuy.github.io/taller-app/**

Instalar en la tablet: abrir esa URL en Chrome, esperar unos segundos a que se cachee, y en el menú ⋮ elegir "Instalar aplicación" (o "Agregar a pantalla principal"). Desde ese momento funciona sin conexión.

Publicar una versión nueva:
1. Subir `CACHE_VERSION` en `sw.js` y `VERSION` en `app.js`.
2. `git commit` + `git push`. Pages se despliega solo en uno o dos minutos.
3. En la tablet, abrir la app con internet: se actualiza sola.

## Estilo de textos
Registro impersonal, verbos en infinitivo, sin voseo (mismo criterio que Rosette Designer).
