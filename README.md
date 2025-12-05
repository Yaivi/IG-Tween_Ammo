# IG-Tween_Ammo
Escena 3D interactiva de Three.js animada por Tween.js y con físicas de Ammo.js, esta consiste en una serie de objetos, creados con diferentes materiales y físicas, a los que disparar unas flechas que han sido creadas aplicando los conocimientos adquiridos de Tween.js y Ammo.j. Funciona con el control de la cámara y al hacer click se genera el objeto de la flecha, que mientras se encuentre en movimiento por el aire, se pierde el control la cámara activando un efecto de slow motion para poder apreciar mejor la creación del objeto.

**ENLACE AL CÓDIGO**: https://codesandbox.io/p/sandbox/ig2526-s10-forked-f6rr86

**ENLACE A LA SIMULACIÓN**: https://f6rr86.csb.app/

## Índice
- [Controles](#controles)
- [Cámara](#cámara)
- [Modelos y Físicas](#modelos-y-físicas)
  - [Proyectil](#proyectil)
  - [Diana](#diana)
  - [Muro](#muro)
- [Físicas](#físicas)
- [Animación](#animación)
- [Galería](#galería)
- [Bibliografía](#bibliografía)

## Controles
Para realizar disparos se debe pulsar el botón izquierdo del ratón, se debe hacer un click rápido, sostener el botón no resultará en el disparo de una flecha. Arriba a la derecha se encuentran algunos sliders que controlan la distancia de la cámara con respecto a las dianas, la velocidad de lanzamiento de la flecha, la fuerza de un efecto de slowMotion que se le aplica a las físicas de la simulación y la opción de activar y desactivar este efecto.

## Cámara
Para mover la cámara se hace uso de ambos botones del ratón, el izquierdo al mantenerlo presionado y mover el ratón, rota la cámara en la dirección opuesta en la que se mueva el ratón, y el botón derecho sirve para mover la posición de la cámara en el eje X e Y. Para hacer y deshacer zoom se usa la rueda del ratón.

## Modelos y Físicas
### Proyectil
La parte principal de este proyecto, el proyectil consiste en un objeto *rigidBody* que tiene forma de **flecha**. El modelo en su conjunto esta formado por 5 partes diferentes, la punta, el palo y las plumas, que conforman la parte visible y animada del objeto, el grupo, que contiene todos los modelos 3D en su conjunto, y el rigidBody que se le aplica al grupo para que la caja de colisiones sea lo más parecida al modelo. 

* **Punta**: se usa un cono para la geometría y un MeshPhong para el material. Luego se coloca en la parte posterior del palo.
* **Palo**: esta parte del modelo esta creada a partir de *Bones*, para dividir la flecha en segmentos, con el objetivo de en el futuro animar el modelo cuando la flecha se encuentre en movimiento. Cada uno de los huesos se crea y se añade como hijo al anterior para luego crear el *Skeleton* del conjunto, que se le pasará al SkinnedMesh para poder deformarse. Tras esto se crea la geometría del cilindro, los vértices y los pesos de cada hueso para guardarlos en la geometría, con esta información se consigue la transición suave entre huesos (blending). Ahora que se tiene la geometría y todos los datos, se crea el material con MeshPhong y se usa junto a la geometría para definir el SkinnedMesh, al SkinnedMesh se le añade como hijo el hueso raíz para que el Skeleton y SkeletonHelper funcionen, luego se liga el Skeleton. Para acabar se llama a las funciones que crean la punta y las plumas para colocarlas en los huesos correspondientes.
* **Plumas**: se crean 4 triángulos planos formados mediante tres vértices que representan las plumas de la flecha. Cada triángulo se rota 90º con respecto al anterior. Al crearlos se colocan en la parte del final de la flecha.
* **Grupo**: esta parte del modelo no crea ningún modelo extra, solo se usa para facilitar la creación de la caja de colisión con un tamaño más acorde al del modelo.
* **RigidBody**: el cuerpo físico de la flega, primero se calcula la longitud del proyectil para crear una caja de colisión alargada que contenga toda la flecha con *btBoxshape*. Después obtiene la posición y orientación global del grupo y coloca la caja centrada a mitad del objeto, luego le aplica la misma orientacion y posicion que la flecha. Se continúa modificando el MotionState para sincronizar el objeto con la simulación, se le añade la inercia y se concentra en una variable esta información para luego crear el rigidBody que se va a colocar en el mundo, acabando con la activación del cuerpo y añadiéndole las colisiones a este objeto. Para este último paso se crean masks para definir tipos de objetos que colisionan entre sí en este caso indicando que el cuerpo pertenece al arrowGroup y que colisiona con objetos del grupo stuckGroup.
```
let stuckGroup = 1,
  arrowGroup = 2;

physicsWorld.addRigidBody(body, arrowGroup, stuckGroup);
```

### Diana
Estos objetos se han creado para practicar los tiros, están formado por 3 cilindros que hacen de la base de la diana, cada uno rotada 120º. Encima de los cilindros se ha colocado otro cilindro, que ha sido rotado 90º en el eje X para estar en erguido, se le ha añadido una textura de diana para añadirle detalle. Para que cumpla su función se le ha añadido un rigidBody con su forma para poder dispararle y que se le claven las flechas.

### Muro
Otro objeto con física al que disparar las flechas, se le ha puesto una textura para mayor detalle y se le ha puesto

## Físicas
Dentro del mundo de la escena la flecha está sujeta a una gravedad, definida con physicsWorld.setGravity(new Ammo.btVector3(0, -9.8, 0)) que hace que su altura baje, causando una trayectoria parabólica hasta acabar en el suelo. Al disparar la flecha se le aplica una velocidad inicial en dirección a donde se haga click en la cámara. 

Junto con estos valores, se le aplica a la flecha una estabilización que hace que el modelo apunte siempre en la dirección de la velocidad, aplicando un torque que hace que la flecha "gire" y se alinee con el vector de velocidad. Permitiendo que el modelo actualice su postura y que en casos en los que se lanza la flecha de forma más vertical igualmente impacte con la punta.

Todos estos efectos físicos que se le aplican a la flecha influyen en su trayectoria, por otro lado los rigidBodies que se han añadido a la escena, como las dianas, el muro y el suelo causan colisiones con la flecha. Para mayor realismo se ha implementando una función para dejar clavadas las flechas una vez impacten contra otro rigidBody, primero detectando si hay alguna colisión, a través de la función checkColission().

```
function checkCollision() {
  const dispatcher = physicsWorld.getDispatcher();
  const numManifolds = dispatcher.getNumManifolds();

  if (!currentArrowBody) return;

  for (let i = 0; i < numManifolds; i++) {
    const manifold = dispatcher.getManifoldByIndexInternal(i);

    const body0 = Ammo.castObject(manifold.getBody0(), Ammo.btRigidBody);
    const body1 = Ammo.castObject(manifold.getBody1(), Ammo.btRigidBody);

    if (body0 !== currentArrowBody && body1 !== currentArrowBody) continue;

    const numContacts = manifold.getNumContacts();
    if (numContacts === 0) continue;

    for (let j = 0; j < numContacts; j++) {
      const pt = manifold.getContactPoint(j);

      if (pt.getDistance() < 0) {
        // Punto de impacto en espacio mundial
        const pos = pt.getPositionWorldOnB();
        const hitPoint = new THREE.Vector3(pos.x(), pos.y(), pos.z());

        stickArrow(currentArrowObject, currentArrowBody, hitPoint);
        return; // evitamos múltiples detecciones
      }
    }
  }
}

```
La función obtiene el dispatcher del mundo físico y el número de manifolds, que en Ammo representan los puntos de contacto entre 2 cuerpos en un frame de simulación. Se recorren todos estos manifolds y se revisa si alguno de los cuerpos involucrados en la colisión es la flecha actual, revisando la variable currentArrowBody, si lo es revisa el número de contactos y si hay al mennos uno, encuentra el punto en el espacio del mundo y llama a la función         stickArrow(currentArrowObject, currentArrowBody, hitPoint) para completar la fijación de la flecha al colisionar.

```
async function stickArrow(arrowObj, body, hitPoint) {
  // 1. Desactivar la física
  originalFormArrow(arrowObj);
  physicsWorld.removeRigidBody(body);
  body.setActivationState(Ammo.DISABLE_SIMULATION);

  // 2. Colocar la flecha en la posición del impacto
  arrowObj.position.copy(hitPoint);
  arrowObj.quaternion.copy(currentArrowObject.quaternion);

  // 3. Limpiar variables
  currentArrowBody = null;
  currentArrowObject = null;
  // 4 retardo para ver el impacto de la flecha
  await new Promise((r) => setTimeout(r, 3000));
  // 5. Liberar cámara y permitir nuevos disparos
  followArrow = null;
  canShoot = true;
  camera.position.copy(cameraPreviousPosition);
  camera.lookAt(cameraPreviousLookAt);
  // 6. Restaurar velocidad normal
  normalTimeStep = 1 / 60;
}
```
Como se puede ver por los comentarios del código de la función, esta desactiva la física la física del objeto flecha, eliminando su rigidBody pues no lo va a necesitar más, reposiciona el objeto en el lugar del impacto, se limpian las variables de la flecha actual, se causa un retardo de 3 segundos para poder ver donde ha impactado la flecha. Tras esos segundos se libera la cámara y ya se puede volver a disparar, y también se restablece la velocidad de la simulación física a antes de aplicar el slowMotion.


## Animación
Para la animación se han creado 2 formas de realizar el mismo movimiento, uno usando TWEENS y otro a través de senos,  curva ndo la flecha, simulando como ocurre con estas al ser lanzadas en la vida real (vídeo de ejemplo). En ambos casos el movimiento es el mismo un bamboleo del palo, que se acentua en el centro de este, y el movimiento de las plumas de la flecha.
![Gif de la Tierra](https://raw.githubusercontent.com/Yaivi/IG-Tween_Ammo/main/IG_TWEEN_ANIM.gif.)
Para la versión de **TWEENS**, primero localiza el SkinnedMesh y prepara un estado interno que representa una fase que avanza de 0 a 2π cada 2 segundos. Este estado se anima mediante un tween infinito y, en cada actualización, se usa esa fase para mover los huesos de la flecha, causando la flexión que es mayor en los centrales y menor en base y punta. Al finalizar cada actualización se fuerza updateMatrixWorld() para asegurar que la deformación se aplique correctamente. Luego busca el grupo de plumas y crea otro tween independiente que también avanza una fase sinusoidal de 0 a 2π. Con esa fase se rota únicamente las plumas verticales, generando un bamboleo constante. 
Esta versión requiere iniciar un tween al disparar la flecha, para cuando la flecha impacte se debe decir a los Tween de arrowBone y feather que paren con .stop(). Además de realizar ciertos cambios en stickArrow() y animateLoop() para funcionar, realiza los mismo pasos descritos con anterioridad pero usando otras funciones y variables propias de TWEEN.


En cambio la de **senos** no usa fases de 0 a 2π, aquí el valor depende directamente del tiempo transcurrido y se recalcula cada frame. Al igual que antes se localiza el SkinnedMesh y obtiene su esqueleto, con los huesos calcula una oscilación basada en senos, donde los huesos centrales del palo se mueven más y los extremos casi nada. Este efecto se consigue multiplicando el seno del tiempo, valor que se obtiene del animationLoop, por una amplitud y un factor que depende de la posición del hueso dentro del esqueleto, haciendo un movimiento natural de vibración mientras la flecha está en vuelo. Para las plumas busca el grupo que las contiene y les aplica una vibración también basada en senos. Solo se rotan las plumas verticales en el eje X, simulando las turbulencias  generadas por el aire. Para parar la animación de las flechas estáticas no hace falta hacer nada, pues para animar la flecha primero debe ser la flecha disparada actualmente, por lo que en cuanto impacte y deje de ser la flecha actual se para de animar

**En los archivos se han puesto ambas versiones, y accediendo al enlace del código se puede comprobar el correcto funcionamiento de ambas versiones si se prueban ambos archivos en el index.html.**


## Galería
![Gif de la Tierra](https://raw.githubusercontent.com/Yaivi/IG-Tween_Ammo/main/IG_TWEEN_ANIM.gif)

**VÍDEO DE DEMOSTRACIÓN**: https://drive.google.com/file/d/1k9AuZib7z2JSTirzYdX7D10h7x2YYG-b/view?usp=sharing

## Bibliografía
* **Manual de Usuario de Bullet de Ammo.js**: https://github.com/kripken/ammo.js/blob/main/bullet/Bullet_User_Manual.pdf
* **Tutoriales introductorios a Ammo.js**:
  * **Tutorial sobre poner Rigid Bodies**: https://medium.com/%40bluemagnificent/intro-to-javascript-3d-physics-using-ammo-js-and-three-js-dd48df81f591
  * **Tutorial sobre colisiones**: https://medium.com/@bluemagnificent/collision-detection-in-javascript-3d-physics-using-ammo-js-and-three-js-31a5569291ef
