import { BackSide, Color, Euler, Float32BufferAttribute, Matrix4, Mesh, MeshBasicMaterial, PlaneGeometry, Scene, Vector3 } from "three";
import { DynamicInstancedMesh } from "./DynamicInstancedMesh";
import { MapObjectDefinition } from "./cache/definitions/MapObjectDefinition";
import { LandscapeObjectDefinition } from "./cache/definitions/LandscapeObjectDefinition";
import { Model } from "./cache/parsers/Model";
import { RS3DModel } from "./RS3DModel";
import { CacheData } from "./CacheData";

import { RequestBuffer } from "./RequestBuffer";
import { CacheIndices } from "./cache/CacheIndices";
import { FloorDefinition } from "./cache/parsers/FloorDefinition";

export interface RegionObject {
    instance: DynamicInstancedMesh;
    instanceId: number;
    modelId: number;
};

export class Region {
    public readonly regionX: number;
    public readonly regionY: number;
    
    private readonly scene: Scene;
    private readonly cache: CacheData;

    public objects: RegionObject[];

    private instancedMeshes: Map<number, DynamicInstancedMesh> = new Map();

    private regionHelper: Mesh;
    private floorMesh: Mesh;

    private requestBuffer: RequestBuffer;

    private vertexHeights: number[][][] | null;
    private overlayFloorIds: number[][][] | null;
    private underlayFloorIds: number[][][] | null;

    constructor(scene: Scene, x: number, y: number, cache: CacheData) {
        this.scene = scene;
        this.regionX = x;
        this.regionY = y;
        this.objects = [];
        this.cache = cache;

        const plane = new PlaneGeometry(64, 64);
        const material = new MeshBasicMaterial({color: 0xff0000, opacity: 0.2, transparent: true});
        this.regionHelper = new Mesh(plane, material);
        this.regionHelper.rotateX(-Math.PI / 2);
        this.regionHelper.position.set(y + 32, 0, x + 32);
        this.regionHelper.scale.set(0.9, 0.9, 0.9);
        // this.scene.add(this.regionHelper);

        this.requestBuffer = new RequestBuffer(0, 50);

        this.vertexHeights = this.loadVertexHeights();
        this.loadObjects(0);
        this.loadFloor(0);
    }

    public static coordinatesToRegionID(x: number, y: number) {
        return (x >> 6) * 256 + (y >> 6);
    }
    
    public static regionIDToPosition(id: number): {x: number, y: number} {
        return {x: (id >> 8) << 6, y: (id & 0xFF) << 6};
    }

    public static coordinatesToRegionBase(x: number, y: number): {x: number, y: number} {
        const regionId = Region.coordinatesToRegionID(x, y);
        return Region.regionIDToPosition(regionId);
    }

    private loadVertexHeights(): number[][][] | null {
        // Used for vertex heights
        function coordinatesToRegionId(x: number, y: number): number {
            return (x >> 6) * 256 + (y >> 6);
        }

        function getChunkTerrainId(cacheIndices: CacheIndices, chunkX: number, chunkY: number): number | null {
            const fileX = Math.floor(chunkX / 8);
            const fileY = Math.floor(chunkY / 8);

            const positionTerrainId = cacheIndices.regId(0, fileX, fileY, 0);
            if (positionTerrainId !== -1) return positionTerrainId;
            
            return null;
        }

        const regionX = this.regionX;
        const regionY = this.regionY;
        const chunkX = this.regionX >> 3;
        const chunkY = this.regionY >> 3;
        const nextTopLeftTileX = regionX - 32;
        const nextTopRightTileY = regionY - 32;
        const regionId = coordinatesToRegionId(this.regionX, this.regionY); // coordinates
        const terrainId = getChunkTerrainId(this.cache.cacheIndices, chunkX, chunkY); // terrainIds
        
        if (terrainId !== -1) {
            const coordinates = [regionId];
            const terrainDataIds = [terrainId];
            this.cache.terrain.calculateTerrainData(chunkX, chunkY, nextTopLeftTileX, nextTopRightTileY, coordinates, terrainDataIds);

            this.overlayFloorIds = this.cache.terrain.overlayFloorIds.slice();
            this.underlayFloorIds = this.cache.terrain.underlayFloorIds.slice();
            return this.cache.terrain.vertexHeights.slice();
        }

        return null;
    }

    private addModelToSceneByMatrix(model: Model, modelId: number, matrix: Matrix4, mapObject: MapObjectDefinition, landscapeObject: LandscapeObjectDefinition) {
        const action = async () => {
            let instancedMesh = this.instancedMeshes.get(modelId);
            if (!instancedMesh) {
                const mesh = RS3DModel.load(model, modelId);
                if (!mesh) return;
    
                const capacity = 10000;
                instancedMesh = new DynamicInstancedMesh(mesh.geometry, mesh.material, capacity);
                instancedMesh.matrixAutoUpdate = false;
                instancedMesh.userData = [];
                this.instancedMeshes.set(modelId, instancedMesh);
                this.scene.add(instancedMesh);
            }
    
            const instanceId = instancedMesh.addInstance(matrix.clone());
            if (instanceId === null) return;
            instancedMesh.instanceMatrix.needsUpdate = true;
            instancedMesh.userData.push({model: model, modelId: modelId, mapObject: mapObject, landscapeObject: landscapeObject});
    
            this.objects.push({
                instance: instancedMesh,
                instanceId: instanceId,
                modelId: modelId
            })
            return;
        }

        this.requestBuffer.addAction(action);
    }

    private loadObjects(level: number) {
        const regionObjects = this.cache.mapRegion.getRegionObjects(this.regionX, this.regionY);

        for (let obj of regionObjects) {
            if (obj.level !== level) continue;

            if (this.cache.landscapeItems.has(obj.objectId)) {
                const def = this.cache.landscapeItems.get(obj.objectId) as LandscapeObjectDefinition;
                const modelId = Model.getModelId(obj.type, def.modelTypes, def.modelIds);

                if (!modelId) {
                    console.warn(`Invalid modelID ${modelId}`);
                    continue;
                }

                // const objs = [1902, 1911, 1912, 980, 837, 1902, 941, 1531, 6966, 1530, 1531, 1533];
                // if (!objs.includes(obj.objectId)) continue;

                // console.log(def)

                let model = this.cache.models.getModel(modelId);
                if (!model) model = this.cache.models.loadModel(modelId);

                let y = obj.level;

                if (this.vertexHeights) {
                    const terrainX = obj.x - (this.regionX-32);
                    const terrainY = obj.y - (this.regionY-32);
                    y = -this.vertexHeights[obj.level][terrainX][terrainY] / 100;
                }

                const matrices = RS3DModel.getRotatedModelMatrices(def, obj);

                for (let matrix of matrices) {
                    matrix.elements[13] = y; // Hacky hacky
                    this.addModelToSceneByMatrix(model, modelId, matrix, Object.assign({}, obj), Object.assign({}, def));
                }
            }
        }
    }

    private getColorForTile(x: number, level: number, y: number, outputColor?: Color): {color: Color, isOverlay: boolean} {
        const color = outputColor ? outputColor : new Color(1, 0, 0);
        if (!this.underlayFloorIds || !this.overlayFloorIds) return {color: color, isOverlay: false};

        const tileId = this.underlayFloorIds[level][x][y] & 255;
        const tile = FloorDefinition.cache[tileId];
        const overlayFloorId = this.overlayFloorIds[level][x][y] & 255;
        const overlayTile = FloorDefinition.cache[overlayFloorId - 1];
        color.set(tile.rgbColor);

        let isOverlay = false;
        if (tile.textureId !== -1) {
            color.set(1,0,1);
        }
        if (overlayTile) {
            isOverlay = true;
            color.set(overlayTile.rgbColor);
            if (overlayTile.textureId !== -1) {
                color.set(1,0,1);
            }
        }

        return {color: color, isOverlay: isOverlay};
    }

    private loadFloor(level: number) {
        if (this.vertexHeights === null || this.underlayFloorIds === null || this.overlayFloorIds === null) return;

        const material = new MeshBasicMaterial({vertexColors: true, side: BackSide })

        const size = 64;
        const segments = size - 1;
        let geometry = new PlaneGeometry(size, size, segments, segments);
        const positions: number[] = [];

        for (let i = 0; i < size * size; i++) {
            const x = i % size;
            const y = Math.floor(i / size);
            const value = -this.vertexHeights[level][x + 32][y + 32] / 100;
            positions.push(x, y, value);
        }

        // console.log(positions.length)

        const tileColor = new Color();
        let colors: number[] = [];
        for (let i = 0; i < size * size; i++) {
            const x = i % segments;
            const y = Math.floor(i / segments);
            
            tileColor.set(0,0,0);
            this.getColorForTile(x + 32, level, y + 32, tileColor);

            // const t = new Color();
            // const t0 = new Color();
            // const t1 = new Color();
            // const t2 = new Color();
            // const t3 = new Color();
            // const t4 = new Color();
            // const t5 = new Color();
            // const {color, isOverlay} = this.getColorForTile(x + 32, level, y + 32, t);
            
            // this.getColorForTile(x + 32 - 1, level, y + 32, t0);
            // this.getColorForTile(x + 32 + 1, level, y + 32, t1);
            // this.getColorForTile(x + 32, level, y + 32 - 1, t2);
            // this.getColorForTile(x + 32, level, y + 32 + 1, t3);
            // this.getColorForTile(x + 32 - 1, level, y + 32 - 1, t4);
            // this.getColorForTile(x + 32 + 1, level, y + 32 + 1, t5);

            // tileColor.r = (t.r + t0.r + t1.r + t2.r + t3.r + t4.r + t5.r) / 7;
            // tileColor.g = (t.g + t0.g + t1.g + t2.g + t3.g + t4.g + t5.g) / 7;
            // tileColor.b = (t.b + t0.b + t1.b + t2.b + t3.b + t4.b + t5.b) / 7;

            // if (isOverlay) tileColor.set(color);

            colors.push(tileColor.r, tileColor.g, tileColor.b);
            colors.push(tileColor.r, tileColor.g, tileColor.b);
            colors.push(tileColor.r, tileColor.g, tileColor.b);

            colors.push(tileColor.r, tileColor.g, tileColor.b);
            colors.push(tileColor.r, tileColor.g, tileColor.b);
            colors.push(tileColor.r, tileColor.g, tileColor.b);
        }

        geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
        const nonIndexedGeometry = geometry.toNonIndexed();
        nonIndexedGeometry.setAttribute("color", new Float32BufferAttribute(colors, 3))

        this.floorMesh = new Mesh(nonIndexedGeometry, material);
        this.floorMesh.rotateX(-Math.PI / 2);
        this.floorMesh.rotateZ(-Math.PI / 2);
        this.floorMesh.position.set(this.regionY - 0.5, 0, this.regionX - 0.5);

        this.scene.add(this.floorMesh);
    }

    public unload() {
        this.requestBuffer.clear();

        for (let [modelId, instancedMesh] of this.instancedMeshes) {
            const action = async () => {
                this.scene.remove(instancedMesh);
                instancedMesh.dispose();
                return;
            }
            this.requestBuffer.addAction(action);
        }
        
        this.scene.remove(this.regionHelper);
        this.regionHelper.geometry.dispose();
        this.regionHelper.material.dispose();

        this.scene.remove(this.floorMesh);
        this.floorMesh.geometry.dispose();
        this.floorMesh.material.dispose();

        this.requestBuffer.run();

        this.cache.mapRegion.deleteRegionObjects(this.regionX, this.regionY)
    }

    public color() {
        for (let i = this.objects.length - 1; i >= 0; i--) {
            const instance = this.objects[i];
            instance.instance.setColorAt(instance.instanceId, new Color(0xff0000));
        }
    }
}