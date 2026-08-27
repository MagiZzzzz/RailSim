import * as THREE from 'three';

const mk=(c,r=.55,m=.15)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});
const bodyMat=mk(0xd7dbdd,.42,.3),blueMat=mk(0x315a7d,.38,.25),dark=mk(0x171c20,.45,.3),roof=mk(0x5c6266,.55,.32),doorMat=mk(0x436f90,.4,.25);
const glass=new THREE.MeshStandardMaterial({color:0x203c50,roughness:.12,metalness:.05,transparent:true,opacity:.88,emissive:0x07131b,emissiveIntensity:.4});
function box(parent,x,y,z,w,h,d,mat){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}

function makeCar(index,total){const g=new THREE.Group();const len=index===0||index===total-1?16.5:15.5;box(g,0,2.25,0,2.92,3.9,len,bodyMat);box(g,0,3.95,0,2.72,.32,len-.3,roof);box(g,0,1.0,0,2.96,.65,len,blueMat);
  for(const side of[-1,1]){for(let z=-len/2+2;z<len/2-1.5;z+=2.4){if(Math.abs(z)<1.1)continue;box(g,side*1.475,2.55,z,.055,1.25,1.55,glass);}for(const dz of[-2.6,2.6])box(g,side*1.48,2.0,dz,.065,2.6,1.15,doorMat);}
  for(const z of[-len/2+2.1,len/2-2.1]){const bogie=new THREE.Group();bogie.position.z=z;g.add(bogie);box(bogie,0,.55,0,2.25,.45,2.1,dark);for(const x of[-.9,.9])for(const zz of[-.62,.62]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.32,.32,.16,20),dark);w.position.set(x,.42,zz);w.rotation.z=Math.PI/2;bogie.add(w);}}
  if(index===0||index===total-1){const frontZ=index===0?-len/2:len/2;box(g,0,2.2,frontZ+(index===0?-.08:.08),2.6,3.2,.20,dark);box(g,0,2.75,frontZ+(index===0?-.2:.2),2.25,1.05,.08,glass);for(const x of[-.75,.75]){const lm=new THREE.MeshStandardMaterial({color:0xfff5ce,emissive:0xffe7a5,emissiveIntensity:3});box(g,x,1.45,frontZ+(index===0?-.22:.22),.22,.18,.07,lm);}}
  return{group:g,length:len};
}

export function buildTrainModel(scene){const root=new THREE.Group();scene.add(root);const count=6,cars=[];for(let i=0;i<count;i++){const c=makeCar(i,count);root.add(c.group);cars.push(c);}return{
  root,cars,
  update(world,u){let back=0;for(let i=0;i<cars.length;i++){const center=back+cars[i].length/2;const cu=Math.max(.001,u-center/world.length);const s=world.sample(cu);cars[i].group.position.copy(s.p);cars[i].group.rotation.y=s.yaw;back+=cars[i].length+.55;}},
  setVisible(v){root.visible=v;}
};}
