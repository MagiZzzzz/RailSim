export class RouteNavigator {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.mission = null;
    this.world = null;
    this.lastWidth = 0;
    this.lastHeight = 0;
  }

  setMission(mission, world) {
    this.mission = mission;
    this.world = world;
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(280, Math.round(rect.width || 420));
    const h = Math.max(150, Math.round(rect.height || 190));
    if (w === this.lastWidth && h === this.lastHeight) return;
    this.lastWidth = w;
    this.lastHeight = h;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  draw(state, advice) {
    if (!this.mission || !this.world) return;
    this.resize();
    const ctx = this.ctx;
    const w = this.lastWidth;
    const h = this.lastHeight;
    ctx.clearRect(0, 0, w, h);

    const left = 24;
    const right = w - 24;
    const trackY = 88;
    const trackW = right - left;
    const xForU = (u) => left + Math.max(0, Math.min(1, u)) * trackW;

    ctx.fillStyle = 'rgba(6,12,17,.94)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,.08)';
    ctx.strokeRect(.5, .5, w - 1, h - 1);

    ctx.fillStyle = '#92a3ae';
    ctx.font = '600 10px Inter, sans-serif';
    ctx.fillText('CARTE DE LIGNE', 18, 20);

    const nextStation = this.mission.stations[state.nextStationIndex] || null;
    if (nextStation) {
      const brakeX = xForU(advice.brakingStartU);
      const stopX = xForU(nextStation.u);
      ctx.fillStyle = advice.level === 'strong' ? 'rgba(245,87,87,.20)' : 'rgba(240,178,77,.16)';
      ctx.fillRect(brakeX, trackY - 16, Math.max(3, stopX - brakeX), 32);
      ctx.strokeStyle = advice.level === 'strong' ? '#f25f5f' : '#e9ad46';
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(brakeX, trackY - 21);
      ctx.lineTo(brakeX, trackY + 21);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#c8d2d8';
      ctx.font = '500 9px Inter, sans-serif';
      ctx.fillText('DÉBUT FREINAGE', Math.max(8, Math.min(w - 88, brakeX - 34)), trackY - 27);
    }

    ctx.strokeStyle = '#4d606d';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(left, trackY);
    ctx.lineTo(right, trackY);
    ctx.stroke();

    ctx.strokeStyle = '#87bdd8';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(left, trackY);
    ctx.lineTo(xForU(state.u), trackY);
    ctx.stroke();

    for (const [u, limit] of this.mission.speedZones) {
      if (u <= 0.001) continue;
      const x = xForU(u);
      ctx.strokeStyle = 'rgba(205,220,228,.38)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, trackY + 18);
      ctx.lineTo(x, trackY + 30);
      ctx.stroke();
      ctx.fillStyle = '#7f9099';
      ctx.font = '500 8px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(limit), x, trackY + 41);
    }

    this.mission.stations.forEach((station, index) => {
      const x = xForU(station.u);
      const served = index < state.nextStationIndex;
      const current = index === state.nextStationIndex;
      ctx.beginPath();
      ctx.arc(x, trackY, current ? 7 : 5, 0, Math.PI * 2);
      ctx.fillStyle = served ? '#60717b' : current ? '#f1bd56' : '#d8e4e9';
      ctx.fill();
      ctx.strokeStyle = '#10171c';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (current || index === 0 || index === this.mission.stations.length - 1) {
        ctx.fillStyle = current ? '#f4d18a' : '#9cabb3';
        ctx.font = current ? '700 9px Inter, sans-serif' : '500 8px Inter, sans-serif';
        ctx.textAlign = 'center';
        const name = station.name.length > 18 ? `${station.name.slice(0, 17)}…` : station.name;
        ctx.fillText(name, Math.max(38, Math.min(w - 38, x)), trackY - (current ? 18 : 14));
      }
    });

    const trainX = xForU(state.u);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(trainX, trackY - 13);
    ctx.lineTo(trainX - 6, trackY - 3);
    ctx.lineTo(trainX + 6, trackY - 3);
    ctx.closePath();
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#7d8d96';
    ctx.font = '500 9px Inter, sans-serif';
    ctx.fillText('POSITION', 18, h - 24);
    ctx.fillStyle = '#e7f0f4';
    ctx.font = '700 12px Inter, sans-serif';
    ctx.fillText(`${Math.round(state.u * 100)} %`, 18, h - 9);

    if (nextStation) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#7d8d96';
      ctx.font = '500 9px Inter, sans-serif';
      ctx.fillText('PROCHAIN ARRÊT', w - 18, h - 24);
      ctx.fillStyle = '#e7f0f4';
      ctx.font = '700 12px Inter, sans-serif';
      ctx.fillText(`${Math.round(state.distance)} m`, w - 18, h - 9);
    }
    ctx.textAlign = 'left';
  }
}
