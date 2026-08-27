import * as THREE from 'three';

function material(color,rough=.65,metal=.08){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});}
function box(parent,x,y,z,w,h,d,mat,rx=0,ry=0,rz=0){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.rotation.set(rx,ry,rz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function cyl(parent,x,y,z,r,h,mat,rx=0,ry=0,rz=0,seg=32){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,seg),mat);m.position.set(x,y,z);m.rotation.set(rx,ry,rz);m.castShadow=true;parent.add(m);return m;}
function canvasPanel(w=512,h=320){const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.minFilter=THREE.LinearFilter;return{c,ctx,tex};}

export function buildCab(camera,mission){
  const cab=new THREE.Group();camera.add(cab);
  const dark=material(0x111417,.48,.2),shell=material(0x2b2f32,.72,.1),shell2=material(0x454b4f,.7,.08),rubber=material(0x07090a,.82,.02),metal=material(0x555d62,.48,.4),desk=material(0x24292c,.58,.14),black=material(0x090b0c,.5,.18);
  const accent=material(0x33434a,.48,.2);
  // cabin shell framing — kept to the periphery of the driver's view
  box(cab,0,2.72,-2.78,5.35,.34,.42,dark);
  box(cab,-2.55,.7,-2.79,.32,4.3,.42,dark,0,0,-.03);
  box(cab,2.55,.7,-2.79,.32,4.3,.42,dark,0,0,.03);
  box(cab,-2.15,-1.25,-2.35,.85,1.9,1.35,shell,0,.09,-.13);
  box(cab,2.15,-1.25,-2.35,.85,1.9,1.35,shell,0,-.09,.13);
  // front console, three-tier Francilien-inspired desk
  box(cab,0,-1.35,-2.12,4.25,.72,1.72,desk,-.03,0,0);
  box(cab,0,-.95,-2.48,3.78,.28,.92,shell2,-.2,0,0);
  box(cab,0,-.72,-2.66,3.2,.18,.55,black,-.35,0,0);
  box(cab,-1.72,-.92,-2.44,.6,.35,.9,shell2,-.19,0,.05);
  box(cab,1.72,-.92,-2.44,.6,.35,.9,shell2,-.19,0,-.05);

  // left main driving display
  const drv=canvasPanel(640,400);const drvMat=new THREE.MeshBasicMaterial({map:drv.tex,toneMapped:false});
  const drvMesh=box(cab,-.72,-.67,-2.66,1.55,.86,.055,drvMat,-.35,0,0);
  // right diagnostic display
  const diag=canvasPanel(560,360);const diagMat=new THREE.MeshBasicMaterial({map:diag.tex,toneMapped:false});
  box(cab,.93,-.69,-2.66,1.42,.79,.055,diagMat,-.35,0,0);

  // physical circular brake gauges
  const gaugeMat=material(0x060708,.4,.2);const faceMat=material(0xf0eee7,.72,.0);
  for(const [x,label] of [[-1.65,'CG'],[1.72,'CF']]){cyl(cab,x,-.61,-2.5,.265,.10,gaugeMat,Math.PI/2,0,0);cyl(cab,x,-.61,-2.555,.215,.018,faceMat,Math.PI/2,0,0);const needle=box(cab,x,-.61,-2.585,.018,.17,.016,material(0xc53232,.4),0,0,0);needle.userData.gauge=label;}

  // master controller and reverser
  const base=box(cab,-.42,-1.0,-1.55,.78,.28,.88,black,-.06,0,0);
  const handlePivot=new THREE.Group();handlePivot.position.set(-.42,-.78,-1.53);cab.add(handlePivot);
  box(handlePivot,0,.1,0,.16,.62,.18,rubber,-.22,0,0);box(handlePivot,0,.42,-.05,.38,.16,.25,rubber,-.22,0,0);
  cyl(cab,.42,-.91,-1.48,.13,.22,metal,Math.PI/2,0,0);box(cab,.42,-.70,-1.49,.08,.36,.08,rubber,-.15,0,0);

  // real-looking push buttons and indicator lamps
  const buttons=[];const buttonRows=[[-1.32,-1.03],[-1.08,-1.03],[1.30,-1.03],[1.55,-1.03],[-1.30,-.81],[1.52,-.81]];
  buttonRows.forEach(([x,y],i)=>{const col=i===2?0xb82424:i===3?0xd1a72d:0xddd8ce;const b=cyl(cab,x,y,-1.78,.075,.055,material(col,.4,.1),Math.PI/2,0,0,24);buttons.push(b)});
  const lamps={};[['doors',-.05],['traction',.18],['brake',.41],['vacma',.64]].forEach(([name,x])=>{const m=new THREE.MeshStandardMaterial({color:0x15191a,emissive:0x000000,emissiveIntensity:0,roughness:.35});const l=cyl(cab,x,-.84,-2.08,.052,.035,m,Math.PI/2,0,0,20);lamps[name]=l;});

  // labels / placards
  const labelCanvas=canvasPanel(1024,256);const lc=labelCanvas.ctx;lc.fillStyle='#181b1d';lc.fillRect(0,0,1024,256);lc.fillStyle='#dedede';lc.font='600 50px Arial';lc.textAlign='center';lc.fillText('Z 50000   •   CABINE CONDUCTEUR',512,78);lc.font='34px Arial';lc.fillStyle='#9ca4a8';lc.fillText('FREIN  •  TRACTION  •  VIGILANCE  •  PORTES',512,150);labelCanvas.tex.needsUpdate=true;box(cab,0,-1.68,-1.65,2.3,.52,.03,new THREE.MeshBasicMaterial({map:labelCanvas.tex,toneMapped:false}),-.04,0,0);

  // side structures and side windows
  box(cab,-2.5,.7,-1.1,.16,3.1,2.9,shell,0,0,0);box(cab,2.5,.7,-1.1,.16,3.1,2.9,shell,0,0,0);
  box(cab,-2.47,1.85,-1.05,.05,.14,2.5,rubber);box(cab,2.47,1.85,-1.05,.05,.14,2.5,rubber);
  // floor edge and ceiling shade
  box(cab,0,-2.13,-1.1,5.0,.25,3.8,shell);box(cab,0,2.55,-1.55,5.0,.22,2.3,shell);
  // windshield panes give reflections without blocking view
  const glass=new THREE.MeshPhysicalMaterial({color:0xa8c0ce,transparent:true,opacity:.055,roughness:.12,metalness:0,transmission:.15,depthWrite:false});
  box(cab,0,.75,-2.86,4.65,3.35,.018,glass);
  // wipers
  const wipers=[];for(const x of[-.72,.72]){const pivot=new THREE.Group();pivot.position.set(x,-.52,-2.92);cab.add(pivot);box(pivot,0,.82,0,.045,1.65,.035,rubber,0,0,x<0?-.34:.34);wipers.push(pivot);}
  // cab light
  const cabLight=new THREE.PointLight(0xffe4b5,mission.weather==='night'?1.1:.15,7,2);cabLight.position.set(0,1.8,-.8);cab.add(cabLight);

  const state={lastSpeed:-1,lastLimit:-1,lastMaster:99,lastPressure:-1,wiperPhase:0};
  function drawDriving(s){
    const {ctx}=drv;ctx.fillStyle='#071115';ctx.fillRect(0,0,640,400);
    ctx.strokeStyle='#25404a';ctx.lineWidth=2;for(let i=0;i<8;i++){ctx.beginPath();ctx.arc(210,210,145-i*2,Math.PI*.72,Math.PI*2.28);ctx.stroke();}
    // speed arc
    for(let v=0;v<=160;v+=10){const a=Math.PI*.72+(v/160)*Math.PI*1.56;const x=210+Math.cos(a)*122,y=210+Math.sin(a)*122;ctx.fillStyle=v>s.limit?'#6b4b3d':'#9db6c0';ctx.font='18px monospace';ctx.textAlign='center';ctx.fillText(v,x,y+6);}
    const a=Math.PI*.72+(Math.min(160,s.speed)/160)*Math.PI*1.56;ctx.strokeStyle='#d9f3ff';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(210,210);ctx.lineTo(210+Math.cos(a)*102,210+Math.sin(a)*102);ctx.stroke();ctx.fillStyle='#d9f3ff';ctx.beginPath();ctx.arc(210,210,10,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#effbff';ctx.font='700 54px monospace';ctx.textAlign='center';ctx.fillText(String(Math.round(s.speed)).padStart(3,'0'),210,270);ctx.font='16px Arial';ctx.fillStyle='#7f9ba8';ctx.fillText('km/h',210,295);
    ctx.fillStyle='#132c36';ctx.fillRect(390,48,190,104);ctx.fillStyle='#7c9aa8';ctx.font='15px Arial';ctx.textAlign='left';ctx.fillText('VITESSE MAX',408,78);ctx.fillStyle=s.speed>s.limit+2?'#ff6767':'#f0f7fa';ctx.font='700 44px monospace';ctx.fillText(String(s.limit).padStart(3,'0'),408,127);
    ctx.fillStyle='#132c36';ctx.fillRect(390,174,190,104);ctx.fillStyle='#7c9aa8';ctx.font='15px Arial';ctx.fillText('EFFORT',408,203);ctx.fillStyle=s.master>0?'#72dfaa':s.master<0?'#efb26f':'#d4dde1';ctx.font='700 30px monospace';ctx.fillText(s.master>0?`T ${s.master}`:s.master<0?`F ${Math.abs(s.master)}`:'NEUTRE',408,247);
    ctx.fillStyle='#7f9ba8';ctx.font='14px Arial';ctx.fillText('PROCHAINE',390,325);ctx.fillStyle='#e8f1f4';ctx.font='700 22px Arial';ctx.fillText((s.next||'TERMINUS').slice(0,18),390,354);ctx.fillStyle='#9db0b8';ctx.font='16px monospace';ctx.fillText(`${Math.max(0,Math.round(s.distance))} m`,390,380);drv.tex.needsUpdate=true;
  }
  function drawDiag(s){
    const {ctx}=diag;ctx.fillStyle='#0b1519';ctx.fillRect(0,0,560,360);ctx.fillStyle='#d7e2e7';ctx.font='700 26px Arial';ctx.fillText('ÉTAT TRAIN',28,44);ctx.fillStyle='#66808d';ctx.font='16px Arial';ctx.fillText('PRESSION CONDUITE GÉNÉRALE',28,86);ctx.fillStyle='#f0f5f6';ctx.font='700 40px monospace';ctx.fillText(`${s.pressure.toFixed(1)} bar`,28,130);ctx.fillStyle='#66808d';ctx.font='16px Arial';ctx.fillText('PORTES',28,185);ctx.fillStyle=s.doors?'#ffb552':'#6bdd9a';ctx.font='700 26px Arial';ctx.fillText(s.doors?'OUVERTES':'FERMÉES',28,219);ctx.fillStyle='#66808d';ctx.font='16px Arial';ctx.fillText('VACMA',28,270);ctx.fillStyle=s.vacma<8?'#ff6c6c':'#74d9a5';ctx.font='700 28px monospace';ctx.fillText(`${Math.ceil(s.vacma)} s`,28,310);ctx.fillStyle='#66808d';ctx.font='16px Arial';ctx.fillText('SERVICE',300,86);ctx.fillStyle='#e7eef1';ctx.font='700 22px Arial';ctx.fillText(mission.service.slice(0,20),300,118);ctx.fillStyle='#66808d';ctx.font='16px Arial';ctx.fillText('PONCTUALITÉ',300,185);ctx.fillStyle=s.delay>30?'#ffb552':'#6bdd9a';ctx.font='700 26px monospace';ctx.fillText(s.delay>0?`+${Math.round(s.delay)} s`:`${Math.round(s.delay)} s`,300,220);diag.tex.needsUpdate=true;
  }
  function setLamp(l,on,color=0x55df91){l.material.color.set(on?color:0x171a1c);l.material.emissive.set(on?color:0x000000);l.material.emissiveIntensity=on?2.5:0;}
  function update(s,dt,time){
    if(Math.abs(s.speed-state.lastSpeed)>.25||s.limit!==state.lastLimit||s.master!==state.lastMaster){drawDriving(s);state.lastSpeed=s.speed;state.lastLimit=s.limit;state.lastMaster=s.master;}
    if(Math.abs(s.pressure-state.lastPressure)>.04||Math.floor(time*2)%2===0){drawDiag(s);state.lastPressure=s.pressure;}
    handlePivot.rotation.x=THREE.MathUtils.lerp(handlePivot.rotation.x,s.master>0?.08+s.master*.09:s.master<0?-.08+s.master*.06:0,.18);
    setLamp(lamps.doors,s.doors,0xf0b34c);setLamp(lamps.traction,s.master>0,0x55df91);setLamp(lamps.brake,s.master<0,0xf0b34c);setLamp(lamps.vacma,s.vacma>6,s.vacma>6?0x55df91:0xff4d4d);
    const rain=mission.weather==='rain';if(rain){state.wiperPhase+=dt*3.1;const ang=Math.sin(state.wiperPhase)*.58;wipers[0].rotation.z=ang;wipers[1].rotation.z=-ang;}else{wipers[0].rotation.z=0;wipers[1].rotation.z=0;}
  }
  drawDriving({speed:0,limit:40,master:0,next:'',distance:0});drawDiag({pressure:5,doors:false,vacma:30,delay:0});
  return{group:cab,update,wipers,handlePivot};
}
