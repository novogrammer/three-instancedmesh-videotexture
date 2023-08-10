import './style.scss'
import * as THREE from "three";
import { GroundProjectedSkybox } from 'three/addons/objects/GroundProjectedSkybox.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import {OrbitControls} from "three/addons/controls/OrbitControls.js"

const ORIGINAL_VIDEO_WIDTH=1920;
const ORIGINAL_VIDEO_HEIGHT=1080;
const VIDEO_CAT_URL="./videos/coverr-cat-in-the-grass-9011-1080p.mp4";

const appElement=document.querySelector<HTMLDivElement>('#app')!;
appElement.innerHTML = `
<canvas id="renderCanvas"></canvas>
<video id="videoCat" src="${VIDEO_CAT_URL}" playsInline muted loop autoplay>
`;



interface Size{
  width:number;
  height:number;
};

function getSize():Size{
  const width=appElement.clientWidth;
  const height=appElement.clientHeight;
  return {
    width,
    height,
  }
}


const renderCanvasElement=document.querySelector<HTMLCanvasElement>("#renderCanvas")!;


const scene = new THREE.Scene();
const hdrLoader = new RGBELoader();
hdrLoader.loadAsync( 'textures/equirectangular/blouberg_sunrise_2_1k.hdr' ).then((envMap:THREE.Texture)=>{
  envMap.mapping = THREE.EquirectangularReflectionMapping;
  const skybox=new GroundProjectedSkybox(envMap);
  skybox.scale.setScalar(100);
  skybox.name="Skybox";
  scene.add(skybox);
  scene.environment=envMap;
});

const size=getSize()
const camera = new THREE.PerspectiveCamera( 75, size.width / size.height, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer({
  canvas:renderCanvasElement,
});

camera.position.y = 2;
camera.position.z = 15;

const orbitControls=new OrbitControls(camera,renderer.domElement);
orbitControls.target.set( 0, 2, 0 );
// orbitControls.autoRotate=true;
orbitControls.update();


{
  const geometry = new THREE.BoxGeometry( 1, 1, 1 );
  const attributeUv=geometry.getAttribute("uv");
  for(let i=0;i<attributeUv.count;i+=1){
    const x=attributeUv.getX(i);
    const y=attributeUv.getY(i);
    attributeUv.setXY(i,x*0.5,y*0.5);
  }
  const qty=10*10*10;
  const arrayOffsetUv=new Float32Array(2*qty);
  for(let i=0;i<arrayOffsetUv.length;i+=2){
    arrayOffsetUv[i+0]=Math.floor(Math.random()*2)*0.5;
    arrayOffsetUv[i+1]=Math.floor(Math.random()*2)*0.5;
  }
  const attributeOffsetUv=new THREE.InstancedBufferAttribute(arrayOffsetUv,2);
  geometry.setAttribute("offsetUv",attributeOffsetUv);
  // const videoElement:HTMLVideoElement=document.createElement("video");
  // videoElement.playsInline=true;
  // videoElement.autoplay=true;
  // videoElement.muted=true;
  // videoElement.loop=true;
  // videoElement.src=VIDEO_CAT_URL;
  const videoElement=document.querySelector<HTMLVideoElement>("#videoCat")!;
  const material = new THREE.MeshStandardMaterial({
    map:new THREE.VideoTexture(videoElement),
    metalness:0.5,
    roughness:0,
  });
  material.onBeforeCompile = function ( shader ) {
    // console.log(shader.vertexShader);
    shader.vertexShader = `
    attribute vec2 offsetUv;
    ${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <uv_vertex>',
      `
      #include <uv_vertex>
      #ifdef USE_MAP
      vMapUv += offsetUv;
      #endif
      `
    );

    material.userData.shader = shader;

  };

  const cube = new THREE.InstancedMesh( geometry, material,qty);
  for(let ix=0;ix<10;ix+=1){
    for(let iy=0;iy<10;iy+=1){
      for(let iz=0;iz<10;iz+=1){
        const matrix=new THREE.Matrix4();
        matrix.makeTranslation(ix*2-10,iy*2,iz*2-10);
        cube.setMatrixAt(ix*10*10+iy*10+iz,matrix);
      }
    }

  }
  scene.add( cube );
  cube.position.y=1;
}



function onResize(){
  const size=getSize();
  camera.aspect=size.width / size.height;
  camera.updateProjectionMatrix();
  renderer.setSize(size.width,size.height);
}
window.addEventListener("resize",onResize);
onResize();


function animate() {
	requestAnimationFrame( animate );

	// cube.rotation.x += 0.01;
	// cube.rotation.y += 0.01;
  // orbitControls.update();
	renderer.render( scene, camera );
}

animate();
