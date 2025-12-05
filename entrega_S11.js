import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import Ammo from "ammojs-typed";

//VARIABLES GLOBALES
let scene, renderer;
let camera;
let cameraDistance = 50;
let camcontrols;
let textureLoader = new THREE.TextureLoader();
let textureTarget = textureLoader.load("src/diana.jpg");
let textureWall = textureLoader.load("src/muro.jpg");
//Para lanzar proyectil
const mouseCoords = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
//Para revisar el tipo de colision
let stuckGroup = 1,
  arrowGroup = 2;
let physicsWorld, dispatcher, broadphase, solver, collisionConfig, clock;
let clickStartTime = 0;
const MAX_CLICK_DURATION = 150;
let arrow,
  bones,
  skeletonHelper,
  lights = [];
let rigidBodies = [];

let followArrow = null;
let normalTimeStep = 1 / 60;
let slowMotionFactor = 0.2;
const params = {
  slowMotionActive: true,
};
let arrowSpeed = 100;

let canShoot = true;
let currentArrowBody = null;
let currentArrowObject = null;
let cameraPreviousPosition = new THREE.Vector3();
let cameraPreviousLookAt = new THREE.Vector3();
//FIN DE VARIABLES GLOBALES

Ammo(Ammo).then(start);

function start() {
  //Elementos gráficos
  initGraphics();
  //Elementos del mundo físico
  initPhysics();
  //Objetos
  createObjects();
  //Eventos
  initInput();
  //GUI
  initGui();

  animationLoop();
}

function initGraphics() {
  clock = new THREE.Clock();
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  camcontrols = new OrbitControls(camera, renderer.domElement);
  camera.position.set(0, 30, cameraDistance);
  camera.lookAt(0, 30, -100);
  camcontrols.target.set(0, 30, -100);
  camcontrols.update();

  lights[0] = new THREE.DirectionalLight(0xffffff, 3);
  lights[1] = new THREE.DirectionalLight(0xffffff, 3);

  lights[0].position.set(0, 200, 0);
  lights[1].position.set(100, 200, 100);

  scene.add(lights[0]);
  scene.add(lights[1]);
}

function initGui() {
  const gui = new GUI();
  const shootFolder = gui.addFolder("Parámetros de disparo");
  shootFolder
    .add({ distance: cameraDistance }, "distance", -50, 250, 0.1)
    .name("Camera Distance")
    .onChange((value) => {
      cameraDistance = value;
      updateCameraDistance();
    });
  shootFolder
    .add({ arrowVelocity: arrowSpeed }, "arrowVelocity", 1, 500, 10)
    .name("Arrow Speed")
    .onChange((value) => {
      arrowSpeed = value;
    });
  const slowmoFolder = gui.addFolder("Cámara lenta");
  slowmoFolder
    .add({ slowmoFactor: slowMotionFactor }, "slowmoFactor", 0.1, 1, 0.1)
    .name("Slow Motion Factor")
    .onChange((value) => {
      slowMotionFactor = value;
    });
  slowmoFolder.add(params, "slowMotionActive").name("Slow Motion Active");
}

function initPhysics() {
  collisionConfig = new Ammo.btDefaultCollisionConfiguration();
  dispatcher = new Ammo.btCollisionDispatcher(collisionConfig);
  broadphase = new Ammo.btDbvtBroadphase();
  solver = new Ammo.btSequentialImpulseConstraintSolver();
  physicsWorld = new Ammo.btDiscreteDynamicsWorld(
    dispatcher,
    broadphase,
    solver,
    collisionConfig
  );
  physicsWorld.setGravity(new Ammo.btVector3(0, -9.8, 0)); // gravedad
}

function createObjects() {
  createTarget(1, -2, -100);
  createTarget(-40, -2, -100);
  createTarget(40, -2, -100);

  createWall(0, 20, -70);
  let blockPlane = new THREE.Mesh(
    new THREE.BoxBufferGeometry(),
    new THREE.MeshPhongMaterial({ color: 0x37d43c })
  );
  blockPlane.position.set(0, -4, 0);
  blockPlane.scale.set(5000, 2, 5000);
  blockPlane.castShadow = true;
  blockPlane.receiveShadow = true;

  scene.add(blockPlane);
  let transform = new Ammo.btTransform();
  transform.setIdentity();
  transform.setOrigin(new Ammo.btVector3(0, -4, 0));

  let motionState = new Ammo.btDefaultMotionState(transform);

  let colShape = new Ammo.btBoxShape(
    new Ammo.btVector3(5000 * 0.5, 2 * 0.5, 5000 * 0.5)
  );
  colShape.setMargin(0.05);

  let localInertia = new Ammo.btVector3(0, 0, 0);
  colShape.calculateLocalInertia(0, localInertia);

  let rbInfo = new Ammo.btRigidBodyConstructionInfo(
    0,
    motionState,
    colShape,
    localInertia
  );
  let body = new Ammo.btRigidBody(rbInfo);

  physicsWorld.addRigidBody(body, stuckGroup, arrowGroup);
}

function animationLoop() {
  requestAnimationFrame(animationLoop);

  // paso de físicas
  physicsWorld.stepSimulation(normalTimeStep, 10);

  checkCollision();

  if (currentArrowBody && currentArrowObject) {
    applyArrowStabilization(currentArrowBody, currentArrowObject);
  }
  // actualizar flechas
  scene.traverse((obj) => {
    if (obj.userData.physicsBody) {
      const body = obj.userData.physicsBody;

      const motionState = body.getMotionState();
      if (motionState) {
        let transform = new Ammo.btTransform();
        motionState.getWorldTransform(transform);

        const origin = transform.getOrigin();
        const rotation = transform.getRotation();
        obj.position.set(origin.x(), origin.y(), origin.z());
        obj.quaternion.set(
          rotation.x(),
          rotation.y(),
          rotation.z(),
          rotation.w()
        );
      }
    }
  });
  cameraFollow();
  const time = performance.now() * 0.001;
  animateArrow(time);

  renderer.render(scene, camera);
}

function updateCameraDistance() {
  camera.position.set(0, 30, cameraDistance);
}

function initInput() {
  window.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    clickStartTime = performance.now();
  });
  window.addEventListener("pointerup", (event) => {
    if (event.button !== 0) return;

    const clickDuration = performance.now() - clickStartTime;
    // Si fue un click largo NO dispara
    if (clickDuration > MAX_CLICK_DURATION) return;
    shootArrow(event);
  });
}

function shootArrow(event) {
  if (!canShoot) return;
  // Coordenadas del ratón
  mouseCoords.set(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  );

  raycaster.setFromCamera(mouseCoords, camera);

  // Posición inicial cámara
  const start = camera.position.clone();

  const dir = raycaster.ray.direction.clone().normalize();

  // Creamos el grupo que contiene los bones y los detalles de la flecha
  const arrowContainer = createArrowGroup(start.x, start.y, start.z);

  // Se coloca el grupo de la flecha en la cámara
  arrowContainer.position.copy(start);
  arrowContainer.castShadow = true;
  arrowContainer.receiveShadow = true;

  // Orientamos los huesos
  const forward = new THREE.Vector3(1, 0, 0);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(forward, dir);
  arrowContainer.quaternion.copy(quaternion);

  // Crear rigid body para TODO el grupo (la caja de colisión)
  // le pasamos la dirección 'dir' para calcular el centro de la caja correctamente
  const arrowBody = createArrowRigidBodyForGroup(arrowContainer, dir);
  currentArrowBody = arrowBody;
  currentArrowObject = arrowContainer;

  // Velocidad de la flecha
  const velocity = dir.clone().multiplyScalar(arrowSpeed);
  arrowBody.setLinearVelocity(
    new Ammo.btVector3(velocity.x, velocity.y, velocity.z)
  );
  canShoot = false;

  cameraPreviousPosition.copy(camera.position);

  // Para la dirección, necesitamos un vector que apunte hacia donde mira la cámara
  const dirCam = new THREE.Vector3();
  camera.getWorldDirection(dir); // devuelve vector unitario en dirección de la cámara
  cameraPreviousLookAt.copy(camera.position.clone().add(dirCam));

  followArrow = arrowContainer;
  if (params.slowMotionActive) {
    normalTimeStep *= slowMotionFactor;
  }
}

function createArrowGroup(posx = 0, posy = 0, posz = 0) {
  const arrowContainer = new THREE.Group();
  arrowContainer.name = "arrowContainer";

  // Crear el SkinnedMesh (ahora createArrow NO añade nada a scene)
  const arrow = createArrow(posx, posy, posz);

  // Añadir SkinnedMesh al grupo
  arrowContainer.add(arrow);

  const helper = new THREE.SkeletonHelper(arrow);
  helper.visible = false; // para ver huesos pon true
  arrowContainer.add(helper);

  arrowContainer.position.set(posx, posy, posz);

  scene.add(arrowContainer);

  return arrowContainer;
}

function createArrow(posx = 0, posy = 0, posz = 0) {
  const nsegs = 10;
  const grosorseg = 2;
  const longitud = nsegs * grosorseg;

  // Bones
  const bones = [];
  let prevBone = new THREE.Bone();
  bones.push(prevBone);

  for (let i = 0; i < nsegs; i++) {
    const bone = new THREE.Bone();
    bone.position.x = grosorseg;
    prevBone.add(bone);
    bones.push(bone);
    prevBone = bone;
  }

  const skeleton = new THREE.Skeleton(bones);

  //Geometría
  const geometry = new THREE.CylinderGeometry(
    0.5,
    0.5,
    longitud,
    10,
    nsegs * 3,
    false
  );

  geometry.translate(0, longitud / 2, 0);
  geometry.rotateZ(-Math.PI / 2);

  //Skinning
  const posAttr = geometry.attributes.position;
  const skinIndices = [];
  const skinWeights = [];
  const v = new THREE.Vector3();
  for (let i = 0; i < posAttr.count; i++) {
    v.fromBufferAttribute(posAttr, i);

    const x = v.x + longitud / 2;

    let seg = Math.floor(x / grosorseg);
    seg = Math.max(0, Math.min(seg, bones.length - 1));

    let next = Math.min(seg + 1, bones.length - 1);

    const weight = (x % grosorseg) / grosorseg;

    skinIndices.push(seg, next, 0, 0);
    skinWeights.push(1 - weight, weight, 0, 0);
  }

  geometry.setAttribute(
    "skinIndex",
    new THREE.Uint16BufferAttribute(skinIndices, 4)
  );
  geometry.setAttribute(
    "skinWeight",
    new THREE.Float32BufferAttribute(skinWeights, 4)
  );

  const material = new THREE.MeshPhongMaterial({
    color: 0xab5703,
    flatShading: true,
  });

  const arrow = new THREE.SkinnedMesh(geometry, material);
  arrow.add(bones[0]);
  arrow.bind(skeleton);

  // Punta y plumas
  const tipBone = bones[bones.length - 1];
  const endBone = bones[0];
  const tip = createArrowTip(1);
  const feather = createArrowFeather(2);

  tip.position.set(grosorseg * 0.5, 0, 0);
  feather.position.set(grosorseg * 0.5, 0, 0);
  tipBone.add(tip);
  endBone.add(feather);

  // importante: el SkinnedMesh está en el origen local del grupo,
  // la posición del mesh se deja en (0,0,0) para que el group controle la posición global.
  arrow.position.set(0, 0, 0);

  return arrow;
}

function createArrowTip(size = 2) {
  const radius = 1.2 * size;
  const height = 3 * size;

  // Cono de 4 caras que parece punta de flecha medieval
  const geometry = new THREE.ConeGeometry(radius, height, 4);

  // Rotar el cono para que apunte en +X
  geometry.rotateZ(-Math.PI / 2);

  const material = new THREE.MeshPhongMaterial({
    color: 0x990000,
    flatShading: true,
    side: THREE.DoubleSide,
  });

  const tip = new THREE.Mesh(geometry, material);

  return tip;
}

function createArrowFeather(size = 1) {
  const width = 2 * size;
  const height = 2.5 * size;

  // --- Geometría de un triángulo plano ---
  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    0,
    0,
    0, // punto en el eje X (cerca del final del palo)
    -height,
    width / 2,
    0, // esquina arriba-atrás
    -height,
    -width / 2,
    0, // esquina abajo-atrás
  ]);

  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshPhongMaterial({
    color: 0xdddddd,
    side: THREE.DoubleSide,
    flatShading: true,
  });

  // Creamos 4 plumas
  const group = new THREE.Group();

  for (let i = 0; i < 4; i++) {
    const feather = new THREE.Mesh(geometry, material);

    // Rotamos 0°, 90°, 180°, 270° alrededor del eje X
    feather.rotation.x = (Math.PI / 2) * i;

    group.add(feather);
  }

  // Colocar todo el pack de plumas hacia la parte FINAL de la flecha (+X)
  group.position.set(0, 0, 0);

  return group;
}

function createArrowRigidBodyForGroup(arrowContainer, direction) {
  // --- Dimensiones de la flecha completa ---
  const nsegs = 10;
  const grosorseg = 2;
  const longitudPalo = nsegs * grosorseg;
  const punta = 3; // tamaño de la punta
  const plumas = 2.5; // tamaño de las plumas
  const longitudTotal = longitudPalo + punta + plumas;

  const radius = 1;

  const halfExtents = new Ammo.btVector3(longitudTotal / 2 + 6, radius, radius);
  const shape = new Ammo.btBoxShape(halfExtents);
  shape.setMargin(0.05);

  const transform = new Ammo.btTransform();
  transform.setIdentity();

  const worldPos = new THREE.Vector3();
  arrowContainer.getWorldPosition(worldPos);

  const center = worldPos
    .clone()
    .add(direction.clone().multiplyScalar(longitudTotal / 2));

  transform.setOrigin(new Ammo.btVector3(center.x, center.y, center.z));

  const worldQuat = arrowContainer.getWorldQuaternion(new THREE.Quaternion());
  transform.setRotation(
    new Ammo.btQuaternion(worldQuat.x, worldQuat.y, worldQuat.z, worldQuat.w)
  );
  /*const debugBox = new THREE.Mesh(
    new THREE.BoxGeometry(longitudTotal, radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({ wireframe: true, color: 0xff0000 })
  );
  debugBox.position.copy(center);
  debugBox.quaternion.copy(
    arrowContainer.getWorldQuaternion(new THREE.Quaternion())
  );
  scene.add(debugBox);*/
  const motionState = new Ammo.btDefaultMotionState(transform);

  const mass = 0.2;
  const localInertia = new Ammo.btVector3(0, 0, 0);
  shape.calculateLocalInertia(mass, localInertia);

  const rbInfo = new Ammo.btRigidBodyConstructionInfo(
    mass,
    motionState,
    shape,
    localInertia
  );
  const body = new Ammo.btRigidBody(rbInfo);

  physicsWorld.addRigidBody(body, arrowGroup, stuckGroup);

  arrowContainer.userData.physicsBody = body;
  rigidBodies.push(arrowContainer);

  body.activate(true);

  return body;
}

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

function cameraFollow() {
  if (!followArrow) return;

  const arrowPos = new THREE.Vector3();
  followArrow.getWorldPosition(arrowPos);

  // Offset para ver la flecha desde atrás y arriba
  const offset = new THREE.Vector3(-10, 2, 0);
  offset.applyQuaternion(followArrow.quaternion);

  camera.position.lerp(arrowPos.clone().add(offset), 0.1); // suavizado
  camera.lookAt(arrowPos);
}

function createTarget(posx, posy, posz) {
  const targetGroup = new THREE.Group();

  const legGeom = new THREE.CylinderGeometry(1, 1, 15);
  const legMat = new THREE.MeshBasicMaterial({ color: 0xc9670a });
  const angleBetween = (2 * Math.PI) / 3;
  const legHeight = 15;
  const legTopY = legHeight / 2;
  const radius = 5;

  for (let i = 0; i < 3; i++) {
    const leg = new THREE.Mesh(legGeom, legMat);

    const x = radius * Math.cos(i * angleBetween);
    const z = radius * Math.sin(i * angleBetween);
    leg.position.set(x, legTopY - 4, z); // base en y=0

    const dir = new THREE.Vector3(-x, legTopY, -z).normalize();
    const axis = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, dir);
    leg.quaternion.copy(quaternion);

    targetGroup.add(leg);
  }

  const targetGeom = new THREE.CylinderGeometry(10, 10, 1, 32);
  const targetMat = new THREE.MeshBasicMaterial({
    color: 0xf5f5f5,
    map: textureTarget,
  });
  const target = new THREE.Mesh(targetGeom, targetMat);

  target.position.y = legHeight + 3;
  target.rotation.x = Math.PI / 2;
  targetGroup.add(target);
  targetGroup.position.set(posx, posy, posz);

  scene.add(targetGroup);

  const radiusTarget = 10;
  const thickness = 1;

  const colShape = new Ammo.btCylinderShape(
    new Ammo.btVector3(radiusTarget, thickness, radiusTarget)
  );
  colShape.setMargin(0.05);

  const transform = new Ammo.btTransform();
  transform.setIdentity();

  const worldPos = new THREE.Vector3();
  target.getWorldPosition(worldPos);

  transform.setOrigin(new Ammo.btVector3(worldPos.x, worldPos.y, worldPos.z));

  const quat = new THREE.Quaternion();
  quat.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));

  transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));

  const mass = 0;
  const motionState = new Ammo.btDefaultMotionState(transform);
  const localInertia = new Ammo.btVector3(0, 0, 0);

  const rbInfo = new Ammo.btRigidBodyConstructionInfo(
    mass,
    motionState,
    colShape,
    localInertia
  );

  const body = new Ammo.btRigidBody(rbInfo);
  physicsWorld.addRigidBody(body, stuckGroup, arrowGroup);

  return targetGroup;
}

function createWall(posx, posy, posz) {
  let blockPlane = new THREE.Mesh(
    new THREE.BoxBufferGeometry(),
    new THREE.MeshPhongMaterial({ color: 0xf5f5f5, map: textureWall })
  );
  blockPlane.position.set(posx, posy - 1, posz * 2);
  blockPlane.scale.set(200, 50, 2);
  blockPlane.castShadow = true;
  blockPlane.receiveShadow = true;

  scene.add(blockPlane);
  let transform = new Ammo.btTransform();
  transform.setIdentity();
  transform.setOrigin(new Ammo.btVector3(posx, posy - 1, posz * 2));

  let motionState = new Ammo.btDefaultMotionState(transform);

  let colShape = new Ammo.btBoxShape(
    new Ammo.btVector3(200 * 0.5, 25 * 0.5, 2 * 0.5)
  );
  colShape.setMargin(0.05);

  let localInertia = new Ammo.btVector3(0, 0, 0);
  colShape.calculateLocalInertia(0, localInertia);

  let rbInfo = new Ammo.btRigidBodyConstructionInfo(
    0,
    motionState,
    colShape,
    localInertia
  );
  let body = new Ammo.btRigidBody(rbInfo);

  physicsWorld.addRigidBody(body, stuckGroup, arrowGroup);
}

function animateArrow(time) {
  if (!currentArrowObject) return;

  const skinned = currentArrowObject.children.find((c) => c.isSkinnedMesh);
  if (!skinned) return;
  const bones = skinned.skeleton.bones;
  const n = bones.length;

  // Parámetros de amplitud y frecuencia
  const amplitude = 0.2; 
  const speed = 2; // velocidad del movimiento ondulatorio

  for (let i = 1; i < n - 1; i++) {
    // ignoramos base y punta
    const t = i / (n - 1); // 0 en base, 1 en punta
    // desplazamiento lateral: centro máximo, extremos mínimo, simétrico
    const centerFactor = Math.sin(Math.PI * t); // seno de 0 a π
    bones[i].position.z = Math.sin(time * speed) * amplitude * centerFactor;
  }
  let featherGroup = null;

  currentArrowObject.traverse((obj) => {
    if (obj.name === "" && obj.type === "Group") {
      // Buscamos grupo con 4 meshes de plumas dentro
      if (obj.children.length === 4 && obj.children[0].isMesh) {
        featherGroup = obj;
      }
    }
  });

  if (featherGroup) {
    const featherAmp = 0.8; // amplitud del bamboleo
    const featherSpeed = 2; // velocidad de vibración

    // Aplicamos una oscilación alternada a cada feather
    featherGroup.children.forEach((feather, i) => {
      const wobble = Math.sin(time * featherSpeed) * featherAmp;

      if (i === 0 || i === 2) {
        // Plumas verticales → se mueven en Y
        feather.rotation.x = wobble;
      }
    });
  }
}

function applyArrowStabilization(body, arrowObj) {
  const forward = new THREE.Vector3(1, 0, 0).applyQuaternion(
    arrowObj.quaternion
  );
  const velocity = body.getLinearVelocity();
  const vel = new THREE.Vector3(velocity.x(), velocity.y(), velocity.z());
  if (vel.length() < 0.01) return;

  const desired = vel.clone().normalize();

  const axis = new THREE.Vector3().crossVectors(forward, desired);
  const angle = forward.angleTo(desired);

  const torqueStrength = 8;

  const torque = axis.normalize().multiplyScalar(angle * torqueStrength);

  body.applyTorque(new Ammo.btVector3(torque.x, torque.y, torque.z));
}
function originalFormArrow(arrowObj) {
  if (!arrowObj) return;

  // Buscamos el SkinnedMesh
  const skinned = arrowObj.children.find((c) => c.isSkinnedMesh);
  if (!skinned) return;

  const bones = skinned.skeleton.bones;
  const n = bones.length;
  const grosorseg = 2; // Debe coincidir con el grosor usado al crear la flecha

  // Resetear posiciones de los bones a su forma original
  bones[0].position.set(0, 0, 0);
  for (let i = 1; i < n; i++) {
    bones[i].position.set(grosorseg, 0, 0);
  }

  // Resetear plumas con orientación alternada: vertical, horizontal, vertical, horizontal
  arrowObj.traverse((obj) => {
    if (obj.type === "Group" && obj.children.length === 4) {
      obj.children.forEach((feather, i) => {
        feather.position.set(0, 0, 0); // posición original
        // Alternamos rotación según índice
        if (i % 2 === 0) {
          feather.rotation.set(0, 0, 0); // vertical
        } else {
          feather.rotation.set(Math.PI / 2, 0, 0); // horizontal
        }
      });
    }
  });
}

