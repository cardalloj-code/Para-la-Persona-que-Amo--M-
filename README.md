# Para Princesa — Galaxy Gallery

Una página web de una sola pantalla continua: empieza como una galaxia espiral
de partículas y, a medida que se hace scroll, esas partículas se ordenan solas
hasta formar un corazón que late suavemente — y que dice "Mi Princesa". Sigue
una bitácora de 10 razones para escribir, una galería de 19 fotos y un video,
y una carta final más larga, sin numerar.

Todo está hecho en HTML/CSS/JS puro (sin frameworks ni paso de build), así
que funciona directo en GitHub Pages.

## Estructura

```
index.html        → contenido, textos y estructura
style.css          → colores, tipografía, tarjetas de cristal
app.js             → la animación 3D (Three.js) y el reproductor de música
assets/fotos/      → pon aquí tus 19 fotos
assets/musica/     → pon aquí tu canción
assets/video/      → pon aquí tu video (si lo subes directo, no por YouTube)
```

## El orden de la página

1. **Hero** — el nombre "Princesa".
2. **Revelación** — el corazón ya formado dice "Mi Princesa".
3. **Bitácora** — 10 tarjetas para escribir razones, recuerdos o lo que quieras.
4. **Galería** — grilla con 19 espacios para fotos y 1 para video.
5. **Carta final** — un espacio más grande y sin numerar, para una carta larga.
6. **Cierre** — el mensaje de despedida y tu firma.

## 1. Personalizar los textos

Abre `index.html` y busca los comentarios `<!-- ✏️ EDITA -->`. Cada uno marca
un título o un párrafo con texto genérico que dejé a propósito para que lo
reescribas con tus propias palabras o recuerdos. Puedes agregar o quitar
tarjetas de la bitácora copiando un bloque `<article class="entry">` completo;
el número de "registro" y la coordenada son solo decorativos, no necesitan
ser reales.

El texto "Mi Princesa" del corazón está en la sección con
`<section class="reveal">` — cámbialo ahí si quieres otra frase corta.

## 2. Agregar tus 19 fotos

1. Comprime cada foto antes de subirla — esto es lo que más impacta en la
   velocidad de carga de la página:
   - Ve a [squoosh.app](https://squoosh.app) (gratis, funciona en el
     navegador, no instala nada).
   - Arrastra la foto, bájale el ancho a un máximo de 1200px y exporta en
     JPG o WebP con calidad 75-80%.
   - Apunta a que cada foto pese menos de 300 KB.
2. Guarda los archivos en `assets/fotos/` nombrados `foto01.jpg` hasta
   `foto19.jpg` (con cero al inicio en los de un solo dígito), para que
   coincidan con las casillas de la galería.
3. En `index.html`, dentro de `<div class="gallery-grid">`, busca cada
   `<div class="gallery-tile">` numerado y reemplázalo por:
   ```html
   <img src="assets/fotos/foto01.jpg" alt="Descripción breve" loading="lazy" style="width:100%;height:100%;object-fit:cover;border-radius:10px;display:block;">
   ```

## 3. Agregar el video

Tienes dos caminos:

- **Subirlo directo al repositorio** (más simple, pero solo si el video pesa
  poco): comprímelo si hace falta, guárdalo como `assets/video/video.mp4`,
  y reemplaza el `<div class="gallery-tile video-tile">` por:
  ```html
  <video controls style="width:100%;height:100%;object-fit:cover;border-radius:10px;" src="assets/video/video.mp4"></video>
  ```
- **Subirlo a YouTube como "No listado"** (mejor si el video pesa varios
  cientos de MB — GitHub no está pensado para alojar video pesado): copia el
  código de inserción ("Compartir → Insertar") y pégalo en lugar del mismo
  `div`, ajustando el `style` a `width:100%;height:100%;border:0;`.

## 4. Agregar la música

1. Elige el archivo `.mp3` de la canción.
2. Si pesa mucho, comprímelo a 128-192 kbps con cualquier "mp3 compressor"
   online gratuito — una canción de 3-4 minutos debería quedar en 3-6 MB.
3. Guárdalo como `assets/musica/cancion.mp3` (si usas otro nombre, actualiza
   el `src` dentro de la etiqueta `<audio>` en `index.html`).
4. Los navegadores bloquean el autoplay sin interacción: por eso el botón
   flotante de música existe — ella misma le da play.

## 5. Probar la página en tu computadora

No necesitas servidor ni instalar nada: haz doble clic en `index.html` y se
abre en tu navegador. Si algún navegador se queja al cargar `app.js` desde
`file://`, abre la carpeta con la extensión "Live Server" de VS Code, o corre
`python3 -m http.server` dentro de la carpeta y visita
`http://localhost:8000`.

## 6. Publicar en GitHub Pages

1. Crea un repositorio público en tu cuenta de GitHub.
2. Sube todos los archivos y carpetas de este proyecto — `index.html` debe
   quedar en la raíz del repositorio, no dentro de una subcarpeta.
3. En el repositorio, ve a **Settings → Pages**.
4. En "Build and deployment", elige la rama `main` (o `master`) y la carpeta
   `/ (root)`, luego guarda.
5. Espera 1-2 minutos y entra al link público que GitHub genera — listo
   para compartir.

## Notas técnicas

- El conteo de partículas está en 4200 (dentro del límite de 5000 recomendado
  para que ande fluido en celulares); se ajusta en `CONFIG.particleCount`
  dentro de `app.js`.
- El corazón se termina de formar tras aproximadamente 0.85 pantallas de
  scroll (`CONFIG.formationViewportMultiplier`), sin importar qué tan larga
  sea el resto de la página.
- El lienzo 3D tiene `pointer-events: none`, así que nunca interfiere con
  clics, selección de texto o el botón de música.
- La página respeta `prefers-reduced-motion`: si alguien tiene esa opción
  activada en su sistema, se reduce el movimiento ambiental y el latido.
