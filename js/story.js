// Ajustar las indicaciones cuando estén elegidos los lugares de cada marcador.
export const STATIONS = [
  {
    title: 'La llave', marker: 1, kind: 'key', subtitle: 'Frená en la zona roja.',
    location: 'Inicio del recorrido',
    intro: 'Detené la llave dentro de la franja roja para conseguirla.',
    evidence: 'Encontraste la llave. Tiene una etiqueta: «Devolver al lugar de origen».',
    next: 'Buscá el marcador 02.',
    hints: ['Mirá una vuelta completa antes de tocar el botón.', 'La llave tarda cuatro segundos en dar una vuelta. Prepará el toque cuando se acerque a la franja roja.']
  },
  {
    title: 'El reloj', marker: 2, kind: 'clock', subtitle: 'Contá los destellos.',
    location: 'Segundo punto',
    intro: 'Reproducí la señal, contá los destellos y detené la aguja en esa hora.',
    evidence: 'El reloj se detuvo a las siete.',
    next: 'Buscá el marcador 03.',
    hints: ['La cantidad de destellos indica la hora.', 'Son siete destellos. Detené la aguja en el 7.']
  },
  {
    title: 'Las puertas', marker: 3, kind: 'doors', subtitle: 'Repetí la secuencia.',
    location: 'Tercer punto',
    intro: 'Mirá las cinco luces y repetí el orden con los botones. Si fallás, la secuencia cambia.',
    evidence: 'La puerta azul se abrió. Adentro había un rombo: ◇.',
    next: 'Buscá el marcador 04.',
    hints: ['También podés recordar las figuras de las puertas.', 'Separá los cinco pasos en un grupo de tres y otro de dos. Podés volver a ver la secuencia.']
  },
  {
    title: 'La pista falsa', marker: 4, kind: 'archive', subtitle: 'Una de las frases es mentira.',
    location: 'Cuarto punto',
    intro: 'Elegí la frase falsa usando las pistas que ya encontraste. Si te equivocás, tenés que esperar diez segundos.',
    evidence: 'La frase B era falsa: la puerta era azul, no roja.',
    next: 'Buscá el marcador 05.',
    hints: ['Revisá lo que viste en el reloj y en las puertas.', 'La puerta que se abrió era azul. La frase que dice roja es falsa.']
  },
  {
    title: 'El laberinto', marker: 5, kind: 'maze', subtitle: 'Agarrá la llave y encontrá la salida.',
    location: 'Quinto punto',
    intro: 'Mové la ficha con las flechas. Primero agarrá la llave dorada y después llegá a la salida verde. Las casillas con × te devuelven al inicio sin la llave y restan 20 puntos.',
    evidence: '',
    next: 'Buscá el marcador 06.',
    hints: ['Buscá un camino hasta la llave antes de pensar en la salida. Las paredes no restan puntos.', 'Evitá las casillas rojas: no son atajos. Si un camino se corta, retrocedé y probá por otro lado.']
  },
  {
    title: 'El guardián', marker: 6, kind: 'guardian', subtitle: 'Completá la contraseña.',
    location: 'Sexto punto',
    intro: 'Ingresá la hora del reloj, el símbolo de la puerta y el objeto que dice tu última pista. Cada dos errores tenés que repetir una secuencia antes de volver a probar.',
    evidence: 'La contraseña abrió la puerta.',
    next: 'Entrá a la habitación.',
    hints: ['Revisá las pistas del reloj, las puertas y el marcador 05.', 'Usá 7, el rombo y el objeto que figura en tu última pista como «Objeto para el guardián».']
  },
  {
    title: 'La habitación vacía', marker: 6, kind: 'room', subtitle: 'El cofre no está acá.',
    location: 'Sexto punto',
    intro: 'Encontraste una nota sobre el pedestal.',
    evidence: 'La nota dice: «Volvé al lugar donde encontraste la llave».',
    next: 'Volvé al marcador 01 y escanealo otra vez.', hints: []
  },
  {
    title: 'El cofre', marker: 1, kind: 'return', subtitle: 'Una última prueba.',
    location: 'Inicio del recorrido',
    intro: 'Usá la llave para abrir el cofre. La zona roja es más chica que la primera vez.',
    evidence: 'Abriste el cofre y encontraste el tesoro.',
    next: 'Juego terminado.',
    hints: ['Funciona como la primera prueba, pero con menos margen.', 'La velocidad es la misma. Mirá una vuelta antes de intentar.']
  }
];

export const OBJECTS = ['Llave', 'Campana', 'Pluma'];
export const DOORS = [
  { name: 'Ámbar', symbol: '○', color: '#ba8429' },
  { name: 'Roja', symbol: '△', color: '#b34835' },
  { name: 'Azul', symbol: '◇', color: '#426c9a' },
  { name: 'Verde', symbol: '□', color: '#527b66' }
];
