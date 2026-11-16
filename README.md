# Bavaria 1 — Un territorio vivo

Visor a pantalla completa basado en los recursos reales de [simulador Kennedy](https://github.com/anasoficasca-code/simulador). Referencia de presentación: Skolkovo for Business. No utiliza los renders ni modelos de ese proyecto.

## Qué se reutiliza

- `vendor/bavaria.js`: geometría industrial original, incluyendo esqueletos estructurales, fachadas, silos y cubiertas; se integran las texturas PBR fotográficas del simulador.
- `vendor/real3d.js`: árboles escaneados, niveles de detalle y flota original. Los GLB se descargan desde el simulador.
- `data/bavaria.json` y `data/trees.json`: huellas y posiciones originales del predio.
- `data/roads.json`: selección local de la red vial `data3d/net.json`.
- Grabación de tráfico SUMO `data3d/traf/c10.bin`: posiciones interpoladas, sin inventar recorridos dentro del predio.
- Integración de Google Photorealistic 3D Tiles del simulador, con la misma georreferencia y atribución dinámica. Requiere acceso al servicio del proyecto original. Su clave pública de navegador ya forma parte del simulador y debe mantenerse restringida al dominio autorizado desde Google Cloud; nunca se utiliza un token de GitHub en el sitio.

## Vistas

**Territorio real** muestra la capa fotográfica 3D cuando el servicio responde. **Modelo del proyecto** muestra la arquitectura y los árboles originales; no es una fotografía de una propuesta construida. Si el servicio fotográfico falla, el visor lo indica y mantiene disponible el modelo. No se promete que sus activos equivalgan a los renders de Skolkovo.

Cámara libre, tres encuadres, selección de edificios, recorrido orbital, pausa y velocidad de los carros. Los carros conservan las trayectorias del registro original; su altura usa el plano de referencia del simulador y requiere revisión visual sobre la fotogrametría.

## Desarrollo y publicación

Servir el repositorio por HTTP, por ejemplo `python -m http.server 8000`. No necesita compilación. Los modelos y texturas dependen del sitio original; este repositorio no duplica los binarios.

GitHub Pages usa **Settings → Pages → Source: GitHub Actions**. El workflow comprueba sintaxis y ejecuta Chromium con WebGL antes de desplegar. Verifica árboles, tráfico y controles, y guarda capturas de escritorio y móvil como artefacto `browser-previews`.

Créditos completos en [CREDITOS.txt](CREDITOS.txt). Autoría del simulador original: Ana Sofía Casas, Alejandra Gómez y Juan José Trujillo.
