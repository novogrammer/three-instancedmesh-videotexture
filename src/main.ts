import './style.scss'
import * as THREE from "three";
import { GroundProjectedSkybox } from 'three/addons/objects/GroundProjectedSkybox.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import {OrbitControls} from "three/addons/controls/OrbitControls.js"

const ORIGINAL_VIDEO_WIDTH=1920;
const ORIGINAL_VIDEO_HEIGHT=1080;
const CUBE_COUNT_X=ORIGINAL_VIDEO_WIDTH/12;
const CUBE_COUNT_Y=ORIGINAL_VIDEO_HEIGHT/12;
const CUBE_LENGTH=0.25;

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

camera.position.y = CUBE_COUNT_Y*CUBE_LENGTH*0.5;
camera.position.z = 20;

const orbitControls=new OrbitControls(camera,renderer.domElement);
orbitControls.target.set( 0, CUBE_COUNT_Y*CUBE_LENGTH*0.5, 0 );
// orbitControls.autoRotate=true;
orbitControls.update();


{
  const geometry = new THREE.BoxGeometry( CUBE_LENGTH, CUBE_LENGTH, CUBE_LENGTH );
  const attributeUv=geometry.getAttribute("uv");
  for(let i=0;i<attributeUv.count;i+=1){
    const x=attributeUv.getX(i)/CUBE_COUNT_X;
    const y=attributeUv.getY(i)/CUBE_COUNT_Y;
    attributeUv.setXY(i,x,y);
  }
  const qty=CUBE_COUNT_X*CUBE_COUNT_Y;
  const arrayOffsetUv=new Float32Array(2*qty);
  for(let iy=0;iy<CUBE_COUNT_Y;iy+=1){
    for(let ix=0;ix<CUBE_COUNT_X;ix+=1){
      const i=(iy*CUBE_COUNT_X+ix)*2;
      arrayOffsetUv[i+0]=ix/CUBE_COUNT_X;
      arrayOffsetUv[i+1]=iy/CUBE_COUNT_Y;
    }
  }

  const attributeOffsetUv=new THREE.InstancedBufferAttribute(arrayOffsetUv,2);
  geometry.setAttribute("offsetUv",attributeOffsetUv);
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
  for(let iy=0;iy<CUBE_COUNT_Y;iy+=1){
    for(let ix=0;ix<CUBE_COUNT_X;ix+=1){
      const matrix=new THREE.Matrix4();

      matrix.makeTranslation((ix-CUBE_COUNT_X*0.5)*CUBE_LENGTH,(iy+0.5)*CUBE_LENGTH,0*CUBE_LENGTH);
      const i=iy*CUBE_COUNT_X+ix;
      cube.setMatrixAt(i,matrix);
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
