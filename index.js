import * as THREE from "../node_modules/three/build/three.module.js"
import { OrbitControls } from "https://threejs.org/examples/jsm/controls/OrbitControls.js"
import { GLTFLoader } from "../node_modules/three/examples/jsm/loaders/GLTFLoader.js"

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
let mixer, cameraAnimation
const sceneList = [0, 3, 7.1, 12.5, 16.3, 20.3, 24.9, 30]
let currentScene = 0
let isCameraMovementLock = false

const GUICameraParams = {
	time: 0,
}

/**
 * Gui
 */

const gui = new dat.GUI()
const GUILightFolder = gui.addFolder("Light")
const GUICameraFolder = gui.addFolder("Camera")
const GUIRendererFolder = gui.addFolder("renderer")
const GUIAmbiantSubfolder = GUILightFolder.addFolder("Ambient")
const GUIHemiSubfolder = GUILightFolder.addFolder("Hemi")
const GUIDirlightSubfolder = GUILightFolder.addFolder("Dirlight")
GUICameraFolder.open()
GUILightFolder.open()

GUICameraFolder.add(GUICameraParams, "time", 0, 30, 0.1).onChange(number => {
	mixer.clipAction(cameraAnimation).time = number
})

// Create a scene, camera
const scene = new THREE.Scene()
let camera = new THREE.PerspectiveCamera(
	60,
	window.innerWidth / window.innerHeight,
	0.1,
	3000
)
scene.background = new THREE.Color(0xa4c8ff)

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.outputEncoding = THREE.sRGBEncoding
renderer.physicallyCorrectLights = true
renderer.toneMappingExposure = 5
renderer.toneMapping = THREE.ReinhardToneMapping

GUIRendererFolder.add(renderer, "toneMapping", {
	No: THREE.NoToneMapping,
	Linear: THREE.LinearToneMapping,
	Reinhard: THREE.ReinhardToneMapping,
	Cineon: THREE.CineonToneMapping,
	ACESFilmic: THREE.ACESFilmicToneMapping,
}).onFinishChange(() => {
	renderer.toneMapping = Number(renderer.toneMapping)
	updateAllMaterials()
})

GUIRendererFolder.add(renderer, "toneMappingExposure")
	.min(0)
	.max(10)
	.step(0.001)

document.body.appendChild(renderer.domElement)

// Load .glb
// Instantiate a loader
const loader = new GLTFLoader()

// Load a glTF resource
loader.load(
	// resource URL
	"/house-isometric.glb",
	// called when the resource is loaded
	function (gltf) {
		// Load the scene and animations
		scene.add(gltf.scene)
		mixer = new THREE.AnimationMixer(gltf.scene)
		cameraAnimation = gltf.animations[0]
		console.log(mixer.clipAction(cameraAnimation))
		mixer.clipAction(cameraAnimation).play()

		// Pause right after playing - Fix
		requestAnimationFrame(
			() => (mixer.clipAction(cameraAnimation).paused = true)
		)

		// Assign the loaded camera
		camera = gltf.cameras[0]

		// Cast Shadows
		updateAllMaterials()

		// Controlls
		btnPlay.addEventListener("click", e => {})

		btnStop.addEventListener("click", e => {
			mixer.clipAction(cameraAnimation).paused = !mixer.clipAction(
				cameraAnimation
			).paused
		})

		btnHalt.addEventListener("click", e => {
			mixer.clipAction(cameraAnimation).halt(1)
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

		btnCustom.addEventListener("click", e => {
			changeScene(currentScene - 1, 3)
		})

		btnCustom2.addEventListener("click", e => {
			changeScene(currentScene + 1, 3)
		})

		btnCustom3.addEventListener("click", e => {
			// Specific scene
			gsap.to(mixer.clipAction(cameraAnimation), {
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

/**
 * Lights
 */

// Ambient
const AmbientLight = new THREE.AmbientLight(0xa4c8ff, 0.17)
scene.add(AmbientLight)
GUIAmbiantSubfolder.add(AmbientLight, "intensity", 0, 1, 0.01)

// Hemispherical
const hemiLight = new THREE.HemisphereLight(0xa4c8ff, 0xa4c8ff, 0.6)

hemiLight.position.set(0, 50, 0)
scene.add(hemiLight)

const hemiLightHelper = new THREE.HemisphereLightHelper(hemiLight, 10)
//scene.add(hemiLightHelper)
GUIHemiSubfolder.add(hemiLight, "intensity", 0, 3, 0.01)

// Direct
const dirLight = new THREE.DirectionalLight(0xffffff, 1)
dirLight.color.setHSL(0.1, 1, 0.95)
dirLight.position.set(-54, 52, 30)
dirLight.position.multiplyScalar(30)
scene.add(dirLight)

dirLight.castShadow = true

dirLight.shadow.mapSize.width = 2048
dirLight.shadow.mapSize.height = 2048

const d = 50

dirLight.shadow.camera.left = -d
dirLight.shadow.camera.right = d
dirLight.shadow.camera.top = d
dirLight.shadow.camera.bottom = -d

dirLight.shadow.camera.far = 3500
dirLight.shadow.bias = -0.0005

const dirLightHelper = new THREE.DirectionalLightHelper(dirLight, 10)
//scene.add(dirLightHelper)

// GUI
GUIDirlightSubfolder.add(dirLight, "intensity", 0, 3, 0.01)
GUIDirlightSubfolder.add(dirLight.position, "x", -2000, 150, 0.2)
GUIDirlightSubfolder.add(dirLight.position, "y", -200, 2000, 0.2)
GUIDirlightSubfolder.add(dirLight.position, "z", -2000, 2000, 0.2)

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
	gsap.to(mixer.clipAction(cameraAnimation), {
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
onWindowResize()

function render() {
	renderer.render(scene, camera)
}

/**
 * Update all materials
 */
function updateAllMaterials() {
	scene.traverse(child => {
		// Only Meshes
		if (
			child instanceof THREE.Mesh &&
			child.material instanceof THREE.MeshStandardMaterial
		) {
			child.material.needsUpdate = true
			child.castShadow = true
			child.receiveShadow = true
		}
	})
}

// Temp
//const controls = new OrbitControls(camera, renderer.domElement)
camera.position.set(-23, 50, 72)

setInterval(() => {
	//console.log(camera.position)
	console.log("tonemapping", renderer.toneMapping)
	onWindowResize()
}, 500)
