import * as THREE from 'three';
import './style.css';
import { MISSIONS } from './data/missions.js';
import { RailwayWorld } from './game/World.js';
import { buildCab } from './game/Cab.js';
import { TrainSimulation } from './game/TrainSimulation.js';
import { AudioEngine } from './game/AudioEngine.js';
import { buildTrainModel } from './game/TrainModel.js';
import { computeDrivingAdvice } from './game/DrivingAdvisor.js';
import { RouteNavigator } from './ui/RouteNavigator.js';

const app = document.querySelector('#app');
app.innerHTML = `
  <canvas id="game" aria-label="Vue 3D du simulateur"></canvas>
  <div id="boot" class="boot"><div class="boot-logo">RS</div><div><b>RAILSIM</b><span>Initialisation du réseau…</span></div></div>

  <section id="menu" class="menu screen">
    <header class="menu-header">
      <div class="brand"><span class="brand-mark">RS</span><div><b>RAILSIM</b><small>FRANÇAIS · DRIVER SIMULATOR</small></div></div>
      <div class="menu-header-actions"><button id="helpMenuBtn" class="ghost">Commandes</button><button id="settingsBtn" class="ghost">Réglages</button></div>
    </header>
    <div class="menu-hero">
      <div class="hero-copy"><span class="kicker">SIMULATEUR FERROVIAIRE 3D</span><h1>Choisis ton service.<br><em>Conduis comme en ligne.</em></h1><p>Horaires, signalisation, limitations, arrêts voyageurs, météo et systèmes de sécurité.</p></div>
      <div class="hero-stats"><div><strong>${MISSIONS.length}</strong><span>missions</span></div><div><strong>Z 50000</strong><span>Francilien</span></div><div><strong>3</strong><span>caméras</span></div></div>
    </div>
    <div class="mission-heading"><div><span class="kicker">TABLEAU DE SERVICE</span><h2>Choisir une mission</h2></div><span class="muted">Clique n'importe où sur une mission pour ouvrir son briefing.</span></div>
    <div id="missionGrid" class="mission-grid"></div>
  </section>

  <section id="briefing" class="modal-wrap hidden"><div class="briefing card">
    <button class="modal-close" id="briefingClose" aria-label="Fermer">×</button>
    <div class="briefing-main"><span class="kicker">BRIEFING CONDUCTEUR</span><h2 id="briefTitle"></h2><p id="briefDescription"></p><div id="briefTags" class="tags"></div><div id="briefRoute" class="brief-route"></div></div>
    <aside class="briefing-side"><div class="train-badge"><span>MATÉRIEL</span><strong>Z 50000</strong><small>Francilien</small></div><dl><div><dt>Service</dt><dd id="briefService"></dd></div><div><dt>Durée</dt><dd id="briefDuration"></dd></div><div><dt>Distance</dt><dd id="briefDistance"></dd></div><div><dt>Difficulté</dt><dd id="briefDifficulty"></dd></div></dl><button id="startBtn" class="primary big">Prendre le service</button></aside>
  </div></section>

  <section id="settings" class="modal-wrap hidden"><div class="settings card"><button class="modal-close" id="settingsClose">×</button><span class="kicker">RÉGLAGES</span><h2>Affichage & assistance</h2><label>Qualité graphique<select id="qualitySelect"><option value="high">Élevée</option><option value="medium">Moyenne</option><option value="low">Performance</option></select></label><label>Volume général<input id="volumeRange" type="range" min="0" max="100" value="70"></label><label class="switch-row"><span><b>Assistant de freinage</b><small>Affiche quand préparer et appliquer le frein.</small></span><input id="advisorToggle" type="checkbox" checked></label><label class="switch-row"><span><b>Minimap toujours visible</b><small>Carte de ligne et zone de freinage.</small></span><input id="mapToggleSetting" type="checkbox" checked></label></div></section>

  <section id="help" class="modal-wrap hidden"><div class="help card"><button class="modal-close" id="helpClose">×</button><span class="kicker">AIDE CONDUCTEUR</span><h2>Commandes</h2><div class="key-grid"><kbd>↑</kbd><span>Traction +</span><kbd>↓</kbd><span>Frein +</span><kbd>N</kbd><span>Neutre</span><kbd>D</kbd><span>Portes</span><kbd>ESPACE</kbd><span>VACMA</span><kbd>H</kbd><span>Avertisseur</span><kbd>C</kbd><span>Changer de caméra</span><kbd>M</kbd><span>Afficher / masquer la minimap</span><kbd>F1</kbd><span>Interface compacte</span><kbd>ÉCHAP</kbd><span>Pause</span></div><p class="muted">Tu peux aussi conduire entièrement à la souris avec les gros boutons en bas de l'écran.</p></div></section>

  <section id="driveUi" class="drive-ui hidden">
    <header class="drive-top">
      <div class="service-chip"><span class="kicker">SERVICE</span><b id="hudService"></b><small id="hudRoute"></small></div>
      <div class="drive-top-right"><div class="score-chip"><span>SCORE</span><b id="hudScore">1000</b></div><div class="clock-chip"><span id="hudClock">00:00:00</span><small id="hudDelay">À l'heure</small></div><button id="pauseBtn" class="square-btn" aria-label="Pause">Ⅱ</button></div>
    </header>

    <aside class="next-stop-card">
      <span class="kicker">PROCHAINE DESSERTE</span><h2 id="hudNext">—</h2>
      <div class="next-stop-distance"><b id="hudDistance">0</b><span>m</span></div>
      <div class="next-stop-meta"><span>ETA <b id="hudEta">—</b></span><span>Quai <b id="hudPlatform">—</b></span></div>
      <div class="stop-progress"><i id="hudProgress"></i></div>
      <div id="stopRuler" class="stop-ruler hidden"><span>-45 m</span><div><i id="stopMarker"></i><b></b></div><span>+45 m</span></div>
    </aside>

    <section id="advisorCard" class="advisor-card" data-level="cruise">
      <div class="advisor-icon">◆</div><div><span class="kicker">ASSISTANT CONDUITE</span><h3 id="advisorTitle">Maintenir</h3><p id="advisorDetail">Conduite normale</p></div><div id="advisorNotch" class="advisor-notch">—</div>
    </section>

    <section id="navigatorPanel" class="navigator-panel"><div class="navigator-head"><div><span class="kicker">NAVIGATION</span><b id="navNext">Prochain arrêt</b></div><button id="mapCloseBtn" class="tiny-btn" title="Masquer la carte">M</button></div><canvas id="routeMap" aria-label="Minimap du trajet"></canvas><div class="nav-data"><span>Prochaine limite <b id="nextLimit">—</b></span><span>Signal <b id="nextSignal">—</b></span></div></section>

    <section class="speed-cluster"><div class="speed-main"><span>VITESSE</span><b id="hudSpeed">0</b><small>km/h</small></div><div class="limit-badge"><span>MAX</span><b id="hudLimit">40</b></div><div id="overspeedLamp" class="overspeed-lamp">SURVITESSE</div></section>

    <section class="train-status"><div><span>MANIP.</span><b id="hudMaster">NEUTRE</b></div><div><span>CG</span><b id="hudPressure">5.0 bar</b></div><div><span>VACMA</span><b id="hudVacma">30 s</b></div><div><span>PORTES</span><b id="hudDoors">OUVERTES</b></div></section>

    <div id="message" class="message"></div>
    <div id="dwellBanner" class="dwell-banner hidden"><span>SERVICE VOYAGEURS</span><b id="dwellTime">0 s</b><small>Maintenir les portes ouvertes</small></div>

    <div class="controller-pad">
      <button id="tractionBtn" class="control-btn traction"><span>TRACTION</span><b>+</b><small>↑</small></button>
      <button id="neutralBtn" class="control-btn neutral"><span>NEUTRE</span><b>N</b><small>coupe l'effort</small></button>
      <button id="brakeBtn" class="control-btn brake"><span>FREIN</span><b>+</b><small>↓</small></button>
    </div>

    <div class="drive-controls"><button id="doorBtn">Portes <kbd>D</kbd></button><button id="ackBtn" class="accent">Vigilance <kbd>ESPACE</kbd></button><button id="hornBtn">Avertisseur <kbd>H</kbd></button><button id="cameraBtn">Caméra <kbd>C</kbd></button><button id="emergencyBtn" class="danger">Urgence <kbd>E</kbd></button></div>

    <section id="tutorialPanel" class="tutorial-panel hidden"><span class="kicker">FORMATION CONDUCTEUR</span><div class="tutorial-step"><b id="tutorialIndex">01</b><div><h3 id="tutorialTitle"></h3><p id="tutorialText"></p></div></div><button id="skipTutorial" class="ghost">Masquer les conseils</button></section>
  </section>

  <section id="pauseOverlay" class="modal-wrap hidden"><div class="pause-card card"><span class="kicker">SERVICE SUSPENDU</span><h2>Pause</h2><button id="resumeBtn" class="primary big">Reprendre</button><button id="restartBtn" class="ghost big">Recommencer</button><button id="quitBtn" class="ghost big">Retour aux missions</button></div></section>
  <section id="resultOverlay" class="modal-wrap hidden"><div class="result-card card"><span class="kicker">RAPPORT DE SERVICE</span><h2 id="resultTitle">Mission terminée</h2><div class="result-score"><span>SCORE</span><strong id="resultScore">0</strong><small id="resultGrade">B</small></div><div id="resultStats" class="result-stats"></div><div class="result-actions"><button id="resultRestart" class="primary big">Rejouer</button><button id="resultMenu" class="ghost big">Missions</button></div></div></section>
`;

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const camera = new THREE.PerspectiveCamera(65, 1, .08, 2500);
const audio = new AudioEngine();
const navigator = new RouteNavigator($('routeMap'));

let scene = new THREE.Scene();
let world = null;
let cab = null;
let sim = null;
let trainModel = null;
let currentMission = MISSIONS[0];
let gameMode = 'menu';
let paused = false;
let last = performance.now();
let cameraMode = 0;
let lookYaw = 0;
let lookPitch = 0;
let dragging = false;
let lastPointer = null;
let uiCompact = false;
let mapVisible = true;
let advisorEnabled = true;
let quality = 'high';
let resultShown = false;
let tutorialStep = 0;
let lastAdvisorLevel = 'cruise';
let announced = new Set();

const tutorialSteps = [
  ['Préparation au départ', 'Ferme les portes avec D. Tant qu’elles sont ouvertes, la traction reste verrouillée.'],
  ['Mise en mouvement', 'Utilise ↑ ou le bouton TRACTION + pour monter les crans progressivement.'],
  ['Vigilance VACMA', 'Acquitte régulièrement avec Espace. Le compteur rouge signifie qu’il faut agir immédiatement.'],
  ['Approche d’une gare', 'Suis la minimap : la zone orange indique où préparer le freinage.'],
  ['Arrêt précis', 'À moins de 100 m, utilise le repère d’arrêt. Immobilise-toi puis ouvre les portes.'],
];

function weatherLabel(w) { return w === 'rain' ? 'Pluie forte' : w === 'night' ? 'Nuit' : 'Temps clair'; }
function formatServiceTime(sec) { sec = ((Math.round(sec) % 86400) + 86400) % 86400; const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = Math.floor(sec % 60); return [h, m, s].map(v => String(v).padStart(2, '0')).join(':'); }
function formatDelay(d) { if (Math.abs(d) < 8) return 'À l’heure'; return d > 0 ? `+${Math.round(d)} s` : `${Math.round(d)} s`; }
function formatEta(sec) { if (!Number.isFinite(sec) || sec > 599) return '—'; const m = Math.floor(sec / 60), s = Math.round(sec % 60); return m ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`; }

function renderMissionCards() {
  const grid = $('missionGrid'); grid.innerHTML = '';
  MISSIONS.forEach((m, i) => {
    const card = document.createElement('button'); card.type = 'button'; card.className = 'mission-card'; card.style.setProperty('--mission', m.color);
    card.innerHTML = `<div class="mission-card-top"><span class="mission-number">0${i + 1}</span><span class="difficulty">${m.difficulty}</span></div><div class="mission-weather">${weatherLabel(m.weather)}</div><h3>${m.title}</h3><p>${m.subtitle}</p><div class="mission-meta"><span>${m.distanceKm.toFixed(1)} km</span><span>${m.duration}</span><span>${m.stations.length} arrêts</span></div><div class="mission-card-footer"><span>${m.service}</span><b>Ouvrir le briefing →</b></div>`;
    card.addEventListener('click', () => openBriefing(m)); grid.append(card);
  });
}

function openBriefing(m) {
  currentMission = m;
  $('briefTitle').textContent = m.title; $('briefDescription').textContent = m.description; $('briefService').textContent = m.service; $('briefDuration').textContent = m.duration; $('briefDistance').textContent = `${m.distanceKm.toFixed(1)} km`; $('briefDifficulty').textContent = m.difficulty;
  $('briefTags').innerHTML = `<span>${weatherLabel(m.weather)}</span><span>${m.train}</span><span>${m.stations.length} gares</span>`;
  $('briefRoute').innerHTML = m.stations.map((s, i) => `<div class="brief-stop"><i></i><span><b>${s.name}</b><small>${formatServiceTime(m.startClock + s.scheduled)}</small></span>${i < m.stations.length - 1 ? '<em></em>' : ''}</div>`).join('');
  $('briefing').classList.remove('hidden');
}
function closeModal(id) { $(id).classList.add('hidden'); }

function applyQuality() { const ratios = { high: 2, medium: 1.35, low: 1 }; renderer.setPixelRatio(Math.min(devicePixelRatio, ratios[quality])); renderer.shadowMap.enabled = quality !== 'low'; resize(); }

async function startMission(m = currentMission) {
  currentMission = m; closeModal('briefing'); $('menu').classList.add('hidden'); $('resultOverlay').classList.add('hidden'); $('pauseOverlay').classList.add('hidden'); $('driveUi').classList.remove('hidden'); canvas.classList.add('active');
  world?.dispose?.(); camera.clear(); scene = new THREE.Scene(); scene.add(camera); world = new RailwayWorld(scene, m, renderer); cab = buildCab(camera, m); trainModel = buildTrainModel(scene); sim = new TrainSimulation(world, m); navigator.setMission(m, world);
  await audio.start(); if (audio.ready && audio.ctx.state === 'suspended') await audio.ctx.resume();
  gameMode = 'playing'; paused = false; resultShown = false; cameraMode = 0; lookYaw = 0; lookPitch = 0; tutorialStep = 0; last = performance.now(); announced = new Set(); lastAdvisorLevel = 'cruise';
  $('hudService').textContent = m.service; $('hudRoute').textContent = m.subtitle; $('tutorialPanel').classList.toggle('hidden', !m.tutorial); updateTutorial(); updateNavigatorVisibility();
}

function updateTutorial() { if (!currentMission.tutorial) return; const [title, text] = tutorialSteps[Math.min(tutorialStep, tutorialSteps.length - 1)]; $('tutorialIndex').textContent = String(tutorialStep + 1).padStart(2, '0'); $('tutorialTitle').textContent = title; $('tutorialText').textContent = text; }
function tutorialLogic(s) { if (!currentMission.tutorial || $('tutorialPanel').classList.contains('hidden')) return; let advance = false; if (tutorialStep === 0 && !s.doors) advance = true; if (tutorialStep === 1 && s.speed > 25) advance = true; if (tutorialStep === 2 && sim.elapsed - sim.lastAck < 1 && s.speed > 8) advance = true; if (tutorialStep === 3 && s.distance < 700) advance = true; if (tutorialStep === 4 && sim.stationServed.size >= 2) advance = true; if (advance && tutorialStep < tutorialSteps.length - 1) { tutorialStep++; updateTutorial(); showMessage('Étape de formation validée'); } }

function showMessage(text, duration = 2500) { const el = $('message'); el.textContent = text; el.classList.add('show'); clearTimeout(showMessage.t); showMessage.t = setTimeout(() => el.classList.remove('show'), duration); }
function toggleDoors() { if (!sim) return; if (sim.speed > .5) { showMessage('Portes verrouillées : train en mouvement'); return; } if (sim.doors && sim.dwell > 0) sim.penalize(40, 'Fermeture avant fin du service voyageurs'); if (sim.toggleDoors()) { audio.doorChime(); showMessage(sim.doors ? 'Portes ouvertes' : 'Portes fermées'); } }
function acknowledge() { sim?.acknowledge(); audio.vigilance(); showMessage('VACMA acquittée', 1200); }
function cycleCamera() { cameraMode = (cameraMode + 1) % 3; lookYaw = lookPitch = 0; showMessage(['Vue cabine', 'Vue extérieure arrière', 'Vue latérale'][cameraMode], 1500); }
function updateNavigatorVisibility() { $('navigatorPanel').classList.toggle('hidden-map', !mapVisible); $('mapToggleSetting').checked = mapVisible; }
function toggleMap() { mapVisible = !mapVisible; updateNavigatorVisibility(); }

function announceApproach(s, advice) {
  const thresholds = [1500, 800, 400, 200, 100];
  for (const t of thresholds) {
    const key = `${s.nextStationIndex}-${t}`;
    if (s.distance <= t && !announced.has(key)) { announced.add(key); showMessage(`${s.next} · ${Math.round(s.distance)} m`, 1900); if (t === 400 || t === 200) audio.vigilance(); break; }
  }
  if (advisorEnabled && advice.level !== lastAdvisorLevel) {
    if (advice.level === 'brake') { showMessage(`Freiner maintenant · ${advice.detail}`, 3000); audio.vigilance(); }
    if (advice.level === 'strong') { showMessage('Approche trop rapide · augmente le frein', 3000); audio.vigilance(); }
    lastAdvisorLevel = advice.level;
  }
}

function updateUi(s) {
  const nextStation = currentMission.stations[s.nextStationIndex] || null;
  const advice = computeDrivingAdvice({ state: s, mission: currentMission, world });
  $('hudClock').textContent = formatServiceTime(currentMission.startClock + s.elapsed); $('hudDelay').textContent = formatDelay(s.delay); $('hudScore').textContent = s.score;
  $('hudNext').textContent = s.next; $('hudDistance').textContent = Math.round(s.distance).toLocaleString('fr-FR'); $('hudEta').textContent = formatEta(advice.etaSeconds); $('hudPlatform').textContent = nextStation ? (nextStation.platformSide === 'left' ? 'gauche' : 'droite') : '—';
  $('hudSpeed').textContent = Math.round(s.speed); $('hudLimit').textContent = s.limit; $('hudMaster').textContent = s.emergency ? 'URGENCE' : s.master > 0 ? `T${s.master}` : s.master < 0 ? `F${Math.abs(s.master)}` : 'NEUTRE'; $('hudPressure').textContent = `${s.pressure.toFixed(1)} bar`; $('hudVacma').textContent = `${Math.max(0, Math.ceil(s.vacma))} s`; $('hudDoors').textContent = s.doors ? 'OUVERTES' : 'FERMÉES';
  $('overspeedLamp').classList.toggle('on', s.speed > s.limit + 2); $('hudVacma').classList.toggle('danger-text', s.vacma < 7);
  $('hudProgress').style.width = `${Math.min(100, s.u * 100)}%`;

  $('advisorCard').dataset.level = advisorEnabled ? advice.level : 'off'; $('advisorCard').classList.toggle('advisor-disabled', !advisorEnabled); $('advisorTitle').textContent = advisorEnabled ? advice.title : 'Assistance désactivée'; $('advisorDetail').textContent = advisorEnabled ? advice.detail : 'Conduite sans guidage'; $('advisorNotch').textContent = advisorEnabled && advice.brakeNotch ? `F${advice.brakeNotch}` : '—';
  $('navNext').textContent = nextStation ? nextStation.name : 'Terminus';
  $('nextLimit').textContent = advice.nextSpeedZone ? `${advice.nextSpeedZone[1]} km/h dans ${Math.round(advice.nextSpeedDistance)} m` : 'fin de ligne';
  $('nextSignal').textContent = advice.signal ? `${advice.signal.state === 'green' ? 'voie libre' : advice.signal.state === 'yellow' ? 'avertissement' : 'fermé'} · ${Math.round(advice.signalDistance)} m` : '—';

  const signedDist = nextStation ? (nextStation.u - s.u) * world.length : 999;
  const rulerVisible = Math.abs(signedDist) < 100;
  $('stopRuler').classList.toggle('hidden', !rulerVisible); if (rulerVisible) $('stopMarker').style.left = `${Math.max(0, Math.min(100, 50 - signedDist / 90 * 50))}%`;
  $('dwellBanner').classList.toggle('hidden', s.dwell <= 0); if (s.dwell > 0) $('dwellTime').textContent = `${Math.ceil(s.dwell)} s`;

  navigator.draw(s, advice); announceApproach(s, advice); tutorialLogic(s);
  return advice;
}

function updateCamera(s, dt) {
  const sample = world.sample(s.u); const base = sample.p.clone();
  cab.group.visible = cameraMode === 0; trainModel.setVisible(cameraMode !== 0); trainModel.update(world, s.u);
  if (cameraMode === 0) {
    camera.position.copy(base).add(new THREE.Vector3(0, 2.15, 0)).addScaledVector(sample.t, 2.2);
    const baseYaw = Math.atan2(sample.t.x, sample.t.z) + lookYaw; const cp = Math.cos(lookPitch); const dir = new THREE.Vector3(Math.sin(baseYaw) * cp, Math.sin(lookPitch), Math.cos(baseYaw) * cp);
    camera.lookAt(camera.position.clone().addScaledVector(dir, 120));
  } else if (cameraMode === 1) {
    camera.position.copy(base).add(new THREE.Vector3(0, 6.5, 0)).addScaledVector(sample.t, -27).addScaledVector(sample.right, 4.5); camera.lookAt(base.clone().add(new THREE.Vector3(0, 2.2, 0)).addScaledVector(sample.t, 8));
  } else {
    camera.position.copy(base).add(new THREE.Vector3(0, 7.2, 0)).addScaledVector(sample.right, 21).addScaledVector(sample.t, -4); camera.lookAt(base.clone().add(new THREE.Vector3(0, 2, 0)));
  }
  const shake = Math.min(.025, s.speed * .00018); if (cameraMode === 0 && s.speed > 8) camera.position.y += Math.sin(performance.now() * .018) * shake;
  cab.update(s, dt, performance.now() / 1000);
}

function showResult() {
  if (resultShown || !sim) return; resultShown = true; paused = true; const s = sim.state(); const grade = s.score >= 1300 ? 'S' : s.score >= 1120 ? 'A' : s.score >= 930 ? 'B' : s.score >= 720 ? 'C' : 'D';
  $('resultTitle').textContent = s.failed ? 'Mission échouée' : 'Service terminé'; $('resultScore').textContent = s.score; $('resultGrade').textContent = grade;
  const served = sim.stationServed.size; const total = currentMission.stations.length; const penalties = sim.penalties.reduce((a, p) => a + p.points, 0); const accuracy = sim.stopAccuracy == null ? '—' : `${sim.stopAccuracy.toFixed(1)} m`;
  $('resultStats').innerHTML = `<div><span>Gares desservies</span><b>${served} / ${total}</b></div><div><span>Ponctualité</span><b>${formatDelay(s.delay)}</b></div><div><span>Dernier arrêt</span><b>${accuracy}</b></div><div><span>Pénalités</span><b>-${penalties} pts</b></div>`; $('resultOverlay').classList.remove('hidden');
}

function pauseGame() { if (gameMode !== 'playing' || resultShown) return; paused = true; $('pauseOverlay').classList.remove('hidden'); }
function resumeGame() { paused = false; last = performance.now(); $('pauseOverlay').classList.add('hidden'); }
function returnMenu() { paused = false; resultShown = false; gameMode = 'menu'; $('driveUi').classList.add('hidden'); $('pauseOverlay').classList.add('hidden'); $('resultOverlay').classList.add('hidden'); $('menu').classList.remove('hidden'); canvas.classList.remove('active'); }

$('briefingClose').onclick = () => closeModal('briefing'); $('settingsClose').onclick = () => closeModal('settings'); $('helpClose').onclick = () => closeModal('help'); $('settingsBtn').onclick = () => $('settings').classList.remove('hidden'); $('helpMenuBtn').onclick = () => $('help').classList.remove('hidden'); $('startBtn').onclick = () => startMission(currentMission);
$('qualitySelect').onchange = e => { quality = e.target.value; applyQuality(); }; $('volumeRange').oninput = e => { if (audio.master) audio.master.gain.value = (+e.target.value / 100) * .36; }; $('advisorToggle').onchange = e => advisorEnabled = e.target.checked; $('mapToggleSetting').onchange = e => { mapVisible = e.target.checked; updateNavigatorVisibility(); };
$('doorBtn').onclick = toggleDoors; $('ackBtn').onclick = acknowledge; $('hornBtn').onclick = () => audio.horn(); $('cameraBtn').onclick = cycleCamera; $('emergencyBtn').onclick = () => sim?.emergencyBrake(); $('tractionBtn').onclick = () => sim?.stepUp(); $('brakeBtn').onclick = () => sim?.stepDown(); $('neutralBtn').onclick = () => sim?.neutral(); $('pauseBtn').onclick = pauseGame; $('mapCloseBtn').onclick = toggleMap; $('skipTutorial').onclick = () => $('tutorialPanel').classList.add('hidden');
$('resumeBtn').onclick = resumeGame; $('restartBtn').onclick = () => startMission(currentMission); $('quitBtn').onclick = returnMenu; $('resultRestart').onclick = () => startMission(currentMission); $('resultMenu').onclick = returnMenu;

document.addEventListener('keydown', (e) => {
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
  if (gameMode !== 'playing') return;
  if (e.key === 'Escape') { e.preventDefault(); paused ? resumeGame() : pauseGame(); return; }
  if (paused) return;
  if (e.key === 'ArrowUp') { e.preventDefault(); sim.stepUp(); }
  else if (e.key === 'ArrowDown') { e.preventDefault(); sim.stepDown(); }
  else if (e.key.toLowerCase() === 'n') sim.neutral();
  else if (e.key.toLowerCase() === 'd') toggleDoors();
  else if (e.code === 'Space') { e.preventDefault(); acknowledge(); }
  else if (e.key.toLowerCase() === 'e') sim.emergencyBrake();
  else if (e.key.toLowerCase() === 'h') audio.horn();
  else if (e.key.toLowerCase() === 'c') cycleCamera();
  else if (e.key.toLowerCase() === 'v') lookYaw = lookPitch = 0;
  else if (e.key.toLowerCase() === 'm') toggleMap();
  else if (e.key === 'F1') { e.preventDefault(); uiCompact = !uiCompact; $('driveUi').classList.toggle('compact', uiCompact); }
});

canvas.addEventListener('pointerdown', e => { if (gameMode !== 'playing' || cameraMode !== 0) return; dragging = true; lastPointer = [e.clientX, e.clientY]; canvas.setPointerCapture?.(e.pointerId); });
canvas.addEventListener('pointermove', e => { if (!dragging || !lastPointer) return; const dx = e.clientX - lastPointer[0], dy = e.clientY - lastPointer[1]; lookYaw = THREE.MathUtils.clamp(lookYaw - dx * .0034, -1.08, 1.08); lookPitch = THREE.MathUtils.clamp(lookPitch - dy * .0028, -.38, .38); lastPointer = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', () => { dragging = false; lastPointer = null; }); canvas.addEventListener('pointercancel', () => { dragging = false; lastPointer = null; });

function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / Math.max(1, innerHeight); camera.updateProjectionMatrix(); navigator.resize(); }
window.addEventListener('resize', resize); resize();

function animate(now) {
  requestAnimationFrame(animate); const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (gameMode === 'playing' && sim && world) {
    if (!paused) sim.update(dt); const s = sim.state(); updateUi(s); updateCamera(s, dt); world.update(s.u, paused ? 0 : dt, camera.position); audio.update(s.speed, Math.max(0, s.master), Math.max(0, -s.master), world.inTunnel(s.u));
    if ((s.finished || s.failed) && !resultShown) setTimeout(showResult, 500);
  }
  renderer.render(scene, camera);
}

renderMissionCards(); setTimeout(() => $('boot').classList.add('hidden'), 450); requestAnimationFrame(animate);
