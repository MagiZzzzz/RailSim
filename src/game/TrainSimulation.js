import * as THREE from 'three';

export class TrainSimulation{
  constructor(world,mission){this.world=world;this.mission=mission;this.reset();}
  reset(){
    this.u=.012;this.speed=0;this.master=0;this.emergency=false;this.doors=true;this.vacma=30;this.delay=0;this.elapsed=0;this.score=1000;this.nextStation=1;this.dwell=0;this.failed=false;this.finished=false;this.message='Fermez les portes puis mettez la traction.';this.penalties=[];this.lastSignal=null;this.overspeedTimer=0;this.stopAccuracy=null;this.stationServed=new Set([0]);this.brakePressure=5;this.lastAck=0;
  }
  setMaster(v){if(this.failed||this.finished)return;v=Math.max(-7,Math.min(4,v));if(this.doors&&v>0)return;this.master=v;if(v!==0)this.emergency=false;}
  stepUp(){if(this.master<0)this.master=0;else this.setMaster(this.master+1)}
  stepDown(){if(this.master>0)this.master=0;else this.setMaster(this.master-1)}
  neutral(){this.master=0;this.emergency=false;}
  emergencyBrake(reason='Freinage d’urgence'){this.master=-7;this.emergency=true;this.penalize(35,reason);}
  acknowledge(){this.vacma=30;this.lastAck=this.elapsed;}
  toggleDoors(){if(this.speed>.5)return false;this.doors=!this.doors;return true;}
  penalize(points,reason){this.score=Math.max(0,this.score-points);this.penalties.push({time:this.elapsed,points,reason});this.message=`-${points} pts · ${reason}`;}
  currentStation(){return this.mission.stations[this.nextStation]||null;}
  distanceToNextStation(){const s=this.currentStation();if(!s)return 0;return Math.max(0,(s.u-this.u)*this.world.length);}
  update(dt){
    if(this.failed||this.finished)return;
    this.elapsed+=dt;this.vacma-=dt;
    const limit=this.world.speedLimit(this.u);const gradient=this.world.gradient(this.u);const wet=this.mission.weather==='rain';
    if(this.vacma<=0){this.failed=true;this.emergency=true;this.master=-7;this.message='Mission terminée : VACMA non acquittée.';return;}
    // Simple force model inspired by EMU behavior: traction fades with speed, service brake is progressive.
    const kmh=this.speed;const ms=kmh/3.6;const tractionNotch=Math.max(0,this.master);const brakeNotch=Math.max(0,-this.master);
    const adhesion=wet?.82:1;const tractionAccel=tractionNotch?(0.19*tractionNotch)*(1-Math.min(.72,kmh/190))*adhesion:0;
    const serviceBrake=brakeNotch?(0.105+brakeNotch*.105)*(wet?.86:1):0;
    const emergency=this.emergency?.65:0;const rolling=.012+.0009*kmh;const gradeAccel=-9.81*(gradient/1000);
    let nextMs=ms+(tractionAccel-serviceBrake-emergency-rolling+gradeAccel)*dt;nextMs=Math.max(0,nextMs);this.speed=nextMs*3.6;
    this.brakePressure=THREE.MathUtils.damp(this.brakePressure,5-Math.min(4.2,brakeNotch*.56+(this.emergency?1.2:0)),5,dt);
    this.u=Math.min(.999,this.u+(nextMs*dt)/this.world.length);
    if(this.speed>limit+2){this.overspeedTimer+=dt;if(this.overspeedTimer>1.5){this.score=Math.max(0,this.score-dt*(1+(this.speed-limit)*.12));this.message=`Survitesse ${Math.round(this.speed)} / ${limit} km/h`;}}
    else this.overspeedTimer=Math.max(0,this.overspeedTimer-dt*2);
    if(this.speed>limit+15&&!this.emergency){this.emergency=true;this.master=-7;this.penalize(80,'Contrôle vitesse : freinage automatique');}
    const sig=this.world.upcomingSignal(this.u);if(sig&&sig!==this.lastSignal){const dist=(sig.u-this.u)*this.world.length;if(dist<45){if(sig.state==='red'){this.failed=true;this.message='Signal fermé franchi — mission échouée.';this.master=-7;this.emergency=true;return;}if(sig.state==='yellow')this.message='Avertissement : prochain signal à vitesse réduite.';this.lastSignal=sig;}}
    const st=this.currentStation();if(st){const dist=(st.u-this.u)*this.world.length;if(dist<-65&&!this.stationServed.has(this.nextStation)){this.penalize(160,`Arrêt manqué : ${st.name}`);this.nextStation++;}
      if(Math.abs(dist)<45&&this.speed<.45&&this.doors&&!this.stationServed.has(this.nextStation)){
        const error=Math.abs(dist);this.stopAccuracy=error;this.stationServed.add(this.nextStation);const bonus=Math.round(Math.max(20,150-error*3));this.score+=bonus;this.message=`${st.name} · arrêt à ${error.toFixed(1)} m · +${bonus} pts`;this.dwell=st.dwell;const scheduled=st.scheduled;this.delay=Math.max(-20,this.elapsed-scheduled);this.nextStation++;
      }
    }
    if(this.dwell>0){this.dwell=Math.max(0,this.dwell-dt);if(this.dwell===0)this.message='Service voyageurs terminé : fermez les portes.';}
    if(this.u>.985){const final=this.mission.stations.at(-1);if(this.speed<.5&&Math.abs((final.u-this.u)*this.world.length)<100){this.finished=true;this.score+=Math.max(0,250-Math.max(0,this.delay)*2);this.message='Mission terminée.';}}
  }
  state(){const st=this.currentStation();return{u:this.u,speed:this.speed,master:this.master,doors:this.doors,vacma:this.vacma,delay:this.delay,pressure:this.brakePressure,score:Math.round(this.score),limit:this.world.speedLimit(this.u),next:st?.name||'Terminus',distance:this.distanceToNextStation(),elapsed:this.elapsed,dwell:this.dwell,failed:this.failed,finished:this.finished,message:this.message,emergency:this.emergency};}
}
