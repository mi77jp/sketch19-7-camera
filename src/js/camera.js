//
// camera
//

import '../scss/style.scss';
import * as THREE from 'three';
import * as dat from 'dat.gui';
//import * as controls from 'three-orbit-controls';
import * as util from './modules/util';
//import { default as videoCapture } from './modules/videoCapture';

const gui = new dat.GUI();
//const OrbitControls = controls.default(THREE);

(function () {
  const SIZE = 2000;// 配置する範囲
  const LENGTH = 1000;// 配置する個数

  const VIDEO_SIZE = { w: 80, h: 60 };
  const VIEWING_ANGLE = 150;
  const BASE_POSITION = [0, 0, 0];
  const GRID_SIZE = 10;
  const CAMERA_DISTANCE = 600;
  const CIRCLE_SIZE = 100;
  const CONVERGENCE_COEFFICIENT = 7;

  let video, canvas, canvasCtx;
  let threeCore = {
    scene: {},
    camera: {},
    renderer: {},
    material: {},
    pGeometry: {},
    vertices: {},
    mesh: {},
    directionalLight: {},
    ambientLight: {}
  }
  let loader;
  let renderer, material, mesh, directionalLight, ambientLight, texture;
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

  function initialize(textureDot) {
    texture = textureDot;
    initCaptureCanvas();
    initStreaming();
    setInterval(()=> {
      capture();
      if (!initialized && imageMatrix.length) {
        initThreeObjects();
      };
      /*
      for (let y = 0; y < boxes.length; ++y) {
        for (let x = 0; x < boxes[y].length; ++x) {
          boxes[y][x].layers.r.material.color.setRGB(
            imageMatrix[y][x].r/255,
            imageMatrix[y][x].g/255,
            imageMatrix[y][x].b/255
          );
        }
      }*/
    }, 30);
  }

  function initStreaming () {
    video = document.getElementById("video");
    navigator.mediaDevices.getUserMedia({
      video: true,
      video: { facingMode: "environment" },
      audio: false
    }).then((stream) => { video.srcObject = stream; });
  }

  function initCaptureCanvas () {
    canvas = document.createElement('canvas');
    canvas.id = 'canvas';
    canvas.width = VIDEO_SIZE.w;
    canvas.height = VIDEO_SIZE.h;
    document.getElementById('canvasPreview').appendChild(canvas);
  }

  function capture (callback) {
    let ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, VIDEO_SIZE.w, VIDEO_SIZE.h);
    let imageData = ctx.getImageData(0, 0, VIDEO_SIZE.w, VIDEO_SIZE.h);
    let width = imageData.width;
    let height = imageData.height;
    let pixels = imageData.data;  // ピクセル配列：RGBA4要素で1ピクセル

    imageMatrix = [];
    for (let y = 0; y < VIDEO_SIZE.h; ++y) {
      imageMatrix[y] = [];
      for (let x = 0; x < VIDEO_SIZE.w; ++x) {
        let base = (y * VIDEO_SIZE.w + x) * 4;
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
    //ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    //threeCore.scene.add(ambientLight);

    // Renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(
      window.innerWidth,
      window.innerHeight
    );
    renderer.shadowMap.enabled = true;

    // Boxes
    /*
    boxes = [];
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
    }*/

    // Particles
    threeCore.pGeometry = new THREE.Geometry();
    material = new THREE.PointsMaterial({
      map: texture,
      size: 8,
      color: 0xFFFFFF,
    });
    mesh = new THREE.Points(threeCore.geometry, material);
    threeCore.vertices = [];
    timer = 0;
    for (let i = 0; i < LENGTH; i++) {
      threeCore.vertices[i] = new THREE.Vector3(
        SIZE * (Math.random() - 0.5),
        SIZE * (Math.random() - 0.5),
        SIZE * (Math.random() - 0.5)
      );
      threeCore.pGeometry.vertices[i] = threeCore.vertices[i];
    }
    threeCore.scene.add(mesh);

    // Controls
    // let controls = new OrbitControls(threeCore.camera, renderer.domElement);
    // controls.enableDamping = true;
    // controls.dampingFactor = 0.25;
    // controls.enableZoom = false;

    // Append objects to DOM
    document.getElementById('wrapper').appendChild( renderer.domElement );

    // 10. Run the world
    //requestAnimationFrame( run );
  }

  function run () {
    threeCore.pGeometry.verticesNeedUpdate = true;
    timer += 1;
    animSeed.circ += 0.02;
    if(animSeed.circ > animSeed.circMax) animSeed.circ = 0;
    const radian = timer/2 * Math.PI / 180;

    let targetValue;
    for (let y = 0; y < boxes.length; ++y) {
      for (let x = 0; x < boxes[y].length; ++x) {
        let i = VIDEO_SIZE.w * y + x;//
        let k = (imageMatrix[y][x].r + imageMatrix[y][x].g + imageMatrix[y][x].b)/(255*3);

        targetValue = {
          x: CAMERA_DISTANCE * 1.2 * (Math.cos(i * CIRCLE_SIZE)),
          y: CAMERA_DISTANCE/800 * (i/VIDEO_SIZE.w * VIDEO_SIZE.h - 0.5) - 1000,
          z: CAMERA_DISTANCE * 1.2 * (Math.sin(i * CIRCLE_SIZE)),
          size: 4 + Math.sin(radian) * size,
          cameraY: CAMERA_DISTANCE * Math.sin(radian)
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
    //threeCore.camera.lookAt(new THREE.Vector3(0, 0, 0));
    //threeCore.camera.position.x = CAMERA_DISTANCE * Math.cos(radian);
    //threeCore.camera.position.y = threeCore.camera.position.y + (targetValue.cameraY - threeCore.camera.position.y)/CONVERGENCE_COEFFICIENT;
    //threeCore.camera.position.z = CAMERA_DISTANCE * Math.sin(radian);
    //
    renderer.render( threeCore.scene, threeCore.camera );
    requestAnimationFrame( run );
  }

  loader = new THREE.TextureLoader();
  loader.load(document.getElementById('particle').getAttribute('src'), texture => {
    initialize(texture);
  });

})();
