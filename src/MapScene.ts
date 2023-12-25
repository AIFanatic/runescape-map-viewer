import { Scene, WebGLRenderer, PerspectiveCamera, PlaneGeometry, MeshStandardMaterial, CanvasTexture, Raycaster, Vector2, Object3D, Color, Euler, Matrix4 } from 'three';
import { Vector3 } from 'three';

import { Mesh } from 'three';

import { AmbientLight, DirectionalLight, InstancedMesh } from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { BetterStats } from './BetterStats';

export class MapScene {
    private canvas: HTMLCanvasElement;

    private renderer: WebGLRenderer;
    private scene: Scene;
    private camera: PerspectiveCamera;
    private controls: OrbitControls;
    private stats: Stats;
    private rendererStats: BetterStats;

    private raycaster: Raycaster;
    private mousePointer: Vector2;
    private shouldRaycast: boolean;
    private pickedObject: { object: InstancedMesh} | null;

    public target;

    constructor(canvas: HTMLCanvasElement, startingPosition: Vector3) {
        this.canvas = canvas;
        this.target = startingPosition;
        this.canvas.width = this.canvas.parentElement.offsetWidth;
        this.canvas.height = this.canvas.parentElement.offsetHeight;
        this.renderer = new WebGLRenderer({ canvas: canvas });
        // this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize(this.canvas.width, this.canvas.height);
        console.log(this.renderer)

        this.scene = new Scene();
        this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100000);
        this.camera.position.z = 5;
        // this.camera.rotateX(-Math.PI / 2);
        // this.camera.rotateZ(-Math.PI / 2);

        this.camera.position.set(this.target.x - 50, this.target.y - 50, this.target.z - 50);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target = this.target;

        const light = new AmbientLight();
        // light.intensity = 0.5
        light.position.set(this.target.x, this.target.y, this.target.z);
        this.scene.add(light);

        const dirLight = new DirectionalLight();
        dirLight.position.set(this.target.x, this.target.y, this.target.z);
        this.scene.add(dirLight);

        this.stats = new Stats();
        document.body.appendChild(this.stats.dom);

        this.rendererStats = new BetterStats(this.renderer);
        document.body.appendChild(this.rendererStats.domElement);

        this.raycaster = new Raycaster();
        this.mousePointer = new Vector2();
        canvas.addEventListener('pointermove', (event) => {
            this.mousePointer.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mousePointer.y = - (event.clientY / window.innerHeight) * 2 + 1;
        });
        canvas.addEventListener("keydown", (event) => { if (event.key === "q") this.shouldRaycast = true });
        canvas.addEventListener("keyup", (event) => {
            if (event.key === "q") {
                this.shouldRaycast = false;
                if (this.pickedObject) {
                    this.pickedObject.object.instanceColor = null;
                }
            }
        });

        this.pickedObject = null;


        window.scene = this.scene;

        this.render();
    }

    public clearScene() {
        let toDelete: InstancedMesh[] = [];
        this.scene.traverse(object => {
            if (object instanceof InstancedMesh) toDelete.push(object);
        })

        this.scene.remove(...toDelete);
    }

    public addHeightmap(vertexHeights: number[][][]) {
        const canvas = document.createElement("canvas");
        document.body.appendChild(canvas);
        canvas.width = 105;
        canvas.height = 105;
        const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

        let max = 0;
        let min = Infinity;
        const points: Vector3[] = [];
        for (let y = 0; y < vertexHeights[0].length; y++) {
            for (let x = 0; x < vertexHeights[0][y].length; x++) {
                const value = vertexHeights[0][y][x];
                // console.log(vertexHeights[0][y][x]);
                points.push(new Vector3(y * 105, -value, x * 105));

                max = Math.max(max, value);
                min = Math.min(min, value);

                const valueInv = value < 0 ? -value : value;
                const valueColor = Math.floor(valueInv / 624 * 255);
                ctx.fillStyle = `rgb(${valueColor}, ${valueColor}, ${valueColor})`;
                ctx.fillRect(x, y, 1, 1);
            }
        }

        const material = new MeshStandardMaterial({ wireframe: true, displacementMap: new CanvasTexture(canvas), displacementScale: 5 });
        const mesh = new Mesh(new PlaneGeometry(104, 104, 104, 104), material);
        mesh.rotateX(-Math.PI / 2);
        mesh.position.set(3168 + 52, 0, 3168 + 52);
        this.scene.add(mesh);
    }

    private render() {
        requestAnimationFrame(() => { this.render() });

        if (this.shouldRaycast) {
            // update the picking ray with the camera and pointer position
            this.raycaster.setFromCamera(this.mousePointer, this.camera);

            // calculate objects intersecting the picking ray
            const intersects = this.raycaster.intersectObjects(this.scene.children);

            if (intersects.length > 0) {
                const intersection = intersects[0];
                const object = intersection.object;

                if (intersection.instanceId === undefined || !(object instanceof InstancedMesh)) return;


                if (!this.pickedObject || this.pickedObject.object !== object) {
                    this.pickedObject = { object: object};

                    object.setColorAt(intersection.instanceId, new Color(0xff0000));
                    console.log("picked new object", intersection.instanceId, this.pickedObject.object.userData[intersection.instanceId])
                }
            }

            this.shouldRaycast = false;
        }

        this.stats.update();
        this.rendererStats.update();

        this.renderer.render(this.scene, this.camera);
    }
}