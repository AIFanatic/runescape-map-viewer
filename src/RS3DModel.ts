import { BufferAttribute, BufferGeometry, ClampToEdgeWrapping, DoubleSide, Euler, Float32BufferAttribute, MathUtils, Matrix4, Mesh, MeshBasicMaterial, MeshPhongMaterial, NoColorSpace, Quaternion, RepeatWrapping, SRGBColorSpace, Texture, TextureLoader, Vector3 } from "three";
import { Model } from "./cache/parsers/Model";
import { ModelParser } from "./cache/parsers/ModelParser";
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { LandscapeObjectDefinition } from "./cache/definitions/LandscapeObjectDefinition";
import { MapObjectDefinition } from "./cache/definitions/MapObjectDefinition";
import { CacheData } from "./CacheData";

// const maxTextures = 120;
// const textures: Texture[] = new Array(maxTextures);
// const texturesMaterial: MeshBasicMaterial[] = new Array(maxTextures);
// const textureLoader = new TextureLoader();
// for (let i = 0; i < maxTextures; i++) {
//     textureLoader.load(`./sprite/${i}.png`, texture => {
//         texture.wrapS = RepeatWrapping;
//         texture.wrapT = RepeatWrapping;
//         texture.colorSpace = SRGBColorSpace;
//         texture.matrixAutoUpdate = false;
//         textures[i] = texture;

//         const mat = new MeshBasicMaterial({map: texture});
//         texturesMaterial[i] = mat;
//     })
// }

const modelCache = {};

const vertexColorMaterial = new MeshBasicMaterial({vertexColors: true, side: DoubleSide});

export class RS3DModel {

    public static getRotatedModelMatrices(def: LandscapeObjectDefinition, object: MapObjectDefinition): Matrix4[] {
        const position = new Vector3(object.y, 0, object.x); // offsets are wrongly calculated
        const rotation = new Euler(0, 0, 0);
        const scale = new Vector3(0.0079, 0.0079, 0.0079);

        let ret: Matrix4[] = [];


        let sizeX = def.sizeX;
        let sizeY = def.sizeY;
        const mirror = (def.rotated) !== ((object.rotation > 3));

        if (mirror) {
            scale.z *= -1;
        }
        if (object.type === 2) {
            const scaleCopy = scale.clone();
            const f = (object.rotation + 1) & 3;


            const rotation2 = rotation.clone();
            
            if (f === 0) rotation2.y += MathUtils.degToRad(90);
            else if (f === 1) rotation2.y += MathUtils.degToRad(180);
            else if (f === 2) rotation2.y += MathUtils.degToRad(90);

            // Still fucked
            const face2 = 4 + object.rotation;
            if (face2 > 3) {
                // mirror
                scale.x *= -1;
                if (object.rotation === 0) {
                    rotation.y += MathUtils.degToRad(180);
                }
            }

            if (def.rotated) {
                rotation.y += MathUtils.degToRad(180);
            }

            const matrix2 = new Matrix4();
            matrix2.compose(position, new Quaternion().setFromEuler(rotation2), scaleCopy);
            ret.push(matrix2);
        }
        else if (object.type === 6) {
            rotation.y += MathUtils.degToRad(-45);
            if (object.rotation === 1) {
                position.x -= 0.5;
                position.z -= 0.5;
            }
        }
        else if (object.type === 7) {
            rotation.y += MathUtils.degToRad(45 * 3);
            if (object.rotation == 0) {
                position.x += 0.35;
                position.z -= 0.35;
            }
            else if (object.rotation == 1) {
                position.x += 0.35;
                position.z += 0.35;
            }
            else if (object.rotation == 2) {
                position.x -= 0.35;
                position.z += 0.35;
            }
            else if (object.rotation == 3) {
                position.x -= 0.35;
                position.z -= 0.35;
            }
        }
        else if (object.type === 10 || object.type === 11) {
            if (object.rotation === 1 || object.rotation === 3) {
                sizeX = def.sizeY;
                sizeY = def.sizeX;
            } else {
                sizeX = def.sizeX;
                sizeY = def.sizeY;
            }
        }
        else if (object.type === 22) {
        }

        const offsetX = sizeY > 1 ? (sizeY / 2) - 0.5 : 0;
        const offsetZ = sizeX > 1 ? (sizeX / 2) - 0.5 : 0;
        position.x += offsetX;
        position.z += offsetZ;

        if (object.rotation === 0) rotation.y += MathUtils.degToRad(-90);
        else if (object.rotation === 1) rotation.y += MathUtils.degToRad(180);
        else if (object.rotation === 2) rotation.y += MathUtils.degToRad(90);

        const matrix = new Matrix4();
        matrix.compose(position, new Quaternion().setFromEuler(rotation), scale);
        ret.push(matrix);

        return ret;
    }

    public static getMeshFromDefinition(cache: CacheData, def: LandscapeObjectDefinition, type: number): Mesh | null {
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
    
    private static calculateUvs(model: Model): number[] {
        const verticesX = model.verticesX;
        const verticesY = model.verticesY;
        const verticesZ = model.verticesZ;
        const texturedTrianglePointsX = model.texturedTrianglePointsX;
        const texturedTrianglePointsY = model.texturedTrianglePointsY;
        const texturedTrianglePointsZ = model.texturedTrianglePointsZ;
    
        let uvs: number[] = [];
    
        for (let i = 0; i < model.texturedTriangleCount; i++) {
            const p = new Vector3(verticesX[texturedTrianglePointsX[i]], verticesY[texturedTrianglePointsX[i]], verticesZ[texturedTrianglePointsX[i]]);
            const m = new Vector3(verticesX[texturedTrianglePointsY[i]], verticesY[texturedTrianglePointsY[i]], verticesZ[texturedTrianglePointsY[i]]);
            const n = new Vector3(verticesX[texturedTrianglePointsZ[i]], verticesY[texturedTrianglePointsZ[i]], verticesZ[texturedTrianglePointsZ[i]]);
    
            const pM = new Vector3().subVectors(m, p);
            const pN = new Vector3().subVectors(n, p);
            const pMxPn = new Vector3().crossVectors(pM, pN);
    
            const uCoordinate = new Vector3().crossVectors(pN, pMxPn);
            const mU = 1.0 / uCoordinate.dot(pM);
    
            const vCoordinate = new Vector3().crossVectors(pM, pMxPn);
            const mV = 1.0 / vCoordinate.dot(pN);
    
            for (let j = 0; j < model.triangleCount; j++) {
                const a = new Vector3(verticesX[model.trianglePointsX[j]], verticesY[model.trianglePointsX[j]], verticesZ[model.trianglePointsX[j]]);
                const b = new Vector3(verticesX[model.trianglePointsY[j]], verticesY[model.trianglePointsY[j]], verticesZ[model.trianglePointsY[j]]);
                const c = new Vector3(verticesX[model.trianglePointsZ[j]], verticesY[model.trianglePointsZ[j]], verticesZ[model.trianglePointsZ[j]]);
    
                const pA = new Vector3().subVectors(a, p);
                const pB = new Vector3().subVectors(b, p);
                const pC = new Vector3().subVectors(c, p);

                const uA = uCoordinate.dot(pA) * mU;
                const uB = uCoordinate.dot(pB) * mU;
                const uC = uCoordinate.dot(pC) * mU;
                
                const vA = vCoordinate.dot(pA) * mV;
                const vB = vCoordinate.dot(pB) * mV;
                const vC = vCoordinate.dot(pC) * mV;
    
                uvs.push(uA, vA, uB, vB, uC, vC);
            }
        }
    
        return uvs
    }

    private static applyVertexColors(geometry: BufferGeometry, faceMaterialIndices: string[], colorMap) {
        const colors = new Float32Array(geometry.attributes.position.count * 3);
        for (let i = 0; i < faceMaterialIndices.length; i++) {
            const faceMaterial = faceMaterialIndices[i];
            const faceColor = colorMap[faceMaterial];
    
            if (!faceColor) continue;
            for (let j = 0; j < 3; j++) { // 3 vertices per face
                colors[i * 9 + j * 3] = faceColor[0];
                colors[i * 9 + j * 3 + 1] = faceColor[1];
                colors[i * 9 + j * 3 + 2] = faceColor[2];
            }
        }
        geometry.setAttribute('color', new BufferAttribute(colors, 3));
    }

    private static parseMtlColors(mtlContent: string) {
        const lines = mtlContent.split('\n');
        const colorMap: {[key: string]: number[]} = {};
    
        let currentMaterial: string | null = null;
        for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            if (parts[0] === 'newmtl') {
                currentMaterial = parts[1];
            } else if (parts[0] === 'Kd' && currentMaterial) {
                colorMap[currentMaterial] = parts.slice(1).map(parseFloat);
            }
            else if (parts[0] === 'map_Kd' && currentMaterial) {
                // colorMap[currentMaterial] = [0.3843137254901961, 0.34509803921568627, 0.34509803921568627].map(parseFloat);
                // colorMap[currentMaterial] = parts[1];
                colorMap[currentMaterial] = [1, 0, 0].map(parseFloat);
            }
        }
    
        return colorMap;
    }

    private static modelToMesh(model: Model, modelId: number): Mesh | null{
        const objModel = ModelParser.modelToObj(model);
        const materialStr = objModel.material;
        const objStr = objModel.object;

        const colorMap = RS3DModel.parseMtlColors(materialStr);
        const lines = objStr.split('\n');
        const faceMaterialIndices: string[] = [];

        let currentMaterial: string | null = null;
        for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            if (parts[0] === 'usemtl') {
                currentMaterial = parts[1];
            } else if (parts[0] === 'f' && currentMaterial) {
                faceMaterialIndices.push(currentMaterial);
            }
        }

        const objLoader = new OBJLoader();
        const group = objLoader.parse(objStr);
        
        let mesh = group.children[0] as Mesh;
        if (!mesh || !mesh.geometry) return null;

        // mesh.geometry = mesh.geometry.center();

        RS3DModel.applyVertexColors(mesh.geometry, faceMaterialIndices, colorMap);
        mesh.material = vertexColorMaterial;
        



        // // TODO: Add textures
        // const uvCoordinates = RS3DModel.calculateUvs(model);

        // // Create a new Float32Array from the UVs array
        // const uvAttribute = new Float32BufferAttribute(uvCoordinates, 2);

        // mesh.geometry.setAttribute("uv", uvAttribute);

        // if (mesh.geometry.groups.length !== Object.keys(colorMap).length) {
        //     throw Error("Groups doesnt match color map length");
        // }

        // let imgToMaterial = {};

        // const colorMapKeys = Object.keys(colorMap);
        // let materials: MeshBasicMaterial[] = [];
        // let groupsToRemove = [];
        // for (let i = 0; i < mesh.geometry.groups.length; i++) {
        //     const color = colorMap[colorMapKeys[i]];

        //     if (color instanceof Array) {
        //         if (!imgToMaterial["vertex"]) {
        //             imgToMaterial["vertex"] = {index: materials.length, material: vertexColorMaterial};
        //             materials.push(vertexColorMaterial);
        //         }
        //         mesh.geometry.groups[i].materialIndex = imgToMaterial["vertex"].index;
        //         groupsToRemove.push(i);
        //     }
        //     else {
        //         if (!imgToMaterial[color]) {
        //             const textureId = parseInt(color.split(".png")[0].split("sprite/")[1]);
        //             // const mat = new MeshBasicMaterial({map: textures[textureId]});
        //             const mat = texturesMaterial[textureId]
        //             imgToMaterial[color] = {index: materials.length, material: mat};
        //             materials.push(mat);
        //         }
        //         mesh.geometry.groups[i].materialIndex = imgToMaterial[color].index;
        //     }
        // }
        
        // mesh.material = materials;

        // if (materials.length > 2) {
        //     console.log(materials)
        // }

        // if (groupsToRemove.length === mesh.geometry.groups.length) {
        //     mesh.material = vertexColorMaterial;
        // }



        return mesh;
    }

    public static load(model: Model, modelId: number): Mesh | null {
        if (modelCache[modelId]) return modelCache[modelId];

        const mesh = RS3DModel.modelToMesh(model, modelId);
        modelCache[modelId] = mesh;

        if (!mesh) return null;

        return mesh;
    }
}