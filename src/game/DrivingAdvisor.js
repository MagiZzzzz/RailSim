export function computeDrivingAdvice({ state, mission, world }) {
  const nextStation = mission.stations[state.nextStationIndex ?? 0] || mission.stations.find((s) => s.name === state.next) || null;
  const distance = Math.max(0, Number(state.distance || 0));
  const speedMs = Math.max(0, state.speed / 3.6);
  const wet = mission.weather === 'rain';
  const comfortDecel = wet ? 0.56 : 0.72;
  const maxServiceDecel = wet ? 0.72 : 0.9;
  const reactionSeconds = wet ? 3.0 : 2.3;
  const baseStoppingDistance = speedMs > 0 ? (speedMs * speedMs) / (2 * comfortDecel) : 0;
  const stoppingDistance = baseStoppingDistance + speedMs * reactionSeconds + 35;
  const preparationDistance = Math.max(220, stoppingDistance * 1.65);
  const strongDistance = Math.max(65, stoppingDistance * 0.62);

  let level = 'cruise';
  let title = 'Maintenir';
  let detail = 'Conduite normale';
  let brakeNotch = 0;

  if (nextStation && distance <= preparationDistance) {
    level = 'prepare';
    title = 'Préparer le freinage';
    detail = `Arrêt dans ${Math.round(distance)} m`;
  }
  if (nextStation && distance <= stoppingDistance) {
    level = 'brake';
    title = 'Freiner maintenant';
    const usableDistance = Math.max(22, distance - 18);
    const requiredDecel = speedMs > 0 ? (speedMs * speedMs) / (2 * usableDistance) : 0;
    brakeNotch = Math.max(1, Math.min(7, Math.ceil((requiredDecel - 0.08) / 0.105)));
    detail = `Frein conseillé F${brakeNotch}`;
  }
  if (nextStation && distance <= strongDistance && state.speed > 18) {
    level = 'strong';
    title = 'Freinage fort';
    brakeNotch = Math.max(4, brakeNotch);
    detail = `Approche rapide · F${brakeNotch} conseillé`;
  }
  if (state.speed < 5 && distance < 55) {
    level = 'final';
    title = 'Repère d’arrêt';
    detail = distance < 12 ? 'Position excellente' : `Avance encore ${Math.round(distance)} m`;
    brakeNotch = 0;
  }

  const nextSpeedZone = mission.speedZones.find(([u]) => u > state.u + 0.001) || null;
  const nextSpeedDistance = nextSpeedZone ? Math.max(0, (nextSpeedZone[0] - state.u) * world.length) : null;
  const signal = world.upcomingSignal(state.u);
  const signalDistance = signal ? Math.max(0, (signal.u - state.u) * world.length) : null;
  const etaSeconds = speedMs > 1.5 ? distance / speedMs : null;
  const brakingStartU = nextStation ? Math.max(state.u, nextStation.u - preparationDistance / world.length) : state.u;

  return {
    level,
    title,
    detail,
    brakeNotch,
    stoppingDistance,
    preparationDistance,
    brakingStartU,
    etaSeconds,
    nextSpeedZone,
    nextSpeedDistance,
    signal,
    signalDistance,
    maxServiceDecel,
  };
}
