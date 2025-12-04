# IG-Tween_Ammo
Escena 3D interactiva de Three.js animada por Tween.js y con físicas de Ammo.js, esta consiste en una serie de objetos, creados con diferentes materiales y físicas, a los que disparar unas flechas que han sido creadas aplicando los conocimientos adquiridos de Tween.js, Ammo.js y el uso de SkinnedMesh. Funciona con el control de la cámara y al hacer click se genera el objeto de la flecha, que mientras se encuentre en movimiento por el aire, se pierde el control la cámara activando un efecto de slow motion para poder apreciar mejor la creación del objeto.

## Índice


## Controles
Para realizar disparos se debe pulsar el botón izquierdo del ratón, se debe hacer un click rápido, sostener el botón no resultará en el disparo de una flecha.

## Cámara
Para mover la cámara se hace uso de ambos botones del ratón, el izquierdo al mantenerlo presionado y mover el ratón, rota la cámara en la dirección opuesta en la que se mueva el ratón, y el botón derecho sirve para mover la posición de la cámara en el eje X e Y. Para hacer y deshacer zoom se usa la rueda del ratón.

## Modelos y Físicas
### Proyectil
La parte principal de este proyecto, el proyectil consiste en un objeto *rigidBody* que tiene forma de **flecha**. El modelo en su conjunto esta formado por 5 partes diferentes, la punta, el palo, las plumas, el grupo que contiene todo en su conjunto y el rigidBody que se le aplica al grupo para que la caja de colisiones sea lo más parecida al modelo. 

* Punta:
* Palo: esta parte del modelo esta creada a partir de *Bones*, con el objetivo de animar el modelo cuando la flecha se encuentre en movimiento. Cada uno de los huesos se crea y se conecta al anterior para luego crear el *Skeleton* del conjunto, añadirle el Mesh de cilindro y para acabar llamar a las funciones que crean la punta y las plumas para colocarlas en los Bones correspondientes
* Plumas:
* Grupo:
* RigidBody:


### Diana

### Muro


## Galería

## Bibliografía
* Manual de Usuario de Bullet de Ammo.js: https://github.com/kripken/ammo.js/blob/main/bullet/Bullet_User_Manual.pdf
* Tutoriales introductorios a Ammo.js:
  * Tutorial sobre poner Rigid Bodies: https://medium.com/%40bluemagnificent/intro-to-javascript-3d-physics-using-ammo-js-and-three-js-dd48df81f591
  * Tutorial sobre colisiones: https://medium.com/@bluemagnificent/collision-detection-in-javascript-3d-physics-using-ammo-js-and-three-js-31a5569291ef
