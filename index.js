import * as THREE from "../node_modules/three/build/three.module.js"
import { OrbitControls } from "https://threejs.org/examples/jsm/controls/OrbitControls.js"
import { OBJLoader } from "../node_modules/three/examples/jsm/loaders/OBJLoader.js"
import { MTLLoader } from "../node_modules/three/examples/jsm/loaders/MTLLoader.js"
import { GLTFLoader } from "../node_modules/three/examples/jsm/loaders/GLTFLoader.js"
import { DRACOLoader } from "../node_modules/three/examples/jsm/loaders/DRACOLoader.js"

// Dom Elements
const btnPlay = document.querySelector(".play")
const btnStop = document.querySelector(".stop")
const btnHalt = document.querySelector(".halt")
const btnCustom = document.querySelector(".custom")
const btnCustom2 = document.querySelector(".custom2")
const btnCustom3 = document.querySelector(".custom3")

/**
 * Params
 */

// Animation
let mixer, previousAnimation, activeAction
const sceneList = [0, 3, 7.1, 12.5, 16.3, 20.3, 24.9, 30]
let currentScene = 0
let isCameraMovementLock = false

// GUI
const GUILightParams = {
	intensity: 2,
	x: 0,
	y: 25,
	z: 25,
}

const GUICameraParams = {
	time: 0,
}

/**
 * Gui
 */

const gui = new dat.GUI()

const GUILightFolder = gui.addFolder("Light")
GUILightFolder.add(GUILightParams, "intensity", 0, 3, 0.2).onChange(number => {
	hemiLight.intensity = number
})

GUILightFolder.add(GUILightParams, "x", 0, 30, 0.2).onChange(number => {
	hemiLight.position.x = number
})

GUILightFolder.add(GUILightParams, "y", 0, 30, 0.2).onChange(number => {
	hemiLight.position.y = number
})

GUILightFolder.add(GUILightParams, "z", 0, 30, 0.2).onChange(number => {
	hemiLight.position.z = number
})
GUILightFolder.open()

const GUICameraFolder = gui.addFolder("Camera")
GUICameraFolder.add(GUICameraParams, "time", 0, 30, 0.1).onChange(number => {
	mixer.clipAction(activeAction).time = number
})
GUICameraFolder.open()

// Create a scene, camera and renderer
const scene = new THREE.Scene()
let camera = new THREE.PerspectiveCamera(
	60,
	window.innerWidth / window.innerHeight,
	0.1,
	1000
)

scene.background = new THREE.Color(0x000000)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)

document.body.appendChild(renderer.domElement)

// Load .glb
// Instantiate a loader
const loader = new GLTFLoader()

// Optional: Provide a DRACOLoader instance to decode compressed mesh data
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath("/examples/js/libs/draco/")
loader.setDRACOLoader(dracoLoader)

// Load a glTF resource
loader.load(
	// resource URL
	"/house-isometric.glb",
	// called when the resource is loaded
	function (gltf) {
		// Load the scene and animations
		scene.add(gltf.scene)
		gltf.scene.scale.set(40, 40, 40)
		mixer = new THREE.AnimationMixer(gltf.scene)
		activeAction = gltf.animations[0]
		console.log(mixer.clipAction(activeAction))
		mixer.clipAction(activeAction).play()

		// Pause right after playing - Fix
		requestAnimationFrame(() => (mixer.clipAction(activeAction).paused = true))

		// Assign the loaded camera
		camera = gltf.cameras[0]

		// Controlls
		btnPlay.addEventListener("click", e => {})

		btnStop.addEventListener("click", e => {
			mixer.clipAction(activeAction).paused = !mixer.clipAction(activeAction)
				.paused
		})

		btnHalt.addEventListener("click", e => {
			mixer.clipAction(activeAction).halt(1)
		})

		// Listen to scroll Event
		window.addEventListener("wheel", function (e) {
			if (e.deltaY < 0) {
				// Previous Scene
				changeScene(currentScene - 1, 3)
			} else if (e.deltaY > 0) {
				// Next Scene
				changeScene(currentScene + 1, 3)
			}
		})

		btnCustom3.addEventListener("click", e => {
			// Specific scene
			gsap.to(mixer.clipAction(activeAction), {
				time: 13,
				duration: 3,
			})
		})
	},
	// Called while loading is progressing
	function (xhr) {
		console.log((xhr.loaded / xhr.total) * 100 + "% loaded")
	},
	// Called when loading has errors
	function (error) {
		console.log("An error happened")
	}
)

// Create lights
const hemiLight = new THREE.HemisphereLight(
	0xffeeb1,
	0x080820,
	GUILightParams.intensity
)
hemiLight.position.set(0, 25, 25)
const hemiLightHelper = new THREE.HemisphereLightHelper(hemiLight, 5)
console.log(hemiLight.position.z)

scene.add(hemiLight, hemiLightHelper)

/**
 * Camera movement w/ cursor
 */
const cursor = {
	x: 0,
	y: 0,
}

const sizes = {
	width: window.innerWidth,
	height: window.innerHeight,
}

window.addEventListener("mousemove", event => {
	cursor.x = event.clientX / sizes.width - 0.5
	cursor.y = event.clientY / sizes.height - 0.5

	// 0.05 = sensibility, 1.57 is the default x axis for this camera
	camera.position.x = -cursor.x * 0.05
	camera.position.z = -cursor.y * 0.05
	console.log(camera.position.x, camera.position.y, camera.position.z)
})

// Loop render
const clock = new THREE.Clock()
function animate() {
	requestAnimationFrame(animate)
	var delta = clock.getDelta()

	if (mixer) mixer.update(delta)
	renderer.render(scene, camera)
}
animate()

// ??
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()

const helper = new THREE.CameraHelper(camera)
scene.add(helper)

// Change the scene
function changeScene(newSceneNumber, duration) {
	// Guard
	if (
		newSceneNumber < 0 ||
		newSceneNumber >= sceneList.length ||
		isCameraMovementLock
	)
		return console.log("changeScene Guard")

	isCameraMovementLock = true
	gsap.to(mixer.clipAction(activeAction), {
		time: sceneList[newSceneNumber],
		duration: duration,
		onComplete: () => (isCameraMovementLock = false),
	})
	currentScene = newSceneNumber
}

// resize
window.addEventListener("resize", onWindowResize)
function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight
	camera.updateProjectionMatrix()

	renderer.setSize(window.innerWidth, window.innerHeight)

	render()
}

function render() {
	renderer.render(scene, camera)
}

// Temp
