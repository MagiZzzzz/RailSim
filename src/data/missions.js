export const MISSIONS = [
  {
    id: 'suburban-rush',
    title: 'Pointe du matin',
    subtitle: 'Paris-Nord → Montsoult',
    service: 'Transilien H · 137642',
    train: 'Z 50000 Francilien',
    difficulty: 'Intermédiaire',
    duration: '12 min',
    distanceKm: 15.8,
    startClock: 7 * 3600 + 42 * 60,
    weather: 'clear',
    description: 'Service omnibus chargé en heure de pointe. Respecte les arrêts courts, les limitations et la signalisation sur une ligne périurbaine dense.',
    color: '#7fc8ff',
    routePoints: [
      [0, 0, 180], [0, 0, -700], [-18, 0, -1750], [-55, 0, -3200], [-22, 0, -4550],
      [42, 0, -6100], [65, 0, -7800], [20, 0, -9600], [-48, 0, -11600], [-15, 0, -13800], [35, 0, -15800]
    ],
    stations: [
      { name: 'Paris-Nord Banlieue', u: 0.015, dwell: 18, scheduled: 0, platformSide: 'right' },
      { name: 'Saint-Denis', u: 0.185, dwell: 22, scheduled: 128, platformSide: 'right' },
      { name: 'Épinay–Villetaneuse', u: 0.36, dwell: 18, scheduled: 250, platformSide: 'left' },
      { name: 'Sarcelles–Saint-Brice', u: 0.57, dwell: 20, scheduled: 390, platformSide: 'right' },
      { name: 'Domont', u: 0.75, dwell: 18, scheduled: 520, platformSide: 'left' },
      { name: 'Montsoult–Maffliers', u: 0.965, dwell: 0, scheduled: 690, platformSide: 'right' }
    ],
    speedZones: [[0,40],[0.04,60],[0.12,90],[0.24,110],[0.32,80],[0.40,100],[0.55,120],[0.68,90],[0.78,120],[0.91,70],[0.955,40]],
    environment: [
      [0,.18,'dense'], [.18,.34,'suburb'], [.34,.46,'urban'], [.46,.64,'wood'], [.64,.78,'suburb'], [.78,1,'country']
    ],
    tunnel: [0.405,0.455],
    gradients: [[0,.3],[.18,.8],[.35,-.4],[.57,.6],[.82,-.3]],
  },
  {
    id: 'rain-express',
    title: 'Express sous la pluie',
    subtitle: 'Valmont → Paris-Nord',
    service: 'Transilien H · 136519',
    train: 'Z 50000 Francilien',
    difficulty: 'Difficile',
    duration: '10 min',
    distanceKm: 17.4,
    startClock: 17 * 3600 + 18 * 60,
    weather: 'rain',
    description: 'Un semi-direct de fin de journée sous forte pluie. L’adhérence est réduite et les distances de freinage augmentent sensiblement.',
    color: '#8ea8ff',
    routePoints: [
      [0,0,160],[0,0,-900],[28,0,-2050],[78,0,-3500],[110,0,-5200],[42,0,-6800],[-30,0,-8600],[-65,0,-10400],[-20,0,-12300],[42,0,-14500],[0,0,-17400]
    ],
    stations: [
      {name:'Valmont',u:.015,dwell:15,scheduled:0,platformSide:'left'},
      {name:'Bellevue',u:.29,dwell:18,scheduled:170,platformSide:'right'},
      {name:'Saint-Brice',u:.54,dwell:18,scheduled:320,platformSide:'right'},
      {name:'Saint-Denis',u:.78,dwell:22,scheduled:470,platformSide:'left'},
      {name:'Paris-Nord Banlieue',u:.972,dwell:0,scheduled:605,platformSide:'right'}
    ],
    speedZones: [[0,50],[.05,100],[.19,120],[.3,100],[.43,120],[.58,90],[.7,110],[.84,80],[.94,50]],
    environment:[[0,.22,'country'],[.22,.4,'wood'],[.4,.61,'suburb'],[.61,.83,'urban'],[.83,1,'dense']],
    tunnel:[.73,.78], gradients:[[0,.2],[.2,-.7],[.42,.5],[.68,-.5],[.88,.2]],
  },
  {
    id: 'night-local',
    title: 'Dernier omnibus',
    subtitle: 'Montsoult → Paris-Nord',
    service: 'Transilien H · 138944',
    train: 'Z 50000 Francilien',
    difficulty: 'Intermédiaire',
    duration: '13 min',
    distanceKm: 16.2,
    startClock: 23 * 3600 + 6 * 60,
    weather: 'night',
    description: 'Dernier service omnibus. Les repères sont moins visibles, les quais sont éclairés et la vigilance conducteur devient essentielle.',
    color: '#c2a8ff',
    routePoints:[[0,0,150],[0,0,-800],[-40,0,-1900],[-70,0,-3400],[-20,0,-5000],[35,0,-6500],[70,0,-8200],[20,0,-9900],[-50,0,-11900],[-15,0,-14000],[0,0,-16200]],
    stations:[
      {name:'Montsoult–Maffliers',u:.015,dwell:15,scheduled:0,platformSide:'right'},
      {name:'Domont',u:.19,dwell:20,scheduled:125,platformSide:'left'},
      {name:'Sarcelles–Saint-Brice',u:.38,dwell:20,scheduled:265,platformSide:'right'},
      {name:'Épinay–Villetaneuse',u:.58,dwell:20,scheduled:410,platformSide:'left'},
      {name:'Saint-Denis',u:.77,dwell:22,scheduled:545,platformSide:'right'},
      {name:'Paris-Nord Banlieue',u:.972,dwell:0,scheduled:690,platformSide:'right'}
    ],
    speedZones:[[0,40],[.045,90],[.16,110],[.28,90],[.4,120],[.58,100],[.7,90],[.82,80],[.94,50]],
    environment:[[0,.25,'country'],[.25,.42,'wood'],[.42,.66,'suburb'],[.66,.84,'urban'],[.84,1,'dense']],
    tunnel:[.67,.72],gradients:[[0,-.2],[.23,.6],[.45,-.5],[.7,.3],[.9,-.2]],
  },
  {
    id: 'training',
    title: 'Formation conducteur',
    subtitle: 'Centre d’essais RailSim',
    service: 'École · TRAIN 001',
    train: 'Z 50000 Francilien',
    difficulty: 'Tutoriel',
    duration: '8 min',
    distanceKm: 9.5,
    startClock: 11 * 3600 + 15 * 60,
    weather: 'clear',
    description: 'Apprends traction, freinage, VACMA, signalisation, arrêts en gare et ouverture des portes avec des consignes progressives.',
    color: '#7ce0b2',
    routePoints:[[0,0,150],[0,0,-900],[30,0,-1900],[55,0,-3100],[15,0,-4300],[-35,0,-5600],[-10,0,-7100],[20,0,-8500],[0,0,-9500]],
    stations:[
      {name:'Centre d’essais',u:.02,dwell:10,scheduled:0,platformSide:'right'},
      {name:'Atelier Nord',u:.33,dwell:20,scheduled:150,platformSide:'right'},
      {name:'Boucle Centrale',u:.66,dwell:20,scheduled:310,platformSide:'left'},
      {name:'Centre d’essais',u:.965,dwell:0,scheduled:470,platformSide:'right'}
    ],
    speedZones:[[0,30],[.05,60],[.18,80],[.42,100],[.61,70],[.76,90],[.92,40]],
    environment:[[0,.22,'depot'],[.22,.5,'suburb'],[.5,.72,'wood'],[.72,1,'depot']],
    tunnel:[.52,.57],gradients:[[0,0],[.25,.4],[.5,-.4],[.75,.3]],
    tutorial:true,
  }
];

export function getMission(id){ return MISSIONS.find(m=>m.id===id) || MISSIONS[0]; }
