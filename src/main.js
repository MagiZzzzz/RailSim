import * as THREE from 'three';
import './style.css';
import { MISSIONS, getMission } from './data/missions.js';
import { RailwayWorld } from './game/World.js';
import { buildCab } from './game/Cab.js';
import { TrainSimulation } from './game/TrainSimulation.js';
import { AudioEngine } from './game/AudioEngine.js';
import { buildTrainModel } from './game/TrainModel.js';

const app=document.querySelector('#app');
app.innerHTML=`
  <canvas id="game" aria-label="Vue 3D du simulateur"></canvas>
  <div id="boot" class="boot"><div class="boot-logo">RS</div><div><b>RAILSIM</b><span>Chargement du simulateur ferroviaire…</span></div></div>

  <section id="menu" class="menu screen">
    <header class="menu-header"><div class="brand"><span class="brand-mark">RS</span><div><b>RAILSIM</b><small>DRIVER SIMULATOR</small></div></div><div class="menu-header-actions"><button id="helpMenuBtn" class="ghost">Commandes</button><button id="settingsBtn" class="ghost">Réglages</button></div></header>
    <div class="menu-hero"><div class="hero-copy"><span class="kicker">SIMULATEUR FERROVIAIRE 3D</span><h1>Prends la cabine.<br><em>Tiens l’horaire.</em></h1><p>Choisis ton service, respecte la signalisation, les limitations, les arrêts voyageurs et les systèmes de sécurité.</p></div><div class="hero-stats"><div><strong>4</strong><span>missions</span></div><div><strong>Z 50000</strong><span>matériel</span></div><div><strong>3D</strong><span>temps réel</span></div></div></div>
    <div class="mission-heading"><div><span class="kicker">TABLEAU DE SERVICE</span><h2>Choisir une mission</h2></div><span class="muted">Chaque mission modifie la ligne, l’horaire, la météo et les conditions de conduite.</span></div>
    <div id="missionGrid" class="mission-grid"></div>
  </section>

  <section id="briefing" class="modal-wrap hidden" aria-modal="true"><div class="briefing card"><button class="modal-close" id="briefingClose">×</button><div class="briefing-main"><span class="kicker">BRIEFING CONDUCTEUR</span><h2 id="briefTitle"></h2><p id="briefDescription"></p><div id="briefTags" class="tags"></div><div class="brief-route"><div class="route-line" id="briefRoute"></div></div></div><aside class="briefing-side"><div class="train-badge"><span>MATÉRIEL</span><strong>Z 50000</strong><small>Francilien</small></div><dl><div><dt>Service</dt><dd id="briefService"></dd></div><div><dt>Durée</dt><dd id="briefDuration"></dd></div><div><dt>Distance</dt><dd id="briefDistance"></dd></div><div><dt>Difficulté</dt><dd id="briefDifficulty"></dd></div></dl><button id="startBtn" class="primary big">Prendre le service</button></aside></div></section>

  <section id="settings" class="modal-wrap hidden"><div class="settings card"><button class="modal-close" id="settingsClose">×</button><span class="kicker">RÉGLAGES</span><h2>Affichage & son</h2><label>Qualité graphique<select id="qualitySelect"><option value="high">Élevée</option><option value="medium">Moyenne</option><option value="low">Performance</option></select></label><label>Volume général<input id="volumeRange" type="range" min="0" max="100" value="70"></label><p class="muted">La qualité élevée active les ombres détaillées et une résolution supérieure.</p></div></section>

  <section id="help" class="modal-wrap hidden"><div class="help card"><button class="modal-close" id="helpClose">×</button><span class="kicker">AIDE CONDUCTEUR</span><h2>Commandes</h2><div class="key-grid"><kbd>↑</kbd><span>Augmenter la traction</span><kbd>↓</kbd><span>Augmenter le frein</span><kbd>N</kbd><span>Neutre</span><kbd>D</kbd><span>Ouvrir / fermer les portes</span><kbd>E</kbd><span>Freinage d’urgence</span><kbd>Espace</kbd><span>Acquitter VACMA</span><kbd>H</kbd><span>Avertisseur sonore</span><kbd>C</kbd><span>Changer de caméra</span><kbd>V</kbd><span>Recentrer la vue cabine</span><kbd>Échap</kbd><span>Pause</span></div><p class="muted">En cabine, maintiens le clic gauche et déplace la souris pour regarder autour de toi.</p></div></section>

  <section id="driveUi" class="drive-ui hidden">
    <header class="drive-top"><div class="service-chip"><span class="kicker">SERVICE EN COURS</span><b id="hudService"></b><small id="hudRoute"></small></div><div class="drive-top-right"><div class="score-chip"><span>SCORE</span><b id="hudScore">1000</b></div><div class="clock-chip"><span id="hudClock">00:00:00</span><small id="hudDelay">À l’heure</small></div><button id="pauseBtn" class="square-btn">Ⅱ</button></div></header>
    <aside class="route-hud"><span class="kicker">PROCHAINE DESSERTE</span><h3 id="hudNext"></h3><div class="distance"><b id="hudDistance">0</b><span>m</span></div><div class="progress"><i id="hudProgress"></i></div><div id="hudStations" class="station-timeline"></div></aside>
    <div id="safetyHud" class="safety-hud"><div><span>MANIPULATEUR</span><b id="hudMaster">NEUTRE</b></div><div><span>PRESSION CG</span><b id="hudPressure">5.0 bar</b></div><div><span>VACMA</span><b id="hudVacma">30 s</b></div><div><span>VITESSE AUTORISÉE</span><b id="hudLimit">40 km/h</b></div></div>
    <div id="message" class="message"></div>
    <div class="drive-controls"><button id="doorBtn">Portes <kbd>D</kbd></button><button id="ackBtn" class="accent">Vigilance <kbd>ESPACE</kbd></button><button id="hornBtn">Avertisseur <kbd>H</kbd></button><button id="cameraBtn">Caméra <kbd>C</kbd></button><button id="emergencyBtn" class="danger">Urgence <kbd>E</kbd></button></div>
    <div class="look-help">Glisser la souris : regarder · C : caméra · F1 : masquer l’interface</div>
    <section id="tutorialPanel" class="tutorial-panel hidden"><span class="kicker">FORMATION CONDUCTEUR</span><div class="tutorial-step"><b id="tutorialIndex">01</b><div><h3 id="tutorialTitle"></h3><p id="tutorialText"></p></div></div><button id="skipTutorial" class="ghost">Masquer les conseils</button></section>
  </section>

  <section id="pauseOverlay" class="modal-wrap hidden"><div class="pause-card card"><span class="kicker">SERVICE SUSPENDU</span><h2>Pause</h2><button id="resumeBtn" class="primary big">Reprendre</button><button id="restartBtn" class="ghost big">Recommencer la mission</button><button id="quitBtn" class="ghost big">Retour au menu</button></div></section>

  <section id="resultOverlay" class="modal-wrap hidden"><div class="result-card card"><span class="kicker">RAPPORT DE SERVICE</span><h2 id="resultTitle">Mission terminée</h2><div class="result-score"><span>SCORE</span><strong id="resultScore">0</strong><small id="resultGrade">B</small></div><div id="resultStats" class="result-stats"></div><div class="result-actions"><button id="resultRestart" class="primary big">Rejouer</button><button id="resultMenu" class="ghost big">Missions</button></div></div></section>
`;

const $=id=>document.getElementById(id);
const canvas=$('game');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.outputColorSpace=THREE.SRGBColorSpace;
const camera=new THREE.PerspectiveCamera(65,1,.08,2500);
const audio=new AudioEngine();
let scene=new THREE.Scene(),world=null,cab=null,sim=null,trainModel=null,currentMission=MISSIONS[0],gameMode='menu',paused=false,last=performance.now(),cameraMode=0,lookYaw=0,lookPitch=0,dragging=false,lastPointer=null,uiVisible=true,resultShown=false,quality='high',tutorialStep=0;

const tutorialSteps=[
  ['Préparation au départ','Ferme les portes avec D. Tant qu’elles sont ouvertes, la traction est verrouillée.'],
  ['Mise en mouvement','Utilise ↑ pour passer les crans de traction progressivement et dépasse 25 km/h.'],
  ['Vigilance VACMA','Acquitte régulièrement la vigilance avec Espace. Si le compteur atteint zéro, le freinage d’urgence est déclenché.'],
  ['Premier arrêt','Anticipe le freinage. Immobilise la rame près du repère de quai puis ouvre les portes.'],
  ['Conduite en ligne','Respecte les limitations, les signaux et l’horaire jusqu’au terminus. Bonne route.']
];

function weatherLabel(w){return w==='rain'?'Pluie forte':w==='night'?'Nuit':'Temps clair'}
function renderMissionCards(){const grid=$('missionGrid');grid.innerHTML='';MISSIONS.forEach((m,i)=>{const card=document.createElement('button');card.className='mission-card';card.style.setProperty('--mission',m.color);card.innerHTML=`<div class="mission-card-top"><span class="mission-number">0${i+1}</span><span class="difficulty">${m.difficulty}</span></div><div class="mission-weather">${weatherLabel(m.weather)}</div><h3>${m.title}</h3><p>${m.subtitle}</p><div class="mission-meta"><span>${m.distanceKm.toFixed(1)} km</span><span>${m.duration}</span><span>${m.train}</span></div><div class="mission-card-footer"><span>${m.service}</span><b>Briefing →</b></div>`;card.addEventListener('click',()=>openBriefing(m));grid.append(card);});}
function openBriefing(m){currentMission=m;$('briefTitle').textContent=m.title;$('briefDescription').textContent=m.description;$('briefService').textContent=m.service;$('briefDuration').textContent=m.duration;$('briefDistance').textContent=`${m.distanceKm.toFixed(1)} km`;$('briefDifficulty').textContent=m.difficulty;$('briefTags').innerHTML=`<span>${weatherLabel(m.weather)}</span><span>${m.train}</span><span>${m.stations.length} gares</span>`;$('briefRoute').innerHTML=m.stations.map((s,i)=>`<div class="brief-stop"><i></i><span>${s.name}</span>${i<m.stations.length-1?'<b></b>':''}</div>`).join('');$('briefing').classList.remove('hidden');}
function closeModal(id){$(id).classList.add('hidden')}

$('briefingClose').onclick=()=>closeModal('briefing');$('settingsClose').onclick=()=>closeModal('settings');$('helpClose').onclick=()=>closeModal('help');$('settingsBtn').onclick=()=>$('settings').classList.remove('hidden');$('helpMenuBtn').onclick=()=>$('help').classList.remove('hidden');
$('qualitySelect').onchange=e=>{quality=e.target.value;applyQuality();};$('volumeRange').oninput=e=>{if(audio.master)audio.master.gain.value=(+e.target.value/100)*.36;};
function applyQuality(){const ratios={high:2,medium:1.35,low:1};renderer.setPixelRatio(Math.min(devicePixelRatio,ratios[quality]));renderer.shadowMap.enabled=quality!=='low';resize();}

async function startMission(m=currentMission){
  currentMission=m;closeModal('briefing');$('menu').classList.add('hidden');$('resultOverlay').classList.add('hidden');$('pauseOverlay').classList.add('hidden');$('driveUi').classList.remove('hidden');canvas.classList.add('active');
  world?.dispose?.();camera.clear();scene=new THREE.Scene();scene.add(camera);world=new RailwayWorld(scene,m,renderer);cab=buildCab(camera,m);trainModel=buildTrainModel(scene);sim=new TrainSimulation(world,m);await audio.start();gameMode='playing';paused=false;resultShown=false;cameraMode=0;lookYaw=lookPitch=0;tutorialStep=0;last=performance.now();
  $('hudService').textContent=m.service;$('hudRoute').textContent=m.subtitle;renderStationTimeline();$('tutorialPanel').classList.toggle('hidden',!m.tutorial);updateTutorial();
  if(audio.ready&&audio.ctx.state==='suspended')await audio.ctx.resume();
}
$('startBtn').onclick=()=>startMission(currentMission);

function renderStationTimeline(){if(!sim)return;$('hudStations').innerHTML=currentMission.stations.map((s,i)=>`<div class="station-item ${i===0?'done':''}" data-index="${i}"><i></i><span>${s.name}</span><small>${formatServiceTime(currentMission.startClock+s.scheduled)}</small></div>`).join('');}
function formatServiceTime(sec){sec=((Math.round(sec)%86400)+86400)%86400;const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=Math.floor(sec%60);return[h,m,s].map(v=>String(v).padStart(2,'0')).join(':')}
function formatDelay(d){if(Math.abs(d)<8)return'À l’heure';return d>0?`+${Math.round(d)} s`:`${Math.round(d)} s`}

function toggleDoors(){if(!sim)return;if(sim.speed>.5){showMessage('Impossible : train en mouvement');return;}if(sim.doors&&sim.dwell>0){sim.penalize(40,'Fermeture avant fin du service voyageurs');}if(sim.toggleDoors()){audio.doorChime();showMessage(sim.doors?'Portes ouvertes':'Portes fermées');}}
$('doorBtn').onclick=toggleDoors;$('ackBtn').onclick=()=>{sim?.acknowledge();audio.vigilance();showMessage('VACMA acquittée');};$('hornBtn').onclick=()=>audio.horn();$('emergencyBtn').onclick=()=>sim?.emergencyBrake();$('cameraBtn').onclick=cycleCamera;
function cycleCamera(){cameraMode=(cameraMode+1)%3;lookYaw=lookPitch=0;showMessage(['Vue cabine','Vue extérieure arrière','Vue latérale'][cameraMode]);}

function showMessage(text){const el=$('message');el.textContent=text;el.classList.add('show');clearTimeout(showMessage.t);showMessage.t=setTimeout(()=>el.classList.remove('show'),2600);}
function updateTutorial(){if(!currentMission.tutorial)return;const [title,text]=tutorialSteps[Math.min(tutorialStep,tutorialSteps.length-1)];$('tutorialIndex').textContent=String(tutorialStep+1).padStart(2,'0');$('tutorialTitle').textContent=title;$('tutorialText').textContent=text;}
function tutorialLogic(s){if(!currentMission.tutorial||$('tutorialPanel').classList.contains('hidden'))return;let advance=false;if(tutorialStep===0&&!s.doors)advance=true;if(tutorialStep===1&&s.speed>25)advance=true;if(tutorialStep===2&&sim.elapsed-sim.lastAck<1&&s.speed>8)advance=true;if(tutorialStep===3&&sim.stationServed.size>=2)advance=true;if(advance&&tutorialStep<4){tutorialStep++;updateTutorial();showMessage('Étape de formation validée');}}
$('skipTutorial').onclick=()=>$('tutorialPanel').classList.add('hidden');

function updateUi(s){
  $('hudClock').textContent=formatServiceTime(currentMission.startClock+s.elapsed);$('hudDelay').textContent=formatDelay(s.delay);$('hudDelay').className=s.delay>30?'late':'';$('hudScore').textContent=s.score;$('hudNext').textContent=s.next;$('hudDistance').textContent=Math.round(s.distance).toLocaleString('fr-FR');$('hudProgress').style.width=`${Math.min(100,s.u*100)}%`;
  $('hudMaster').textContent=s.master>0?`TRACTION ${s.master}`:s.master<0?`FREIN ${Math.abs(s.master)}`:'NEUTRE';$('hudMaster').className=s.master>0?'positive':s.master<0?'negative':'';$('hudPressure').textContent=`${s.pressure.toFixed(1)} bar`;$('hudVacma').textContent=`${Math.max(0,Math.ceil(s.vacma))} s`;$('hudVacma').className=s.vacma<7?'danger-text':'';$('hudLimit').textContent=`${s.limit} km/h`;
  document.querySelectorAll('.station-item').forEach(el=>{const i=+el.dataset.index;el.classList.toggle('done',sim.stationServed.has(i));el.classList.toggle('current',i===sim.nextStation);});
  if(s.message&&s.message!==updateUi.lastMessage){updateUi.lastMessage=s.message;showMessage(s.message)}
}

function updateCamera(s,now){const sample=world.sample(s.u);const {p,t,right}=sample;const sway=Math.min(.018,s.speed*.00012),bob=Math.sin(now*.015)*sway;const tangentLater=world.sample(Math.min(.999,s.u+.002)).t;const curve=t.x*tangentLater.z-t.z*tangentLater.x;
  if(cameraMode===0){cab.group.visible=true;trainModel.setVisible(false);camera.position.copy(p).addScaledVector(t,3.25).add(new THREE.Vector3(0,2.05+bob,0));const aim=p.clone().addScaledVector(t,90).addScaledVector(right,lookYaw*24).add(new THREE.Vector3(0,1.62+lookPitch*20,0));camera.up.set(0,1,0);camera.lookAt(aim);camera.rotateZ(THREE.MathUtils.clamp(curve*10,-.025,.025));camera.fov=THREE.MathUtils.lerp(camera.fov,64+Math.min(3,s.speed/60),.06);}
  else if(cameraMode===1){cab.group.visible=false;trainModel.setVisible(true);camera.position.copy(p).addScaledVector(t,-24).addScaledVector(right,8).add(new THREE.Vector3(0,8,0));camera.lookAt(p.clone().addScaledVector(t,14).add(new THREE.Vector3(0,2,0)));camera.fov=THREE.MathUtils.lerp(camera.fov,58,.05);}
  else{cab.group.visible=false;trainModel.setVisible(true);camera.position.copy(p).addScaledVector(right,22).addScaledVector(t,-5).add(new THREE.Vector3(0,4.2,0));camera.lookAt(p.clone().add(new THREE.Vector3(0,2,0)));camera.fov=THREE.MathUtils.lerp(camera.fov,55,.05);}camera.updateProjectionMatrix();}

function pauseGame(){if(gameMode!=='playing')return;paused=true;gameMode='paused';$('pauseOverlay').classList.remove('hidden');}
function resumeGame(){paused=false;gameMode='playing';$('pauseOverlay').classList.add('hidden');last=performance.now();audio.ctx?.resume?.();}
$('pauseBtn').onclick=pauseGame;$('resumeBtn').onclick=resumeGame;$('restartBtn').onclick=()=>startMission(currentMission);$('quitBtn').onclick=returnMenu;
function returnMenu(){gameMode='menu';paused=false;$('pauseOverlay').classList.add('hidden');$('resultOverlay').classList.add('hidden');$('driveUi').classList.add('hidden');$('menu').classList.remove('hidden');canvas.classList.remove('active');world?.dispose?.();camera.clear();scene=new THREE.Scene();scene.add(camera);renderer.setClearColor(0x05080b,1);}

function showResults(failed=false){if(resultShown)return;resultShown=true;gameMode='results';const s=sim.state();$('resultTitle').textContent=failed?'Mission interrompue':'Service terminé';$('resultScore').textContent=s.score;const grade=s.score>=1250?'S':s.score>=1050?'A':s.score>=850?'B':s.score>=650?'C':'D';$('resultGrade').textContent=grade;$('resultStats').innerHTML=`<div><span>Ponctualité</span><b>${formatDelay(s.delay)}</b></div><div><span>Gares desservies</span><b>${sim.stationServed.size}/${currentMission.stations.length}</b></div><div><span>Précision dernier arrêt</span><b>${sim.stopAccuracy==null?'—':sim.stopAccuracy.toFixed(1)+' m'}</b></div><div><span>Pénalités</span><b>${sim.penalties.length}</b></div>`;$('resultOverlay').classList.remove('hidden');}
$('resultRestart').onclick=()=>startMission(currentMission);$('resultMenu').onclick=returnMenu;

window.addEventListener('keydown',e=>{
  if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
  if(e.key==='Escape'){if(gameMode==='playing')pauseGame();else if(gameMode==='paused')resumeGame();return;}
  if(gameMode!=='playing'||!sim)return;
  if(e.key==='ArrowUp'){e.preventDefault();sim.stepUp();}else if(e.key==='ArrowDown'){e.preventDefault();sim.stepDown();}else if(e.key.toLowerCase()==='n')sim.neutral();else if(e.key.toLowerCase()==='d')toggleDoors();else if(e.key.toLowerCase()==='e')sim.emergencyBrake();else if(e.code==='Space'){e.preventDefault();sim.acknowledge();audio.vigilance();}else if(e.key.toLowerCase()==='h')audio.horn();else if(e.key.toLowerCase()==='c')cycleCamera();else if(e.key.toLowerCase()==='v'){lookYaw=lookPitch=0;}else if(e.key==='F1'){e.preventDefault();uiVisible=!uiVisible;$('driveUi').classList.toggle('ui-minimal',!uiVisible);}else if(e.key==='F2'){e.preventDefault();$('help').classList.remove('hidden');}
});
canvas.addEventListener('pointerdown',e=>{if(cameraMode!==0)return;dragging=true;lastPointer=[e.clientX,e.clientY];canvas.setPointerCapture?.(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(!dragging||cameraMode!==0)return;const dx=e.clientX-lastPointer[0],dy=e.clientY-lastPointer[1];lastPointer=[e.clientX,e.clientY];lookYaw=THREE.MathUtils.clamp(lookYaw-dx*.0025,-.8,.8);lookPitch=THREE.MathUtils.clamp(lookPitch+dy*.0018,-.22,.28);});canvas.addEventListener('pointerup',()=>dragging=false);canvas.addEventListener('pointercancel',()=>dragging=false);

function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/Math.max(1,h);camera.updateProjectionMatrix();}window.addEventListener('resize',resize);resize();

function animate(now){requestAnimationFrame(animate);const dt=Math.min(.05,(now-last)/1000);last=now;if(gameMode==='playing'&&sim&&world&&!paused){sim.update(dt);const s=sim.state();const inTunnel=world.inTunnel(s.u);world.update(s.u,dt,camera.position);trainModel.update(world,s.u);updateCamera(s,now);cab.update(s,dt,now/1000);audio.update(s.speed,Math.max(0,s.master),Math.max(0,-s.master),inTunnel);if(inTunnel){scene.fog.density=currentMission.weather==='night'?.0055:.004;world.sun.intensity=.18;}else{scene.fog.density=currentMission.weather==='night'?.0022:currentMission.weather==='rain'?.0021:.00105;world.sun.intensity=currentMission.weather==='night'?.25:currentMission.weather==='rain'?.9:3.1;}updateUi(s);tutorialLogic(s);if(s.failed||s.finished)showResults(s.failed);}renderer.render(scene,camera);}

renderMissionCards();applyQuality();renderer.setClearColor(0x05080b,1);setTimeout(()=>$('boot').classList.add('hidden'),650);requestAnimationFrame(animate);
