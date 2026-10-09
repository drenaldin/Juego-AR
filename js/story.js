// Ajustar las indicaciones cuando estén elegidos los lugares de cada marcador.
export const STATIONS = [
  {
    title: 'La llave del capitán', marker: 1, kind: 'key', subtitle: 'Frená en la zona roja.',
    location: 'Inicio del recorrido',
    intro: 'La llave del capitán está trabada. Detenela dentro de la franja roja para sacarla.',
    evidence: 'Encontraste la llave del capitán. Tiene una etiqueta: «Devolver al lugar de origen».',
    next: 'Buscá el marcador 02.',
    hints: ['Mirá una vuelta completa antes de tocar el botón.', 'La llave tarda cuatro segundos en dar una vuelta. Prepará el toque cuando se acerque a la franja roja.']
  },
  {
    title: 'El reloj de a bordo', marker: 2, kind: 'clock', subtitle: 'Contá los destellos.',
    location: 'Segundo punto',
    intro: 'El faro manda una señal. Reproducila, contá los destellos y detené la aguja del reloj en esa hora.',
    evidence: 'El reloj se detuvo a las siete.',
    next: 'Buscá el marcador 03.',
    hints: ['La cantidad de destellos indica la hora.', 'Son siete destellos. Detené la aguja en el 7.']
  },
  {
    title: 'Las puertas del barco', marker: 3, kind: 'doors', subtitle: 'Repetí la secuencia.',
    location: 'Tercer punto',
    intro: 'Una de estas puertas esconde una pista del capitán. Mirá las cinco luces y repetí el orden con los botones. Si fallás, la secuencia cambia.',
    evidence: 'La puerta azul se abrió. Adentro había un rombo: ◇.',
    next: 'Buscá el marcador 04.',
    hints: ['También podés recordar las figuras de las puertas.', 'Separá los cinco pasos en un grupo de tres y otro de dos. Podés volver a ver la secuencia.']
  },
  {
    title: 'La bitácora mentirosa', marker: 4, kind: 'archive', subtitle: 'Una de las frases es mentira.',
    location: 'Cuarto punto',
    intro: 'Alguien cambió una frase en la bitácora. Elegí la mentira usando las pistas que encontraste. Si te equivocás, tenés que esperar diez segundos.',
    evidence: 'La frase B era falsa: la puerta era azul, no roja.',
    next: 'Buscá el marcador 05.',
    hints: ['Revisá lo que viste en el reloj y en las puertas.', 'La puerta que se abrió era azul. La frase que dice roja es falsa.']
  },
  {
    title: 'El laberinto', marker: 5, kind: 'maze', subtitle: 'Una isla, una llave y unas cuantas trampas.',
    location: 'Quinto punto',
    intro: 'Cruzá la isla con las flechas. Agarrá la llave y llegá a la salida verde. Las casillas × te mandan al inicio sin la llave (−20 puntos).',
    evidence: '',
    next: 'Buscá el marcador 06.',
    hints: ['Buscá un camino hasta la llave antes de pensar en la salida. Las paredes no restan puntos.', 'Evitá las casillas rojas: no son atajos. Si un camino se corta, retrocedé y probá por otro lado.']
  },
  {
    title: 'El guardián del barco', marker: 6, kind: 'guardian', subtitle: 'Completá la contraseña.',
    location: 'Sexto punto',
    intro: 'Ingresá la hora del reloj, el símbolo de la puerta y el objeto que dice tu última pista. Cada dos errores tenés que repetir una secuencia antes de volver a probar.',
    evidence: 'El guardián aceptó la contraseña y abrió el camarote.',
    next: 'Entrá al camarote del capitán.',
    hints: ['Revisá las pistas del reloj, las puertas y el marcador 05.', 'Usá 7, el rombo y el objeto que figura en tu última pista como «Objeto para el guardián».']
  },
  {
    title: 'El camarote vacío', marker: 6, kind: 'room', subtitle: 'El cofre no está acá.',
    location: 'Sexto punto',
    intro: 'Ni una moneda. El capitán dejó una nota sobre la mesa.',
    evidence: 'La nota dice: «Volvé al lugar donde encontraste la llave».',
    next: 'Volvé al marcador 01 y escanealo otra vez.', hints: []
  },
  {
    title: 'El cofre del capitán', marker: 1, kind: 'return', subtitle: 'Una última prueba.',
    location: 'Inicio del recorrido',
    intro: 'El botín estuvo acá todo el tiempo. Usá la llave para abrir el cofre: la zona roja es más chica que la primera vez.',
    evidence: 'Abriste el cofre. El botín del capitán es tuyo.',
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
