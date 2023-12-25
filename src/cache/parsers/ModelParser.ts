import { CacheArchive } from "../CacheArchive";
import { ClientData } from "../ClientData";
import { Buffer } from "buffer";
import { StreamBuffer } from "../StreamBuffer";
import { ModelHeader } from "./ModelHeader";
import { Model } from "./Model";

export const getRgbLookupTableId: number[] = Array(0x10000).fill(0);

function method502(i: number, d: number): number {
    let d1: number = (i >> 16) / 256.0;
    let d2: number = (i >> 8 & 255) / 256.0;
    let d3: number = (i & 255) / 256.0;
    d1 = Math.pow(d1, d);
    d2 = Math.pow(d2, d);
    d3 = Math.pow(d3, d);
    const j: number = (((d1 * 256.0) as number) | 0);
    const k: number = (((d2 * 256.0) as number) | 0);
    const l: number = (((d3 * 256.0) as number) | 0);
    return (j << 16) + (k << 8) + l;
}

function method501(d: number) {
    d += Math.random() * 0.03 - 0.015;
    let index: number = 0;
    for (let j: number = 0; j < 512; j++) {{
        const d1: number = ((j / 8 | 0)) / 64.0 + 0.0078125;
        const d2: number = (j & 7) / 8.0 + 0.0625;
        for (let j1: number = 0; j1 < 128; j1++) {{
            const d3: number = j1 / 128.0;
            let d4: number = d3;
            let d5: number = d3;
            let d6: number = d3;
            if (d2 !== 0.0) {
                let d7: number;
                if (d3 < 0.5) { d7 = d3 * (1.0 + d2); } else { d7 = (d3 + d2) - d3 * d2; }
                const d8: number = 2.0 * d3 - d7;
                let d9: number = d1 + 0.3333333333333333;
                if (d9 > 1.0) { d9--; }
                const d10: number = d1;
                let d11: number = d1 - 0.3333333333333333;
                if (d11 < 0.0) { d11++; }
                if (6.0 * d9 < 1.0) { d4 = d8 + (d7 - d8) * 6.0 * d9; } else if (2.0 * d9 < 1.0) { d4 = d7; } else if (3.0 * d9 < 2.0) { d4 = d8 + (d7 - d8) * (0.6666666666666666 - d9) * 6.0; } else { d4 = d8; }
                if (6.0 * d10 < 1.0) { d5 = d8 + (d7 - d8) * 6.0 * d10; } else if (2.0 * d10 < 1.0) { d5 = d7; } else if (3.0 * d10 < 2.0) { d5 = d8 + (d7 - d8) * (0.6666666666666666 - d10) * 6.0; } else { d5 = d8; }
                if (6.0 * d11 < 1.0) { d6 = d8 + (d7 - d8) * 6.0 * d11; } else if (2.0 * d11 < 1.0) { d6 = d7; } else if (3.0 * d11 < 2.0) { d6 = d8 + (d7 - d8) * (0.6666666666666666 - d11) * 6.0; } else { d6 = d8; }
            }
            const k1: number = (((d4 * 256.0) as number) | 0);
            const l1: number = (((d5 * 256.0) as number) | 0);
            const i2: number = (((d6 * 256.0) as number) | 0);
            let j2: number = (k1 << 16) + (l1 << 8) + i2;
            j2 = method502(j2, d);
            if (j2 === 0) { j2 = 1; }
            getRgbLookupTableId[index++] = j2;
        }}
    }}
}

method501(0.8);

export class ModelParser {
    private readonly models: Map<number, Model> = new Map();

    private versionListArchive: CacheArchive;
    private gameCache: ClientData;
    private modelIndex: Buffer;

    constructor(versionListArchive: CacheArchive, gameCache: ClientData) {
        this.versionListArchive = versionListArchive;
        this.gameCache = gameCache;

        const modelIndexStreamBuffer: StreamBuffer = versionListArchive.getFileData('model_index') as StreamBuffer;
        const modelIndex = modelIndexStreamBuffer.getBuffer();
        this.modelIndex = modelIndex;
        
        const fileRequestCount = modelIndex.length;

        for (let i: number = 0; i < fileRequestCount; i++) {
            const id: number = ModelParser.modelId(modelIndex, i);
            if ((id & 1) !== 0) {
                const modelId = i;
                if (this.models.has(modelId)) {
                    console.log(modelId);
                    throw Error("Duplicate model?");
                }

                const model = this.loadModel(modelId);

                this.models.set(modelId, model);
            }
        }
    }

    public getModelId(id: number): number {
        return ModelParser.modelId(this.modelIndex, id);
    }
    
    public loadModel(modelId: number): Model {
        if (this.models.has(modelId)) return this.models.get(modelId) as Model;
        const modelCacheFileZipped = this.gameCache.getCacheFile(1, modelId);
        const modelDataBuffer = this.gameCache.unzip(modelCacheFileZipped);
        const modelHeader = new ModelHeader(modelDataBuffer);
        const model = new Model(modelHeader);
        this.models.set(modelId, model);
        return model;
    }

    private static modelId(modelIndex: Buffer, model: number): number {
        return modelIndex[model] & 255;
    }

    public getModel(modelId: number): Model | undefined {
        return this.models.get(modelId);
    }

    public static modelToObj(model: Model): {material: string, object: string} {
        if (model.triangleHSLA.length === 0) {
            model.applyLighting(84, 768, -50, -10, -50, true);
            // console.log("modelToObj", model.verticesNormal)
        }
        // function dumpTexture(textureId: number) {
        //     const canvas = document.createElement("canvas");
        //     canvas.id = `${textureId}`;
        //     canvas.width = 128;
        //     canvas.height = 128;
        //     document.body.appendChild(canvas);
        //     const ctx = canvas.getContext("2d");
            
        //     const texture = Rasterizer3D.textureImages[textureId];
        //     for (let y = 0; y < 128; y++) {
        //         for (let x = 0; x < 128; x++) {
        //             const index = y * 128 + x;
        //             const palletId = texture.pixels[index];
        //             const pixel = texture.palette[palletId];

        //             const pixelRGB = {
        //                 r: (pixel >> 16) & 255,
        //                 g: (pixel >> 8) & 255,
        //                 b: pixel & 255
        //             }
        //             ctx.fillStyle = `rgb(${pixelRGB.r},${pixelRGB.g},${pixelRGB.b})`
        //             ctx.fillRect(x, y, 1, 1);
        //         }
        //     }
        // }

        let objStr = ``;
        let mtrStr = ``;

        // Write vertices
        for (let i = 0; i < model.verticesX.length; i++) {
            const x = model.verticesX[i];
            const y = -model.verticesY[i];
            const z = -model.verticesZ[i];
            objStr += `v ${x} ${y} ${z}\n`;
        }

        // Write mtl
        // Faces == trianglePoints?
        // FaceTextures == getFaceTextures
        for (let fi = 0; fi < model.triangleCount; fi++) {
            let drawType: number;
            if (model.texturePoints == null) {
                drawType = 0;
            } else {
                drawType = model.texturePoints[fi] & 3;
            }
            

            mtrStr += `newmtl m${fi}\n`;

            if (drawType === 0 || drawType === 1) {
                // if (drawType === 0) {
                    const pixel = getRgbLookupTableId[model.triangleHSLA[fi]];
                    // const pixel = model.triangleHSLA[fi];
                    const r = (pixel >> 16) & 255;
                    const g = (pixel >> 8) & 255;
                    const b = pixel & 255;
                    mtrStr += `Kd ${r/255} ${g/255} ${b/255}\n`;
                // }
                // else if (drawType === 1) {
                //     const r = (model.triangleHSLA[fi] >> 16) & 255;
                //     const g = (model.triangleHSLB[fi] >> 8) & 255;
                //     const b = model.triangleHSLC[fi] & 255;
                //     mtrStr += `Kd ${r/255} ${g/255} ${b/255}\n`;

                //     console.log(r,g,b)
                // }
            }
            else if (drawType === 2 || drawType === 3) {
                const textureId = model.triangleColorValues[fi];
                // dumpTexture(textureId)
                mtrStr += `map_Kd sprite/${textureId}.png\n`;
            }

            let alpha = 0;
            if (model.triangleAlphaValues) {
                alpha = model.triangleAlphaValues[fi] & 0xFF;
            }

            if (alpha != 0) {
                mtrStr += `d ${alpha / 255}\n`;
            }

            // Face indices
            objStr += `usemtl m${fi}\n`;

            const x = model.trianglePointsX[fi] + 1;
            const y = model.trianglePointsY[fi] + 1;
            const z = model.trianglePointsZ[fi] + 1;

            // f 1/16 7/17 2/18
            objStr += `f ${x}/${fi * 3 + 1} ${y}/${fi * 3 + 2} ${z}/${fi * 3 + 3}\n`;
        }

        return {material: mtrStr, object: objStr};
    }
}