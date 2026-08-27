import * as THREE from 'three';
import './style.css';

const canvas = document.querySelector('#game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9bb4c6);
scene.fog = new THREE.FogExp2(0xa7bbc8, 0.00115);

const camera = new THREE.PerspectiveCamera(66, 1, 0.08, 2200);
scene.add(camera);

const hemi = new THREE.HemisphereLight(0xddeeff, 0x314132, 1.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffefd2, 3.4);
sun.position.set(-80, 130, 120);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -90;
sun.shadow.camera.right = 90;
sun.shadow.camera.top = 90;
sun.shadow.camera.bottom = -90;
scene.add(sun);

const mats = {
  rail: new THREE.MeshStandardMaterial({ color: 0x6b7378, metalness: .75, roughness: .33 }),
  sleeper: new THREE.MeshStandardMaterial({ color: 0x4b3f35, roughness: .92 }),
  ballast: new THREE.MeshStandardMaterial({ color: 0x777a78, roughness: 1 }),
  grass: new THREE.MeshStandardMaterial({ color: 0x526a45, roughness: 1 }),
  darkGrass: new THREE.MeshStandardMaterial({ color: 0x3e5438, roughness: 1 }),
  concrete: new THREE.MeshStandardMaterial({ color: 0xa7a9a6, roughness: .95 }),
  darkMetal: new THREE.MeshStandardMaterial({ color: 0x2b3034, roughness: .62, metalness: .25 }),
  black: new THREE.MeshStandardMaterial({ color: 0x0d1012, roughness: .55 }),
  cab: new THREE.MeshStandardMaterial({ color: 0x34393d, roughness: .74 }),
  cabLight: new THREE.MeshStandardMaterial({ color: 0x5b6268, roughness: .72 }),
};

function mesh(geo, material, parent = scene, cast = true, receive = true) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = cast;
  m.receiveShadow = receive;
  parent.add(m);
  return m;
}
function box(x, y, z, w, h, d, material, parent = scene) {
  const m = mesh(new THREE.BoxGeometry(w, h, d), material, parent);
  m.position.set(x, y, z);
  return m;
}
function cyl(x, y, z, r, h, material, parent = scene, segments = 18) {
  const m = mesh(new THREE.CylinderGeometry(r, r, h, segments), material, parent);
  m.position.set(x, y, z);
  return m;
}

// Track path: long gentle S-curves with a tunnel section and stations.
const path = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0, 120),
  new THREE.Vector3(0, 0, -700),
  new THREE.Vector3(-22, 0, -1500),
  new THREE.Vector3(-58, 0, -2600),
  new THREE.Vector3(-30, 0, -3700),
  new THREE.Vector3(28, 0, -4700),
  new THREE.Vector3(50, 0, -5900),
  new THREE.Vector3(5, 0, -7200),
  new THREE.Vector3(-45, 0, -8500),
  new THREE.Vector3(-10, 0, -10100),
  new THREE.Vector3(35, 0, -11800)
], false, 'catmullrom', .5);
const routeLength = path.getLength();

function basisAt(u) {
  const p = path.getPointAt(THREE.MathUtils.clamp(u, 0, 1));
  const t = path.getTangentAt(THREE.MathUtils.clamp(u, 0, 1)).normalize();
  const right = new THREE.Vector3(-t.z, 0, t.x).normalize();
  return { p, t, right };
}

const trackGroup = new THREE.Group();
scene.add(trackGroup);

// Terrain strip follows the full route using repeated large tiles.
for (let i = 0; i < 95; i++) {
  const u = i / 94;
  const { p, t } = basisAt(u);
  const yaw = Math.atan2(t.x, t.z);
  const g = box(p.x, -.55, p.z, 150, .8, 150, i % 2 ? mats.grass : mats.darkGrass, trackGroup);
  g.rotation.y = yaw;
}

// Rails, ballast, sleepers, catenary.
for (let i = 0; i < 1000; i++) {
  const u = i / 999;
  const { p, t, right } = basisAt(u);
  if (i % 2 === 0) {
    const sl = box(p.x, .01, p.z, 2.75, .12, .28, mats.sleeper, trackGroup);
    sl.rotation.y = Math.atan2(t.x, t.z);
  }
  if (i % 6 === 0) {
    const ballast = box(p.x, -.08, p.z, 4.6, .20, 6.2, mats.ballast, trackGroup);
    ballast.rotation.y = Math.atan2(t.x, t.z);
  }
  if (i % 3 === 0) {
    for (const s of [-1, 1]) {
      const rp = p.clone().addScaledVector(right, .76 * s);
      const rail = box(rp.x, .13, rp.z, .095, .14, 6.1, mats.rail, trackGroup);
      rail.rotation.y = Math.atan2(t.x, t.z);
    }
  }
  if (i % 22 === 0) {
    for (const side of [-1, 1]) {
      const pp = p.clone().addScaledVector(right, 4.7 * side);
      const pole = box(pp.x, 3.5, pp.z, .14, 7, .14, mats.darkMetal, trackGroup);
      pole.rotation.y = Math.atan2(t.x, t.z);
    }
    const arm = box(p.x, 6.75, p.z, 9.6, .12, .12, mats.darkMetal, trackGroup);
    arm.rotation.y = Math.atan2(t.x, t.z);
  }
}

// Continuous-ish contact wire segments.
for (let i = 0; i < 240; i++) {
  const u = i / 239;
  const { p, t } = basisAt(u);
  const wire = box(p.x, 6.28, p.z, .026, .026, 28, mats.black, trackGroup);
  wire.rotation.y = Math.atan2(t.x, t.z);
}

function makeTree(x, z, scale = 1) {
  const g = new THREE.Group();
  const trunk = cyl(0, 1.25, 0, .18 * scale, 2.5 * scale, new THREE.MeshStandardMaterial({ color: 0x614530, roughness: 1 }), g, 10);
  const crownMat = new THREE.MeshStandardMaterial({ color: 0x365c36, roughness: 1 });
  const crown = mesh(new THREE.ConeGeometry(1.5 * scale, 4.5 * scale, 8), crownMat, g);
  crown.position.y = 4 * scale;
  g.position.set(x, 0, z);
  scene.add(g);
  return g;
}

function makeHouse(x, z, yaw, scale = 1) {
  const g = new THREE.Group();
  const wall = new THREE.MeshStandardMaterial({ color: [0xb8afa1,0xa49c8f,0xc4b9aa][Math.floor(Math.random()*3)], roughness: .95 });
  box(0, 2.6, 0, 7*scale, 5.2*scale, 9*scale, wall, g);
  const roof = mesh(new THREE.ConeGeometry(5.4*scale, 2.3*scale, 4), new THREE.MeshStandardMaterial({ color: 0x4c433e, roughness: .9 }), g);
  roof.rotation.y = Math.PI/4;
  roof.position.y = 6.1*scale;
  const winMat = new THREE.MeshStandardMaterial({ color: 0x7695a6, emissive: 0x102934, emissiveIntensity: .5, roughness: .25 });
  for (const y of [2.0, 4.1]) for (const xw of [-2, 0, 2]) box(xw*scale, y*scale, -4.55*scale, 1.05*scale, 1.25*scale, .08, winMat, g);
  g.position.set(x,0,z); g.rotation.y = yaw;
  scene.add(g);
  return g;
}

// Landscape zones: suburban -> wooded -> dense station -> open country.
for (let i = 8; i < 185; i++) {
  const u = i / 190;
  const { p, right } = basisAt(u);
  const wooded = (u > .22 && u < .42) || (u > .62 && u < .74);
  const side = i % 2 ? 1 : -1;
  const lateral = 10 + Math.random() * 34;
  const q = p.clone().addScaledVector(right, side * lateral);
  if (wooded || Math.random() < .58) {
    makeTree(q.x, q.z, .7 + Math.random() * .8);
    if (Math.random() < .45) {
      const q2 = p.clone().addScaledVector(right, side * (lateral + 5 + Math.random()*12));
      makeTree(q2.x, q2.z, .65 + Math.random()*.75);
    }
  } else {
    makeHouse(q.x, q.z, Math.random()*.5-.25, .7 + Math.random()*.45);
  }
}

// Roads and vehicles near urban sections.
function roadAt(u, side = 1, offset = 18, length = 220) {
  const { p, t, right } = basisAt(u);
  const q = p.clone().addScaledVector(right, side * offset);
  const road = box(q.x, .01, q.z, 7, .08, length, new THREE.MeshStandardMaterial({ color: 0x34383b, roughness: .95 }));
  road.rotation.y = Math.atan2(t.x, t.z);
  return { q, t, right };
}
for (const cfg of [[.08,1],[.13,-1],[.47,1],[.51,-1],[.83,1]]) {
  const r = roadAt(cfg[0], cfg[1]);
  for (let k=0;k<5;k++) {
    const car = box(r.q.x + r.right.x*(k%2?1.5:-1.5), .55, r.q.z - k*25, 1.8, 1.1, 4.2, new THREE.MeshStandardMaterial({ color: [0x8d2e2e,0x2b5577,0xb2b0aa,0x262626][k%4], roughness:.55 }));
    car.rotation.y = Math.atan2(r.t.x,r.t.z);
  }
}

const stations = [
  { name:'Saint-Denis Centre', u:.145, schedule:95 },
  { name:'Pierrefitte', u:.335, schedule:225 },
  { name:'Montsoult', u:.565, schedule:385 },
  { name:'Valmont', u:.835, schedule:570 }
];

function makeStation(st) {
  const { p, t, right } = basisAt(st.u);
  const yaw = Math.atan2(t.x, t.z);
  for (const side of [-1,1]) {
    const q = p.clone().addScaledVector(right, side*3.6);
    const platform = box(q.x,.28,q.z,3.0,.55,190,mats.concrete);
    platform.rotation.y = yaw;
    const canopy = box(q.x,3.3,q.z,2.55,.15,105,new THREE.MeshStandardMaterial({ color:0x3c454b, metalness:.15, roughness:.65 }));
    canopy.rotation.y=yaw;
    for(let k=-42;k<=42;k+=14){
      const pp=q.clone().addScaledVector(t,k);
      const support=box(pp.x,1.65,pp.z,.10,3.3,.10,mats.darkMetal); support.rotation.y=yaw;
      if(k%28===0){
        const lamp=box(pp.x,2.7,pp.z,.65,.08,.22,new THREE.MeshStandardMaterial({color:0xf5f1da,emissive:0xffeec7,emissiveIntensity:1.5})); lamp.rotation.y=yaw;
      }
    }
  }
  const stopPos = p.clone().addScaledVector(right,1.9);
  box(stopPos.x,1.1,stopPos.z,.1,2.2,.1,mats.darkMetal);
  const target = box(stopPos.x,2.15,stopPos.z,.9,.55,.08,new THREE.MeshStandardMaterial({color:0xffffff,emissive:0x111111})); target.rotation.y=yaw;
}
stations.forEach(makeStation);

// Signals with French-inspired round aspects.
const signalUs = [.085,.205,.39,.48,.69,.79,.91];
const signals=[];
for (const su of signalUs) {
  const {p,t,right}=basisAt(su); const q=p.clone().addScaledVector(right,2.5); const g=new THREE.Group(); g.position.copy(q); g.rotation.y=Math.atan2(t.x,t.z); scene.add(g);
  box(0,1.55,0,.12,3.1,.12,mats.darkMetal,g);
  box(0,3.1,0,.58,1.35,.28,mats.black,g);
  const lamps=[];
  for (let k=0;k<3;k++) {
    const lampMat=new THREE.MeshStandardMaterial({color:0x111111,emissive:0x000000,emissiveIntensity:0});
    const lamp=mesh(new THREE.SphereGeometry(.16,18,12),lampMat,g); lamp.position.set(0,3.48-k*.38,-.18); lamps.push(lamp);
  }
  signals.push({u:su,lamps,state:'green'});
}
function setSignal(sig,state){
  sig.state=state;
  const cols={green:0x39ff70,yellow:0xffc63a,red:0xff3535};
  sig.lamps.forEach(l=>{l.material.color.set(0x131313);l.material.emissive.set(0x000000);l.material.emissiveIntensity=0});
  const idx=state==='green'?2:state==='yellow'?1:0;
  sig.lamps[idx].material.color.set(cols[state]);sig.lamps[idx].material.emissive.set(cols[state]);sig.lamps[idx].material.emissiveIntensity=4;
}
signals.forEach((s,i)=>setSignal(s,i===3?'yellow':'green'));

// Tunnel.
const tunnelStart=.405, tunnelEnd=.46;
for(let i=0;i<42;i++){
  const u=THREE.MathUtils.lerp(tunnelStart,tunnelEnd,i/41); const {p,t}=basisAt(u); const g=new THREE.Group(); g.position.copy(p); g.rotation.y=Math.atan2(t.x,t.z); scene.add(g);
  const arch=mesh(new THREE.TorusGeometry(5.5,.38,8,18,Math.PI),new THREE.MeshStandardMaterial({color:0x55585a,roughness:.95}),g); arch.rotation.z=Math.PI;
  box(-5.5,2.6,0,.4,5.2,5.4,new THREE.MeshStandardMaterial({color:0x55585a,roughness:.95}),g); box(5.5,2.6,0,.4,5.2,5.4,new THREE.MeshStandardMaterial({color:0x55585a,roughness:.95}),g);
  if(i%4===0){const l=box(0,4.8,-1.3,.6,.08,.18,new THREE.MeshStandardMaterial({color:0xf6edc9,emissive:0xffe5a7,emissiveIntensity:2}),g);}
}

// Cabin inspired by modern Francilien proportions.
const cab = new THREE.Group(); camera.add(cab);
const cabDark = new THREE.MeshStandardMaterial({color:0x171a1d,roughness:.63});
const cabMid = new THREE.MeshStandardMaterial({color:0x3e4448,roughness:.72});
const cabPanel = new THREE.MeshStandardMaterial({color:0x2b3033,roughness:.68});
box(0,-2.05,-1.9,5.3,1.9,3.2,cabDark,cab);
box(0,-.92,-2.28,4.5,.85,1.55,cabPanel,cab);
box(0,2.62,-2.82,4.75,.28,.35,cabDark,cab);
box(-2.25,.62,-2.82,.28,4.2,.35,cabDark,cab); box(2.25,.62,-2.82,.28,4.2,.35,cabDark,cab);
box(0,-.46,-2.78,4.72,.25,.35,cabDark,cab);
// side walls give real depth
box(-2.55,.2,-1.2,.45,4.6,3.5,cabMid,cab); box(2.55,.2,-1.2,.45,4.6,3.5,cabMid,cab);
// central console wings
const leftWing=box(-1.35,-.57,-1.75,1.35,.18,1.45,cabPanel,cab); leftWing.rotation.x=-.10;
const rightWing=box(1.35,-.57,-1.75,1.35,.18,1.45,cabPanel,cab); rightWing.rotation.x=-.10;
// digital speed display
const screenMat = new THREE.MeshStandardMaterial({color:0x071015,emissive:0x0b4d69,emissiveIntensity:1.4,roughness:.2});
const speedScreen=box(0,-.54,-2.39,1.35,.68,.08,screenMat,cab); speedScreen.rotation.x=-.11;
const auxMat=new THREE.MeshStandardMaterial({color:0x0b1115,emissive:0x17313f,emissiveIntensity:.8,roughness:.22});
const aux1=box(-1.23,-.51,-2.24,1.1,.58,.08,auxMat,cab); aux1.rotation.x=-.12;
const aux2=box(1.23,-.51,-2.24,1.1,.58,.08,auxMat,cab); aux2.rotation.x=-.12;
// analog gauges
for(const x of [-.65,.65]){const g=mesh(new THREE.CylinderGeometry(.23,.23,.08,32),new THREE.MeshStandardMaterial({color:0x080a0b,metalness:.25,roughness:.45}),cab);g.rotation.x=Math.PI/2;g.position.set(x,-.13,-2.25)}
// illuminated buttons
for(let r=0;r<2;r++)for(let c=0;c<5;c++){
  const color=(c===4&&r===0)?0xb92727:0xdddddd;
  const b=mesh(new THREE.CylinderGeometry(.065,.065,.06,20),new THREE.MeshStandardMaterial({color,emissive:c===1?0x2d7a47:0x000000,emissiveIntensity:c===1?1.5:0}),cab); b.rotation.x=Math.PI/2;b.position.set(-1.55+c*.28,-.16+r*.23,-2.20)
}
// master controller
const controllerBase=box(-.25,-.15,-1.42,.58,.28,.78,cabDark,cab);
const handlePivot=new THREE.Group();handlePivot.position.set(-.25,.05,-1.43);cab.add(handlePivot);
const handle=box(0,.26,0,.16,.68,.17,new THREE.MeshStandardMaterial({color:0x080a0b,roughness:.4}),handlePivot); handle.rotation.x=-.1;
// windscreen wipers
const wiperL=box(-.72,.83,-2.98,.045,2.55,.045,cabDark,cab);wiperL.rotation.z=.36;
const wiperR=box(.72,.83,-2.98,.045,2.55,.045,cabDark,cab);wiperR.rotation.z=-.36;
// cab ceiling and subtle lamp
box(0,2.85,-1.4,5.3,.35,3.7,cabDark,cab);
const cabLight=new THREE.PointLight(0xd9ecf8,.8,5);cabLight.position.set(0,2.3,-1.1);cab.add(cabLight);

// Driver state / physics.
const state = {
  u:0.004,
  speed:0,
  traction:0,
  brake:0,
  doors:false,
  emergency:false,
  paused:false,
  nextStation:0,
  score:1000,
  elapsed:0,
  vacma:0,
  completed:false
};
const speedZones=[
  {u:0,v:60},{u:.055,v:90},{u:.12,v:60},{u:.17,v:100},{u:.29,v:70},{u:.36,v:110},{u:.40,v:80},{u:.47,v:110},{u:.53,v:70},{u:.59,v:120},{u:.78,v:80},{u:.82,v:60},{u:.87,v:110}
];
function currentLimit(){let v=60;for(const z of speedZones)if(state.u>=z.u)v=z.v;return v}
function distToNext(){if(state.nextStation>=stations.length)return 0;return Math.max(0,(stations[state.nextStation].u-state.u)*routeLength)}

const ui={
  clock:document.querySelector('#clock'),nextStation:document.querySelector('#nextStation'),distance:document.querySelector('#distance'),routeProgress:document.querySelector('#routeProgress'),stationList:document.querySelector('#stationList'),toast:document.querySelector('#toast'),doorLamp:document.querySelector('#doorLamp'),tractionLamp:document.querySelector('#tractionLamp'),brakeLamp:document.querySelector('#brakeLamp'),vacmaLamp:document.querySelector('#vacmaLamp'),boot:document.querySelector('#boot')
};
function renderStations(){
  ui.stationList.innerHTML='';
  stations.forEach((s,i)=>{const d=document.createElement('div');d.className='station '+(i<state.nextStation?'done':i===state.nextStation?'current':'');d.textContent=s.name;ui.stationList.appendChild(d)})
}
let toastTimer;
function toast(msg){ui.toast.textContent=msg;ui.toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),1800)}
function acknowledge(){state.vacma=0;ui.vacmaLamp.classList.add('is-on');ui.vacmaLamp.classList.remove('is-warn','is-danger')}
function tractionUp(){if(state.doors||state.emergency)return;state.brake=0;state.traction=Math.min(4,state.traction+1);acknowledge()}
function brakeUp(){state.traction=0;state.brake=Math.min(4,state.brake+1);acknowledge()}
function neutral(){state.traction=0;state.brake=0;state.emergency=false;acknowledge()}
function emergency(){state.traction=0;state.brake=4;state.emergency=true;state.score=Math.max(0,state.score-40);toast('Freinage d’urgence appliqué')}
function toggleDoors(){
  if(state.speed>1){toast('Impossible : train en mouvement');return}
  state.doors=!state.doors;
  if(state.doors&&state.nextStation<stations.length){
    const d=Math.abs(distToNext());
    if(d<38){const precision=Math.max(0,38-d);state.score+=Math.round(60+precision*2);toast(`Arrêt ${Math.round(d)} m — voyageurs en échange`);state.nextStation++;renderStations();}
    else {state.score=Math.max(0,state.score-35);toast('Ouverture hors quai : pénalité')}
  }
  acknowledge();
}

document.querySelector('#doorsBtn').addEventListener('click',toggleDoors);
document.querySelector('#vigilanceBtn').addEventListener('click',()=>{acknowledge();toast('Vigilance acquittée')});
document.querySelector('#emergencyBtn').addEventListener('click',emergency);
document.querySelector('#pauseBtn').addEventListener('click',()=>{state.paused=!state.paused;document.querySelector('#pauseBtn').textContent=state.paused?'Reprendre':'Pause'});
window.addEventListener('keydown',e=>{
  if(e.key==='ArrowUp'){e.preventDefault();tractionUp()}
  else if(e.key==='ArrowDown'){e.preventDefault();brakeUp()}
  else if(e.key.toLowerCase()==='n')neutral();
  else if(e.key.toLowerCase()==='d')toggleDoors();
  else if(e.key.toLowerCase()==='e')emergency();
  else if(e.code==='Space'){e.preventDefault();acknowledge()}
});

const tutorials=[
  ['Prise de service','Bienvenue à bord. La conduite se fait depuis la cabine : traction, freinage, portes et vigilance sont à respecter comme sur un service réel.'],
  ['Mise en mouvement','Utilise ↑ pour augmenter la traction par crans. Le manipulateur de la cabine se déplace réellement avec ta commande.'],
  ['Anticiper le freinage','Utilise ↓ pour freiner. L’inertie est volontairement importante : commence ton freinage bien avant les quais.'],
  ['Desservir une gare','Immobilise le train au repère de quai puis appuie sur D pour ouvrir les portes. Plus l’arrêt est précis, plus ton score augmente.'],
  ['Vigilance et signaux','Acquitte la vigilance avec Espace. Respecte aussi la vitesse autorisée et surveille les signaux le long de la voie. Bonne route.']
];
let tutIndex=0;
const tut=document.querySelector('#tutorial'),tutTitle=document.querySelector('#tutorialTitle'),tutText=document.querySelector('#tutorialText'),tutNum=document.querySelector('#tutorialIndex'),nextTut=document.querySelector('#nextTutorial');
function showTut(){tutTitle.textContent=tutorials[tutIndex][0];tutText.textContent=tutorials[tutIndex][1];tutNum.textContent=String(tutIndex+1).padStart(2,'0')+' / 05';nextTut.textContent=tutIndex===tutorials.length-1?'Conduire':'Suivant'}
nextTut.addEventListener('click',()=>{if(tutIndex<tutorials.length-1){tutIndex++;showTut()}else tut.classList.add('is-hidden')});
document.querySelector('#skipTutorial').addEventListener('click',()=>tut.classList.add('is-hidden'));
showTut();renderStations();

function updateCabinDisplay() {
  const on=(el,v,cls='is-on')=>{el.classList.toggle(cls,v)};
  on(ui.doorLamp,state.doors,'is-warn'); on(ui.tractionLamp,state.traction>0); on(ui.brakeLamp,state.brake>0||state.emergency,state.emergency?'is-danger':'is-warn');
  handlePivot.rotation.x = THREE.MathUtils.lerp(handlePivot.rotation.x, (state.brake*.105)-(state.traction*.095), .15);
  const speedGlow=THREE.MathUtils.clamp(state.speed/120,.15,1.4);speedScreen.material.emissiveIntensity=.8+speedGlow;
}

function updateUI(){
  const sec=14*3600+2*60+Math.floor(state.elapsed);ui.clock.textContent=[Math.floor(sec/3600)%24,Math.floor(sec%3600/60),sec%60].map(v=>String(v).padStart(2,'0')).join(':');
  if(state.nextStation<stations.length){ui.nextStation.textContent=stations[state.nextStation].name;ui.distance.textContent=Math.round(distToNext()).toLocaleString('fr-FR')} else {ui.nextStation.textContent='Terminus atteint';ui.distance.textContent='0'}
  ui.routeProgress.style.width=(state.u*100).toFixed(1)+'%';
  if(state.vacma>7){ui.vacmaLamp.classList.remove('is-on');ui.vacmaLamp.classList.add(state.vacma>10?'is-danger':'is-warn')}
}

let last=performance.now();
function animate(now){
  requestAnimationFrame(animate);
  const dt=Math.min(.04,(now-last)/1000);last=now;
  if(!state.paused&&!state.completed){
    state.elapsed+=dt;state.vacma+=dt;
    let accel=state.traction*.16 - state.brake*.28 - .018 - state.speed*.0011;
    if(state.emergency)accel-=.65;
    if(state.doors)accel=-2;
    let ms=Math.max(0,state.speed/3.6+accel*dt);
    state.speed=ms*3.6;
    if(state.doors&&state.speed<1)state.speed=0;
    state.u+=ms*dt/routeLength;
    const limit=currentLimit();
    if(state.speed>limit+3)state.score=Math.max(0,state.score-dt*(state.speed-limit)*.3);
    if(state.vacma>11){state.traction=0;state.brake=4;if(state.vacma<11.1)toast('VACMA : freinage de sécurité')}
    if(state.nextStation<stations.length&&state.u>stations[state.nextStation].u+.008){state.score=Math.max(0,state.score-130);toast(`Arrêt manqué : ${stations[state.nextStation].name}`);state.nextStation++;renderStations()}
    if(state.u>=.985){state.u=.985;state.speed=0;state.completed=true;toast('Service terminé')}
  }

  const {p,t,right}=basisAt(state.u);
  const sway=Math.min(.018,state.speed*.00012);
  const pitch=Math.sin(now*.008)*sway*.16;
  const eye=p.clone().add(new THREE.Vector3(0,2.15,0)).addScaledVector(t,2.4).addScaledVector(right,Math.sin(now*.014)*sway);
  camera.position.copy(eye);
  const look=p.clone().addScaledVector(t,95).add(new THREE.Vector3(0,1.6+pitch,0));
  camera.lookAt(look);

  const tunnel=state.u>tunnelStart&&state.u<tunnelEnd;
  scene.background.set(tunnel?0x15191d:0x9bb4c6);scene.fog.color.set(tunnel?0x15191d:0xa7bbc8);scene.fog.density=tunnel?.0072:.00115;sun.intensity=tunnel?.18:3.4;hemi.intensity=tunnel?.25:1.9;

  updateCabinDisplay();updateUI();renderer.render(scene,camera);
}

function resize(){const w=window.innerWidth,h=window.innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
window.addEventListener('resize',resize);resize();
setTimeout(()=>document.querySelector('#boot').classList.add('is-hidden'),450);
requestAnimationFrame(animate);
