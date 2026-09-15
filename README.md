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

## Instalar en la tablet
La instalación como PWA (y el modo offline) requiere HTTPS. `localhost` está exento, pero la IP de la Mac en la red local no. Opciones:
- Publicar en GitHub Pages (repo público o privado con Pages) y abrir la URL en Chrome de la tablet → menú ⋮ → "Agregar a la pantalla principal".
- Túnel HTTPS temporal (por ejemplo `cloudflared tunnel --url http://localhost:8765`) para probar antes de publicar.

## Estilo de textos
Registro impersonal, verbos en infinitivo, sin voseo (mismo criterio que Rosette Designer).
