# Bavaria 1

Experiencia web independiente para explorar la propuesta Bavaria Común del simulador Kennedy.

Sitio estático con Three.js: cámara orbital, edificios seleccionables, bosque, vehículos animados, modos día/noche y recorrido automático.

## Desarrollo

Servir esta carpeta con un servidor HTTP, por ejemplo `python -m http.server 8000`, y abrir http://localhost:8000. No requiere compilación. Three.js se descarga desde jsDelivr (versión fijada).

## Publicación

En Settings → Pages → Build and deployment → Source, seleccionar GitHub Actions. El workflow .github/workflows/pages.yml comprueba la sintaxis JavaScript y publica solo los archivos públicos del sitio con cada push a main. Si el primer intento falla porque Pages aún no estaba habilitado, volver a ejecutar Publish Bavaria en Actions. El sitio esperado es https://anasoficasca-code.github.io/bavaria/ cuando GitHub confirme el despliegue.

## Datos y alcance

Huellas de edificios y arbolado procedentes de anasoficasca-code/simulador (data3d/bavaria.json y bavaria_arboles.json). Se conservan en data/ para que esta web sea independiente. El arbolado del origen se interpreta desde imagen Esri; consultar la nota de ese archivo. Los usos propuestos son hipótesis de diseño del módulo bavaria_plan.js. La representación es una maqueta de estudio: no una captura fotorrealista ni una simulación de tránsito calibrada. Los vehículos ilustran recorridos conceptuales, sin representar indicadores medidos.

Autoría del simulador original: Ana Sofía Casas, Alejandra Gómez y Juan José Trujillo. Revisar los permisos de los datos y recursos originales antes de su redistribución externa.

## Verificación inicial

Se comprobó la sintaxis de app.js, la unicidad de los IDs HTML y la estructura numérica de las 29 huellas y los 3250 árboles. No se ha ejecutado una prueba visual en navegador; revisar el diseño, el rendimiento WebGL y el despliegue antes de considerar la versión final.
