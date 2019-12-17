//
// faciticles
//

import '../scss/style.scss';
import * as THREE from 'three';
import * as dat from 'dat.gui';
import * as controls from 'three-orbit-controls';
import * as util from './modules/util';

const gui = new dat.GUI();
const OrbitControls = controls.default(THREE);

(function () {
  const CANVAS_SIZE = { w: 80, h: 60 };
  const VIEWING_ANGLE = 75;
  const BASE_POSITION = [0, 0, 0];
  const GRID_SIZE = 10;
  const CAMERA_DISTANCE = 600;
  const SIZE = 1000;
  const CIRCLE_SIZE = 100;
  const CONVERGENCE_COEFFICIENT = 7;


  let video, canvas, canvasCtx;
  let threeCore = {
    scene: [],
    camera: [],
    renderer: [],
    material: [],
    floor: [],
    directionalLight: [],
    ambientLight: []
  }
  let renderer, material, floor, directionalLight, ambientLight;
  let boxes;
  let initialized = false;
  let imageMatrix;
  let timer = 0;
  let animSeed = { circ: 0, circMax: 360 };
  let speed = 1;
  let size = 1;

  //
  let guiControl = function () {
    this.speed = 0;
    this.size = 1;
  };

  let control = new guiControl();
  //gui.add(text, 'noiseStrength').step(5); // Increment amount
  //gui.add(text, 'speed', 0, 5); // Min and max
  //gui.add(text, 'maxSize').min(0).step(0.25); // Mix and match
  let folder = gui.addFolder('params');
  let self = this;
  folder.add( control, 'speed', -10, 10).onChange(() => { speed = control.speed; });
  folder.add( control, 'size', 1, 10).onChange(() => { size = control.size; });
  //

  function initialize() {
    initCaptureCanvas();
    initStreaming();
    setInterval(()=> {
      capture();
      if (!initialized && imageMatrix.length) {
        initThreeObjects();
      };
      for (let y = 0; y < boxes.length; ++y) {
        for (let x = 0; x < boxes[y].length; ++x) {
          boxes[y][x].layers.r.material.color.setRGB(
            imageMatrix[y][x].r/255,
            imageMatrix[y][x].g/255,
            imageMatrix[y][x].b/255
          );
        }
      }
    }, 30);
  }

  function initCaptureCanvas () {
    canvas = document.createElement('canvas');
    canvas.id = 'canvas';
    canvas.width = CANVAS_SIZE.w;
    canvas.height = CANVAS_SIZE.h;
    document.getElementById('canvasPreview').appendChild(canvas);
  }

  function initStreaming () {
    video = document.getElementById("video");
    const getMedia = navigator.mediaDevices.getUserMedia({
      video: true,
      video: { facingMode: "environment" },
      audio: false
    }).then((stream) => { video.srcObject = stream; });
  }

  function capture (callback) {
    let ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, CANVAS_SIZE.w, CANVAS_SIZE.h);
    let imageData = ctx.getImageData(0, 0, CANVAS_SIZE.w, CANVAS_SIZE.h);
    let width = imageData.width;
    let height = imageData.height;
    let pixels = imageData.data;  // ピクセル配列：RGBA4要素で1ピクセル

    imageMatrix = [];
    for (let y = 0; y < CANVAS_SIZE.h; ++y) {
      imageMatrix[y] = [];
      for (let x = 0; x < CANVAS_SIZE.w; ++x) {
        let base = (y * CANVAS_SIZE.w + x) * 4;
        imageMatrix[y][x] = {
          r: imageData.data[base + 0],
          g: imageData.data[base + 1],
          b: imageData.data[base + 2],
          a: imageData.data[base + 3]
        };
      }
    }
  }

  function initThreeObjects () {
    initialized = true;

    // Scene
    threeCore.scene = new THREE.Scene();

    // Camera // (視野角, アスペクト比, near, far)
    threeCore.camera = new THREE.PerspectiveCamera(
      VIEWING_ANGLE,
      window.innerWidth / window.innerHeight,
      1,
      2400
    );
    threeCore.camera.position.z = CAMERA_DISTANCE;

    // Lights
    ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    threeCore.scene.add(ambientLight);

    // Renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(
      window.innerWidth,
      window.innerHeight
    );
    renderer.shadowMap.enabled = true;

    // Boxes
    boxes = [];//return;
    for (let y = 0; y < imageMatrix.length; ++y) {
      boxes[y] = [];
      for (let x = 0; x < imageMatrix[y].length; ++x) {
        boxes[y][x] = [];
        boxes[y][x].layers = { r: {}, g: {}, b: {}};
        boxes[y][x].layers.r.geometry = new THREE.BoxGeometry( GRID_SIZE, GRID_SIZE, GRID_SIZE);
        boxes[y][x].layers.r.material = new THREE.MeshBasicMaterial( {
          color: new THREE.Color(imageMatrix[y][x].r/255, imageMatrix[y][x].g/255, imageMatrix[y][x].b/255)
          , blending: THREE.AdditiveBlending
        });
        boxes[y][x].layers.r.mesh = new THREE.Mesh( boxes[y][x].layers.r.geometry, boxes[y][x].layers.r.material );
        boxes[y][x].layers.r.mesh.position.set(0,0,0);
        threeCore.scene.add( boxes[y][x].layers.r.mesh );
      }
    }

    // Controls
    // let controls = new OrbitControls(threeCore.camera, renderer.domElement);
    // controls.enableDamping = true;
    // controls.dampingFactor = 0.25;
    // controls.enableZoom = false;

    // Append objects to DOM
    document.getElementById('wrapper').appendChild( renderer.domElement );

    // 10. Run the world
    requestAnimationFrame( run );
  }

  function run () {
    switch (util.getParam('mode')) {
      case 'frenzy':
        timer += 6;
      break;
      default:
        timer += 1;
      break;
    }
    animSeed.circ += 0.02;
    if(animSeed.circ > animSeed.circMax) animSeed.circ = 0;
    const radian = timer/2 * Math.PI / 180;

    // objects

    let targetValue;
    for (let y = 0; y < boxes.length; ++y) {
      for (let x = 0; x < boxes[y].length; ++x) {
        let i = CANVAS_SIZE.w * y + x;//
        let k = (imageMatrix[y][x].r + imageMatrix[y][x].g + imageMatrix[y][x].b)/(255*3);
        switch (util.getParam('mode')) {
          case 'deep':
            targetValue = {
              x: BASE_POSITION[0] + GRID_SIZE * (boxes[y].length/-2 + x),
              y: BASE_POSITION[1] - GRID_SIZE * (boxes.length/-2 + y),
              z: BASE_POSITION[2] - GRID_SIZE * k,
              size: 1,
              cameraY: CAMERA_DISTANCE/5 * Math.sin(radian)
            }
          break;
          case 'frenzy':
            targetValue = {
              x: BASE_POSITION[0] + GRID_SIZE * (boxes[y].length/-2 + x),
              y: BASE_POSITION[1] - GRID_SIZE * (boxes.length/-2 + y),
              z: BASE_POSITION[2] - GRID_SIZE * (k * k) * 100 * speed,
              size: (k * k) + 1,
              cameraY: CAMERA_DISTANCE/5 * Math.sin(radian)
            }
          break;
          case 'cathedral':
            targetValue = {
              x: CAMERA_DISTANCE * 1.2 * (Math.cos(i * CIRCLE_SIZE)),
              y: CAMERA_DISTANCE/800 * (i/CANVAS_SIZE.w * CANVAS_SIZE.h - 0.5) - 1000,
              z: CAMERA_DISTANCE * 1.2 * (Math.sin(i * CIRCLE_SIZE)),
              size: 4 + Math.sin(radian) * size,
              cameraY: CAMERA_DISTANCE * Math.sin(radian)
            }
          break;
          default:
            targetValue = {
              x: BASE_POSITION[0] + GRID_SIZE * (boxes[y].length/-2 + x),
              y: BASE_POSITION[1] - GRID_SIZE * (boxes.length/-2 + y),
              z: 0,
              size: 1,
              cameraY: CAMERA_DISTANCE/5 * Math.sin(radian)
            }
          break;
        }
        boxes[y][x].layers.r.mesh.position.set(
          boxes[y][x].layers.r.mesh.position.x + (targetValue.x - boxes[y][x].layers.r.mesh.position.x)/CONVERGENCE_COEFFICIENT,
          boxes[y][x].layers.r.mesh.position.y + (targetValue.y - boxes[y][x].layers.r.mesh.position.y)/CONVERGENCE_COEFFICIENT,
          boxes[y][x].layers.r.mesh.position.z + (targetValue.z - boxes[y][x].layers.r.mesh.position.z)/CONVERGENCE_COEFFICIENT
        );
        boxes[y][x].layers.r.mesh.scale.set(
          targetValue.size,
          targetValue.size,
          targetValue.size
        );
      }
    }

    // camera
    threeCore.camera.lookAt(new THREE.Vector3(0, 0, 0));
    threeCore.camera.position.x = CAMERA_DISTANCE * Math.cos(radian);
    threeCore.camera.position.y = threeCore.camera.position.y + (targetValue.cameraY - threeCore.camera.position.y)/CONVERGENCE_COEFFICIENT;
    threeCore.camera.position.z = CAMERA_DISTANCE * Math.sin(radian);
    //
    renderer.render( threeCore.scene, threeCore.camera );
    requestAnimationFrame( run );
  }

  window.onload = function() { initialize() };

})();
