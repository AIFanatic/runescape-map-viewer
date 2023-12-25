import { Euler, MathUtils, Mesh, Scene, Vector3 } from "three";
import { CacheData } from "./CacheData";
import { RS3DModel } from "./RS3DModel";
import { Model } from "./cache/parsers/Model";
import { LandscapeObjectDefinition } from "./cache/definitions/LandscapeObjectDefinition";

export class MapImporter {
    private static getMeshFromDefinition(cache: CacheData, def: LandscapeObjectDefinition, type: number): Mesh | null {
        const modelId = Model.getModelId(type, def.modelTypes, def.modelIds);
        if (!modelId) {
            console.log(`Could not find modelId for ${modelId}`);
            return null;
        }

        const model = cache.models.loadModel(modelId);
        if (!model) {
            console.log("no model", modelId)
            return null;
        };
        
        const mesh = RS3DModel.modelToMesh(model, modelId);
        if (!mesh) {
            console.log("no mesh")
            return null;
        };

        return mesh;
    }

    public static async importGenerated(cache: CacheData, scene: Scene) {

        const fileUrl = "./generated/16.csv";
        
        const data = await fetch(fileUrl).then(response => response.text());

        const lines = data.split("\n");
        // const mapSize = Math.floor(Math.sqrt(lines.length)); // Not bullet proof but meh
        const mapSize = 64;
        
        console.log(lines.length)
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            const [objectId, type, face] = line.split(",").map(parseFloat);

            if (objectId === 0) continue;
            
            if (!objectId) {
                console.log("objectId fucked", objectId);
                continue;
            }
            
            const def = cache.landscapeItems.get(objectId);
            if (!def) {
                console.log(`Could not find definition for ${objectId}`);
                continue;
            }
    
            const mesh = MapImporter.getMeshFromDefinition(cache, def, type);

            if (mesh === null) continue;
            
            const x = i % mapSize;
            const z = Math.floor(i / mapSize);
            

            const position = new Vector3(z, 0, x); // offsets are wrongly calculated
            const rotation = new Euler(0, 0, 0);
            const scale = new Vector3(0.0079, 0.0079, 0.0079);




            let sizeX = def.sizeX;
            let sizeY = def.sizeY;
            const mirror = (def.rotated) !== ((face > 3));

            if (mirror) {
                scale.z *= -1;
            }
            if (type === 2) {
                const scaleCopy = scale.clone();
                const f = (face + 1) & 3;
    
    
                const rotation2 = rotation.clone();
                
                if (f === 0) rotation2.y += MathUtils.degToRad(90);
                else if (f === 1) rotation2.y += MathUtils.degToRad(180);
                else if (f === 2) rotation2.y += MathUtils.degToRad(90);
    
                // Still fucked
                const face2 = 4 + face;
                if (face2 > 3) {
                    // mirror
                    scale.x *= -1;
                    if (face === 0) {
                        rotation.y += MathUtils.degToRad(180);
                    }
                }
    
                if (def.rotated) {
                    console.log("Here", def)
                    rotation.y += MathUtils.degToRad(180);
                }
    
                // if (f === 0) rotation2.y += MathUtils.degToRad(90);
                // else if (f === 1) rotation2.y += MathUtils.degToRad(180);
                // else if (f === 2) rotation2.y += MathUtils.degToRad(90);
                // if (f === 3) rotation2.y += MathUtils.degToRad(45);
    
                const meshClone = mesh.clone();
                meshClone.scale.copy(scale);
                meshClone.rotation.copy(rotation);
                meshClone.position.set(position.x + 3200, 0, position.z + 3200);

                scene.add(meshClone);
            }
            else if (type === 6) {
                // console.log(type, face)
                rotation.y += MathUtils.degToRad(-45);
                if (face === 1) {
                    position.x -= 0.5;
                    position.z -= 0.5;
                }
            }
            else if (type === 7) {
                rotation.y += MathUtils.degToRad(45 * 3);
                // console.log(type, face)
                if (face == 0) {
                    position.x += 0.35;
                    position.z -= 0.35;
                }
                else if (face == 1) {
                    position.x += 0.35;
                    position.z += 0.35;
                }
                else if (face == 2) {
                    position.x -= 0.35;
                    position.z += 0.35;
                }
                else if (face == 3) {
                    position.x -= 0.35;
                    position.z -= 0.35;
                }
            }
            else if (type === 10 || type === 11) {
                if (face === 1 || face === 3) {
                    sizeX = def.sizeY;
                    sizeY = def.sizeX;
                } else {
                    sizeX = def.sizeX;
                    sizeY = def.sizeY;
                }
            }
            else if (type === 22) {
            }
    
            const offsetX = sizeY > 1 ? (sizeY / 2) - 0.5 : 0;
            const offsetZ = sizeX > 1 ? (sizeX / 2) - 0.5 : 0;
            // console.log(sizeX, sizeY, offsetX, offsetZ)
            position.x += offsetX;
            position.z += offsetZ;
    
            if (face === 0) rotation.y += MathUtils.degToRad(-90);
            else if (face === 1) rotation.y += MathUtils.degToRad(180);
            else if (face === 2) rotation.y += MathUtils.degToRad(90);





            mesh.scale.copy(scale);
            mesh.rotation.copy(rotation);
            mesh.position.set(position.x + 3200, 0, position.z + 3200);

            scene.add(mesh);
        }
    }

    // public static async importGenerated(cache: CacheData, scene: Scene) {

    //     const fileUrl = "./generated/11.csv";
        
    //     const response = await fetch(fileUrl);
    //     if (response.status !== 200) throw Error(`${fileUrl} returned [${response.status}]: ${response.statusText}`)

    //     const data = await response.text();
    //     const lines = data.split("\n");
    //     const mapSize = Math.floor(Math.sqrt(lines.length)); // Not bullet proof but meh
        
    //     function addModel(x: number, y: number, modelId: number, type: number, rotation: number) {
    //         if (modelId === 0) return;

            
    //         if (!modelId) {
    //             console.log("modelId fucked", modelId);
    //             return;
    //         }
            
    //         const model = cache.models.loadModel(modelId);
    //         if (!model) {
    //             console.log("no model", modelId)
    //             return;
    //         };
            
    //         const mesh = RS3DModel.modelToMesh(model, modelId);
    //         if (!mesh) {
    //             console.log("no mesh")
    //             return;
    //         };
            
    //         // console.log(x, y, modelId, type, rotation, mesh);
    //         mesh.scale.set(0.0079, 0.0079, 0.0079);
    //         mesh.position.set(x + 3200, 0, y + 3200);

    //         scene.add(mesh);
    //     }

    //     for (let i = 0; i < lines.length; i++) {
    //         const line = lines[i];

    //         const x = i % mapSize;
    //         const y = Math.floor(i / mapSize);

    //         // Multi
    //         const a = line.split(",");
    //         const b = a.splice(0, 3);
            
    //         {
    //             const [modelId, type, rotation] = a.map(parseFloat);
    //             addModel(x, y, modelId, type, rotation);
    //         }

    //         {
    //             const [modelId, type, rotation] = b.map(parseFloat);
    //             addModel(x, y, modelId, type, rotation);
    //         }
            
    //     }
    // }
}