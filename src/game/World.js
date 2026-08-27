import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

const clamp=THREE.MathUtils.clamp;

function noiseTexture(colors, size=256, coarse=4){
  const c=document.createElement('canvas'); c.width=c.height=size; const x=c.getContext('2d');
  const data=x.createImageData(size,size);
  const palette=colors.map(h=>{const col=new THREE.Color(h);return [col.r*255,col.g*255,col.b*255]});
  for(let y=0;y<size;y++)for(let xx=0;xx<size;xx++){
    const n=Math.random(); const p=palette[Math.min(palette.length-1,Math.floor(n*palette.length))]; const i=(y*size+xx)*4;
    data.data[i]=p[0]+(Math.random()-.5)*coarse;data.data[i+1]=p[1]+(Math.random()-.5)*coarse;data.data[i+2]=p[2]+(Math.random()-.5)*coarse;data.data[i+3]=255;
  }
  x.putImageData(data,0,0); const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;return t;
}

function mat(color, rough=.8, metal=.0, map=null){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal,map});}
function mesh(geo, material, parent, cast=true, receive=true){const m=new THREE.Mesh(geo,material);m.castShadow=cast;m.receiveShadow=receive;parent.add(m);return m;}
function box(parent,x,y,z,w,h,d,material){const m=mesh(new THREE.BoxGeometry(w,h,d),material,parent);m.position.set(x,y,z);return m;}

export class RailwayWorld{
  constructor(scene,mission,renderer){
    this.scene=scene;this.mission=mission;this.renderer=renderer;this.group=new THREE.Group();scene.add(this.group);
    this.route=new THREE.CatmullRomCurve3(mission.routePoints.map(p=>new THREE.Vector3(...p)),false,'catmullrom',.5);
    this.length=this.route.getLength();this.signals=[];this.otherTrains=[];this.platformTargets=[];this.tunnel=mission.tunnel||null;
    this.textures={
      grass:noiseTexture(['#42573b','#536c48','#617b50','#3f5438']),
      ballast:noiseTexture(['#696a68','#7a7770','#5b5d5b','#85817a'],256,16),
      asphalt:noiseTexture(['#2c3033','#34383b','#262a2c']),
      concrete:noiseTexture(['#a5a6a1','#b5b3aa','#969892'],256,8)
    };
    this.textures.grass.repeat.set(18,18);this.textures.ballast.repeat.set(4,25);this.textures.asphalt.repeat.set(3,12);this.textures.concrete.repeat.set(4,20);
    this.materials={
      grass:mat(0xffffff,1,0,this.textures.grass),ballast:mat(0xffffff,1,0,this.textures.ballast),asphalt:mat(0xffffff,.94,0,this.textures.asphalt),
      concrete:mat(0xffffff,.95,0,this.textures.concrete),rail:mat(0x737b80,.28,.82),sleeper:mat(0x4b4138,.96),metal:mat(0x43494d,.62,.35),
      wire:mat(0x222629,.5,.72),dark:mat(0x111518,.65,.18),glass:new THREE.MeshPhysicalMaterial({color:0x7996a5,roughness:.12,transmission:.2,transparent:true,opacity:.62,metalness:0}),
      platformEdge:mat(0xd7d2c5,.9),roof:mat(0x3a4247,.62,.25),treeTrunk:mat(0x5d432f,1),leaf:mat(0x355633,1)
    };
    this.setupLighting();this.buildTrack();this.buildEnvironment();this.buildStations();this.buildSignals();this.buildTunnel();this.buildOpposingTraffic();this.buildRain();
  }

  sample(u,offset=0){
    u=clamp(u,0,1);const p=this.route.getPointAt(u);const t=this.route.getTangentAt(u).normalize();const right=new THREE.Vector3(-t.z,0,t.x).normalize();
    if(offset)p.addScaledVector(right,offset);return{p,t,right,yaw:Math.atan2(t.x,t.z)};
  }
  uFromMeters(m){return clamp(m/this.length,0,1)}
  metersAt(u){return clamp(u,0,1)*this.length}
  speedLimit(u){let v=this.mission.speedZones[0][1];for(const [zu,zv] of this.mission.speedZones)if(u>=zu)v=zv;return v}
  gradient(u){let g=0;for(const [gu,gv] of (this.mission.gradients||[]))if(u>=gu)g=gv;return g}
  zone(u){for(const [a,b,z] of this.mission.environment)if(u>=a&&u<b)return z;return 'country'}
  inTunnel(u){return !!this.tunnel&&u>=this.tunnel[0]&&u<=this.tunnel[1]}

  setupLighting(){
    const isNight=this.mission.weather==='night';
    this.scene.fog=new THREE.FogExp2(isNight?0x0b1320:0xa8bbc5,isNight?.0022:this.mission.weather==='rain'?.0021:.00105);
    const sky=new Sky();sky.scale.setScalar(450000);this.scene.add(sky);this.sky=sky;
    const u=sky.material.uniforms;u.turbidity.value=this.mission.weather==='rain'?12:6;u.rayleigh.value=isNight?.2:2.2;u.mieCoefficient.value=.008;u.mieDirectionalG.value=.82;
    const sunPos=new THREE.Vector3();const phi=THREE.MathUtils.degToRad(isNight?94:this.mission.weather==='rain'?72:54);const theta=THREE.MathUtils.degToRad(180);sunPos.setFromSphericalCoords(1,phi,theta);u.sunPosition.value.copy(sunPos);
    this.hemi=new THREE.HemisphereLight(isNight?0x36415b:0xdceeff,isNight?0x050608:0x36452f,isNight?.35:1.7);this.scene.add(this.hemi);
    this.sun=new THREE.DirectionalLight(isNight?0x8da0c7:0xffefd2,isNight?.25:this.mission.weather==='rain'?.9:3.1);this.sun.position.set(-80,120,110);this.sun.castShadow=!isNight;this.sun.shadow.mapSize.set(2048,2048);this.sun.shadow.camera.left=-80;this.sun.shadow.camera.right=80;this.sun.shadow.camera.top=80;this.sun.shadow.camera.bottom=-80;this.scene.add(this.sun);
    this.scene.background=new THREE.Color(isNight?0x07101c:this.mission.weather==='rain'?0x7e909b:0xaec6d3);
    this.scene.environment=null;
  }

  buildTrack(){
    const sleeperGeo=new THREE.BoxGeometry(2.65,.16,.27),railGeo=new THREE.BoxGeometry(.095,.14,5.8),ballastGeo=new THREE.BoxGeometry(4.5,.22,6),poleGeo=new THREE.BoxGeometry(.16,7,.16),armGeo=new THREE.BoxGeometry(9.5,.12,.12);
    for(let i=0;i<1500;i++){
      const u=i/1499,{p,t,right,yaw}=this.sample(u);
      if(i%2===0){const s=mesh(sleeperGeo,this.materials.sleeper,this.group);s.position.set(p.x,.04,p.z);s.rotation.y=yaw;}
      if(i%7===0){const b=mesh(ballastGeo,this.materials.ballast,this.group,false,true);b.position.set(p.x,-.11,p.z);b.rotation.y=yaw;}
      if(i%3===0)for(const off of[-.76,.76]){const q=p.clone().addScaledVector(right,off);const r=mesh(railGeo,this.materials.rail,this.group);r.position.set(q.x,.16,q.z);r.rotation.y=yaw;}
      // second running line
      if(i%3===0)for(const off of[4.55-0.76,4.55+0.76]){const q=p.clone().addScaledVector(right,off);const r=mesh(railGeo,this.materials.rail,this.group);r.position.set(q.x,.16,q.z);r.rotation.y=yaw;}
      if(i%2===0){const q=p.clone().addScaledVector(right,4.55);const s=mesh(sleeperGeo,this.materials.sleeper,this.group);s.position.set(q.x,.04,q.z);s.rotation.y=yaw;}
      if(i%26===0){for(const side of[-1,1]){const q=p.clone().addScaledVector(right,side<0?-4.2:8.4);const pole=mesh(poleGeo,this.materials.metal,this.group);pole.position.set(q.x,3.5,q.z);pole.rotation.y=yaw;}const q=p.clone().addScaledVector(right,2.1);const arm=mesh(armGeo,this.materials.metal,this.group);arm.position.set(q.x,6.85,q.z);arm.rotation.y=yaw;}
      if(i%14===0){for(const lineOff of[0,4.55]){const q=p.clone().addScaledVector(right,lineOff);const wire=box(this.group,q.x,6.35,q.z,.027,.027,17,this.materials.wire);wire.rotation.y=yaw;}}
    }
    // ground ribbon tiles
    for(let i=0;i<120;i++){const u=i/119,{p,yaw}=this.sample(u);const g=box(this.group,p.x,-.62,p.z,160,.9,160,this.materials.grass);g.rotation.y=yaw;}
  }

  makeTree(pos,scale=1){const g=new THREE.Group();box(g,0,1.15,0,.32*scale,2.3*scale,.32*scale,this.materials.treeTrunk);const crown=mesh(new THREE.ConeGeometry(1.35*scale,4.2*scale,9),this.materials.leaf,g);crown.position.y=3.75*scale;g.position.copy(pos);this.group.add(g);return g;}
  makeBuilding(pos,yaw,kind='suburb'){
    const g=new THREE.Group();const dense=kind==='dense'||kind==='urban';const w=dense?8+Math.random()*12:6+Math.random()*5;const d=dense?12+Math.random()*18:8+Math.random()*6;const h=dense?10+Math.random()*24:5+Math.random()*5;
    const wall=mat(dense?[0xb0ada6,0x918d87,0xc1b7a7,0xa5abb0][Math.floor(Math.random()*4)]:[0xc2b7a6,0xb2a58f,0xc7c0b3][Math.floor(Math.random()*3)],.92);
    box(g,0,h/2,0,w,h,d,wall);
    const roof=box(g,0,h+.2,0,w+.25,.35,d+.25,mat(0x46413e,.9));
    const winMat=new THREE.MeshStandardMaterial({color:0x7391a0,roughness:.18,emissive:this.mission.weather==='night'?0x5b5127:0x0b1b22,emissiveIntensity:this.mission.weather==='night'?1.2:.15});
    const rows=Math.min(7,Math.max(1,Math.floor(h/3)));for(let r=0;r<rows;r++)for(let c=-1;c<=1;c++){const wx=c*w*.25;const wy=2.1+r*2.7;box(g,wx,wy,-d/2-.03,Math.min(1.4,w*.17),1.35,.08,winMat);}
    g.position.copy(pos);g.rotation.y=yaw;this.group.add(g);return g;
  }
  makeRoad(u,side,offset){const {p,t,right,yaw}=this.sample(u);const q=p.clone().addScaledVector(right,offset*side);const r=box(this.group,q.x,.015,q.z,7,.09,240,this.materials.asphalt);r.rotation.y=yaw;for(let k=-4;k<=4;k++){const car=box(this.group,q.x+right.x*(k%2?1.5:-1.5),.6,q.z+t.z*k*24,1.75,1.1,4.1,mat([0x8d3030,0x315b7c,0xbbb7ad,0x272727][Math.abs(k)%4],.48,.08));car.rotation.y=yaw;} }
  buildEnvironment(){
    for(let i=8;i<300;i++){const u=i/305;const {p,right,yaw}=this.sample(u);const zone=this.zone(u);for(const side of[-1,1]){if(Math.random()>.62)continue;const lateral=(zone==='dense'?11:14)+Math.random()*(zone==='country'?52:35);const q=p.clone().addScaledVector(right,side*lateral);if(zone==='wood'||zone==='country'){this.makeTree(q,.7+Math.random()*1.2);if(Math.random()<.45){const q2=q.clone().addScaledVector(right,side*(3+Math.random()*7));this.makeTree(q2,.6+Math.random());}}else if(zone==='depot'){if(Math.random()<.55){const shed=this.makeBuilding(q,yaw,'suburb');shed.scale.y=.6;}else this.makeTree(q,.7);}else{this.makeBuilding(q,yaw,zone);}}
    }
    for(const [u,s,o] of [[.08,1,20],[.19,-1,22],[.48,1,24],[.63,-1,19],[.86,1,21]])this.makeRoad(u,s,o);
  }

  makeStationLabel(text){const c=document.createElement('canvas');c.width=512;c.height=128;const x=c.getContext('2d');x.fillStyle='#153b76';x.fillRect(0,0,c.width,c.height);x.strokeStyle='#fff';x.lineWidth=7;x.strokeRect(7,7,c.width-14,c.height-14);x.fillStyle='#fff';x.font='700 42px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText(text,256,64);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshBasicMaterial({map:t});}
  buildStations(){
    for(const st of this.mission.stations){const {p,t,right,yaw}=this.sample(st.u);for(const side of[-1,1]){const lineOffset=side<0?-3.3:7.9;const q=p.clone().addScaledVector(right,lineOffset);const platform=box(this.group,q.x,.34,q.z,3.0,.68,190,this.materials.concrete);platform.rotation.y=yaw;const edge=box(this.group,q.x-right.x*side*1.25,.72,q.z-right.z*side*1.25,.42,.08,188,this.materials.platformEdge);edge.rotation.y=yaw;const canopy=box(this.group,q.x,3.65,q.z,2.5,.18,110,this.materials.roof);canopy.rotation.y=yaw;for(let k=-48;k<=48;k+=16){const q2=q.clone().addScaledVector(t,k);const post=box(this.group,q2.x,2,q2.z,.12,4,.12,this.materials.metal);post.rotation.y=yaw;if(k%32===0){const light=box(this.group,q2.x,3.35,q2.z,.75,.08,.22,new THREE.MeshStandardMaterial({color:0xfff7d7,emissive:0xffe9ad,emissiveIntensity:this.mission.weather==='night'?3:1}));light.rotation.y=yaw;}}}
      const signPos=p.clone().addScaledVector(right,st.platformSide==='left'?-4.1:3.0).addScaledVector(t,14);const sign=mesh(new THREE.PlaneGeometry(3.2,.8),this.makeStationLabel(st.name),this.group,false,false);sign.position.set(signPos.x,2.6,signPos.z);sign.rotation.y=yaw+(st.platformSide==='left'?Math.PI:0);
      const target=p.clone().addScaledVector(right,st.platformSide==='left'?-2.1:2.1);const marker=box(this.group,target.x,1.2,target.z,.12,2.4,.12,this.materials.metal);const board=box(this.group,target.x,2.35,target.z,.9,.62,.08,mat(0xf3f3ee,.7));board.rotation.y=yaw;this.platformTargets.push({station:st,p:p.clone()});
    }
  }

  buildSignals(){
    const us=[];for(let u=.075;u<.97;u+=.09)us.push(u);
    us.forEach((u,i)=>{const {p,right,yaw}=this.sample(u);const q=p.clone().addScaledVector(right,2.65);const g=new THREE.Group();g.position.copy(q);g.rotation.y=yaw;this.group.add(g);box(g,0,1.65,0,.13,3.3,.13,this.materials.metal);box(g,0,3.35,0,.64,1.5,.34,this.materials.dark);const lamps=[];for(let k=0;k<3;k++){const lm=new THREE.MeshStandardMaterial({color:0x151515,emissive:0x000000,emissiveIntensity:0});const l=mesh(new THREE.SphereGeometry(.16,18,12),lm,g);l.position.set(0,3.77-k*.42,-.20);lamps.push(l);}const state=i%5===3?'yellow':'green';this.setSignal({lamps},state);this.signals.push({u,lamps,state});});
  }
  setSignal(sig,state){sig.state=state;sig.lamps.forEach(l=>{l.material.color.set(0x141414);l.material.emissive.set(0);l.material.emissiveIntensity=0});const idx=state==='green'?2:state==='yellow'?1:0;const col=state==='green'?0x35ff74:state==='yellow'?0xffc53d:0xff3535;sig.lamps[idx].material.color.set(col);sig.lamps[idx].material.emissive.set(col);sig.lamps[idx].material.emissiveIntensity=4;}
  upcomingSignal(u){return this.signals.find(s=>s.u>u)||null}

  buildTunnel(){if(!this.tunnel)return;for(let i=0;i<70;i++){const u=THREE.MathUtils.lerp(this.tunnel[0],this.tunnel[1],i/69);const {p,yaw}=this.sample(u);const g=new THREE.Group();g.position.copy(p);g.rotation.y=yaw;this.group.add(g);const arc=mesh(new THREE.TorusGeometry(6,.42,8,24,Math.PI),mat(0x55595b,.96),g);arc.rotation.z=Math.PI;box(g,-6,2.7,0,.45,5.4,6,mat(0x55595b,.96));box(g,6,2.7,0,.45,5.4,6,mat(0x55595b,.96));if(i%7===0){for(const s of[-1,1]){const l=box(g,s*4.9,3.3,0,.3,.12,.7,new THREE.MeshStandardMaterial({color:0xfff1c9,emissive:0xffd98d,emissiveIntensity:2.5}));}}}}

  buildOpposingTraffic(){for(const u of[.27,.69]){const g=new THREE.Group();const body=box(g,0,1.75,0,2.85,3.5,24,mat(0xc7cdd0,.45,.25));box(g,0,1.1,-12.1,2.7,1.2,.25,mat(0x2c4c6b,.32,.15));for(const side of[-1,1])for(let z=-9;z<=9;z+=3.2)box(g,side*1.43,2.1,z,.08,1.15,1.9,new THREE.MeshStandardMaterial({color:0x2b4558,emissive:this.mission.weather==='night'?0x10212c:0,emissiveIntensity:.5}));g.userData.u=u;g.userData.speed=70+Math.random()*30;this.group.add(g);this.otherTrains.push(g);}}

  buildRain(){if(this.mission.weather!=='rain'){this.rain=null;return;}const count=2500;const geo=new THREE.BufferGeometry();const p=new Float32Array(count*3);for(let i=0;i<count;i++){p[i*3]=(Math.random()-.5)*80;p[i*3+1]=Math.random()*35;p[i*3+2]=(Math.random()-.5)*100;}geo.setAttribute('position',new THREE.BufferAttribute(p,3));this.rain=mesh(geo,new THREE.PointsMaterial({color:0xc9e5f2,size:.08,transparent:true,opacity:.55}),this.group,false,false);this.rain.frustumCulled=false;}

  update(u,dt,cameraPos){
    for(const train of this.otherTrains){train.userData.u-=dt*train.userData.speed/3.6/this.length;if(train.userData.u<.02)train.userData.u=.98;const {p,t,yaw}=this.sample(train.userData.u,4.55);train.position.copy(p);train.rotation.y=yaw+Math.PI;}
    if(this.rain){this.rain.position.copy(cameraPos);this.rain.position.y-=8;const a=this.rain.geometry.attributes.position.array;for(let i=1;i<a.length;i+=3){a[i]-=dt*28;if(a[i]<0)a[i]=35;}this.rain.geometry.attributes.position.needsUpdate=true;}
  }
  dispose(){this.scene.remove(this.group);this.group.traverse(o=>{if(o.geometry)o.geometry.dispose?.();});}
}
