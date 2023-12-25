import { Euler, MathUtils, Matrix4, Mesh, MeshBasicMaterial, Quaternion, Scene, Vector3 } from "three";
import { CacheData } from "./CacheData";
import { MapImporter } from "./MapImporter";
import { Region } from "./Region";
import { Model } from "./cache/parsers/Model";
import { MapScene } from "./MapScene";
import { LandscapeObjectDefinition } from "./cache/definitions/LandscapeObjectDefinition";
import { MapObjectDefinition } from "./cache/definitions/MapObjectDefinition";
import { RS3DModel } from "./RS3DModel";

export class MapExporter {
    public static exportRegions(cache: CacheData) {
        // const position = {x: 3222, y: 0, z: 3222}; // Lumbridge
        const position = {x: 3212, y: 0, z: 3425}; // Varrock

        const regionId = (position.z >> 6) * 256 + (position.x >> 6);
        const targetRegionX = (regionId >> 8) << 6;
        const targetRegionY = (regionId & 0xFF) << 6;

        let map = "x,level,y,objectId,modelId,type,rotation\n";
        const regionSize = 64;
        const regionsAround = 1;
        for (let regionY = targetRegionY - regionSize * regionsAround; regionY <= targetRegionY + regionSize * regionsAround; regionY+=regionSize) {
            for (let regionX = targetRegionX - regionSize * regionsAround; regionX <= targetRegionX + regionSize * regionsAround; regionX+=regionSize) {
                const regionObjects = cache.mapRegion.getRegionObjects(regionX, regionY);
                for (let obj of regionObjects) {
                    const def = cache.landscapeItems.get(obj.objectId);
                    if (def) {
                        const modelId = Model.getModelId(obj.type, def.modelTypes, def.modelIds);
                        if (modelId) {
                            const objKey = `${obj.x},${obj.level},${obj.y},${obj.objectId},${modelId},${obj.type},${obj.rotation}`;
                            map += `${objKey}\n`;
                        }
                    }
                }
            }
        }
        console.log(map)
    }

    public static exportRegionsV2(regions: Region[]) {
        let map = "x,level,y,objectId,modelId,type,rotation\n";
        
        for (let region of regions) {
            for (let object of region.objects) {
                const userData = object.instance.userData[object.instanceId];
                const {model, modelId, mapObject, landscapeObject} = userData;

                // console.log(model, modelId, mapObject, landscapeObject);

                const obj = mapObject;
                const objKey = `${obj.x},${obj.level},${obj.y},${obj.objectId},${modelId},${obj.type},${obj.rotation}`;
                map += `${objKey}\n`;
            }
        }


        // for (let regionY = targetRegionY - regionSize * regionsAround; regionY <= targetRegionY + regionSize * regionsAround; regionY+=regionSize) {
        //     for (let regionX = targetRegionX - regionSize * regionsAround; regionX <= targetRegionX + regionSize * regionsAround; regionX+=regionSize) {
        //         const regionObjects = cache.mapRegion.getRegionObjects(regionX, regionY);
        //         for (let obj of regionObjects) {
        //             const def = cache.landscapeItems.get(obj.objectId);
        //             if (def) {
        //                 const modelId = Model.getModelId(obj.type, def.modelTypes, def.modelIds);
        //                 if (modelId) {
        //                     const objKey = `${obj.x},${obj.level},${obj.y},${obj.objectId},${modelId},${obj.type},${obj.rotation}`;
        //                     map += `${objKey}\n`;
        //                 }
        //             }
        //         }
        //     }
        // }
        console.log(map)
    }

    public static exportArea(cache: CacheData, mapScene: MapScene, startingPoint: {x: number, y: number}, areaSize: number) {
        function insideBox(x: number, y: number, bboxX1: number, bboxY1: number, bboxX2: number, bboxY2: number): boolean {
            return x >= bboxX1 && x <= bboxX2 && y >= bboxY1 && y <= bboxY2;
        }

        let map = "x,level,y,objectId,type,rotation\n";
        
        const from = startingPoint;
        const to = {x: from.x + areaSize, y: from.y + areaSize};
        const fromRegion = Region.coordinatesToRegionBase(from.x, from.y);
        const toRegion = Region.coordinatesToRegionBase(to.x, to.y);

        const filterObjectIds = [1902, 1530];

        let objs = [];
        let objsByCoords = {};

        for (let regionY = fromRegion.y; regionY <= toRegion.y; regionY+=64) {
            for (let regionX = fromRegion.x; regionX <= toRegion.x; regionX+=64) {
                const regionObjects = cache.mapRegion.getRegionObjects(regionX, regionY);
                for (let obj of regionObjects) {
                    if (obj.level !== 0) continue;

                    if (!insideBox(obj.x, obj.y, from.x, from.y, to.x, to.y)) continue;

                    if (filterObjectIds.length > 0 && !filterObjectIds.includes(obj.objectId)) continue;

                    const def = cache.landscapeItems.get(obj.objectId);
                    if (!def) {
                        console.log(`Could not find definition for ${obj.objectId}`);
                        continue;
                    }

                    const matrices = RS3DModel.getRotatedModelMatrices(def, obj);

                    for (let matrix of matrices) {
                        const mesh = RS3DModel.getMeshFromDefinition(cache, def, obj.type);
                        if (mesh === null) continue;

                        mesh.matrix.copy(matrix);
                        mesh.matrixAutoUpdate = false;
                        mapScene.scene.add(mesh);
                        
                        const objKey = `${obj.x},${obj.level},${obj.y},${obj.objectId},${obj.type},${obj.rotation}`;
                        map += `${objKey}\n`;

                        const coordKey = `${obj.x},${obj.level},${obj.y}`;
                        objsByCoords[coordKey] = `${obj.objectId},${obj.type},${obj.rotation}`;
                        objs.push(obj);
                    }
                }
            }
        }

        let m = ``;
        for (let y = 0; y < areaSize; y++) {
            for (let x = 0; x < areaSize; x++) {
                const coordKey = `${x + startingPoint.x},${0},${y + startingPoint.y}`;
                const obj = objsByCoords[coordKey];

                if (obj) {
                    m += `"${obj}",`;
                }
                else {
                    m += `0,`;
                }
            }
            m += "\n";
        }

        console.log(m)

        mapScene.target.set(from.x, 0, from.y);

        console.log(map)
    }
}