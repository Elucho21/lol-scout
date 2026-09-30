# Juegos FWP · video animado

Video explicativo (~2:35) de los 3 juegos de FWP para la GV MoneyHouse, animado por código en lugar de generarlo con IA escena por escena.

- `index.html`: reproductor con las 15 escenas del guion (intro, Mente y Músculo, La Pirámide, Pasa la Posta, cierre). Incluye textos en pantalla, subtítulos con la locución, efectos (check + campana / X + chicharra) y lectura de la locución con la voz del navegador.
- `render.mjs`: exporta a MP4 1280x720 a 30 fps con los efectos de sonido.

```bash
FFMPEG=/ruta/a/ffmpeg node render.mjs out/juegos-fwp.mp4
```

Para la versión final: grabar la locución (el texto está en cada escena, campo `vo`) y montarla sobre el MP4 en CapCut o Premiere. La duración de cada escena se cambia en el campo `dur`.
