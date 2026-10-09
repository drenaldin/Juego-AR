# El botín del capitán

Aventura pirata de búsqueda del tesoro con AR.js y A-Frame. Hay seis marcadores y ocho etapas: se resuelven las pruebas, se entra al camarote y se vuelve al primer marcador para encontrar el cofre.

## Ejecutar

```sh
npm start
```

Abrir http://localhost:8080. El servidor usa Python 3. También se puede usar Live Server de VS Code.

Para probar sin cámara, ingresar un apodo y elegir **Probar sin cámara**. Los botones 01–06 simulan los marcadores. Esas partidas no entran al ranking.

## Preparar el juego

- Imprimir las seis hojas de `markers/index.html` en A4, con el borde negro y el margen blanco completos.
- Colocarlas en seis lugares y actualizar las indicaciones `next` en `js/story.js`.
- Probar los marcadores con los celulares que se van a usar.

Al reconocer el marcador correcto, la cámara se apaga y el juego muestra directamente la actividad. Al resolverla aparece la opción de escanear el siguiente marcador; la cámara se enciende solo al tocar el botón. La nota que sigue al guardián se abre sin repetir el escaneo del marcador 06. Las pistas y el progreso se guardan automáticamente, y una actividad ya desbloqueada se puede retomar sin cámara.

La guía completa se muestra en el inicio. Durante la partida queda únicamente la imagen del recorrido; las consignas y las pistas de cada prueba siguen disponibles.

## Marcador 05: el laberinto

Mové la ficha con las flechas, agarrá la llave y llegá a la salida. Las trampas te devuelven al inicio sin la llave y restan 20 puntos; las paredes no penalizan. Al ganar se guarda el objeto que te pedirá el guardián. El mismo marcador 05 impreso sigue funcionando.

## Puntajes

Cada una de las primeras seis pruebas suma 100 puntos y el cofre suma 400. Un error resta 20; una ayuda, 50. Al terminar se agrega un bono de `max(0, 300 - floor(segundos / 10))`. El total nunca baja de cero.

Se guarda la mejor partida de cada apodo en ese navegador y dispositivo. No hay un tablero compartido entre celulares. El mismo apodo permite retomar una partida; el tiempo sigue contando al salir.

## Publicar

En GitHub: **Settings → Pages → Deploy from a branch → main → / (root)**. Abrir la URL HTTPS desde el celular y permitir el acceso a la cámara.

No hace falta compilar. La carpeta `node_modules` no se sube. Las ubicaciones de los marcadores y las pruebas físicas de cámara quedan a cargo del equipo.

## Archivos

- `index.html`: inicio, juego, instrucciones y puntajes.
- `ar.html`, `js/ar-view.js` y `css/ar-view.css`: escena AR aislada dentro del visor.
- `js/camera.js`: encuadre, comunicación con el visor y apagado de la cámara.
- `css/style.css`: estilos.
- `js/game.js`: cámara, navegación y mensajes.
- `js/engine.js`: progreso, guardado y puntajes.
- `js/puzzles.js`: pruebas del juego.
- `js/story.js`: pistas y ayudas.
- `markers/`: PNG para imprimir.
- `assets/patterns/`: patrones que reconoce AR.js.
- `assets/images/como-jugar.png`: esquema de cómo jugar, incluido en las instrucciones del inicio.

## Pruebas

```sh
npm ci
npm test
```

Se usa Node 22 o superior. `linkedom` solo se necesita para las pruebas.

Los marcadores se pueden regenerar con `python3 scripts/generate-markers.py`.

## Bibliotecas

[A-Frame 1.8.0](https://github.com/aframevr/aframe) y [AR.js 3.4.8](https://github.com/AR-js-org/AR.js). Se descargan al activar la cámara.

`assets/camera_para.dat` proviene de [AR.js](https://github.com/AR-js-org/AR.js/blob/3.4.8/data/data/camera_para.dat). AR.js informa licencias MIT para su código y LGPLv3 para ARToolKit. El generador usa el [formato de patrones de AR.js](https://github.com/AR-js-org/AR.js/blob/master/three.js/examples/marker-training/threex-arpatternfile.js).
