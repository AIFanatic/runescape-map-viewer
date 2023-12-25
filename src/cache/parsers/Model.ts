import { StreamBuffer } from "../StreamBuffer";
import { Buffer } from "buffer";
import { ModelHeader } from "./ModelHeader";

export class VertexNormal {
    public x: number;
    public y: number;
    public z: number;
    public magnitude: number;

    public constructor() {
        if (this.x === undefined) { this.x = 0; }
        if (this.y === undefined) { this.y = 0; }
        if (this.z === undefined) { this.z = 0; }
        if (this.magnitude === undefined) { this.magnitude = 0; }
    }
}


export class Model {
    public header: ModelHeader;

    public triangleHSLA: number[] = [];
    public triangleHSLB: number[] = [];
    public triangleHSLC: number[] = [];
    public texturePoints: number[]  = [];
    public trianglePriorities: number[] = [];
    public triangleAlphaValues: number[] = [];
    public triangleColorValues: number[] = [];
    public anInt1663 = 0;
    public anInt1668 = 0;
    public anInt1669 = 0;
    public anInt1670 = 0;
    public shadowIntensity = 0;
    public maxY = 0;
    public modelHeight = 0;
    public anInt1673 = 0;
    public anInt1674 = 0;
    public anInt1675 = 0;
    public vertexSkins: number[] = [];
    public triangleSkinValues: number[] = [];

    public oneSquareModel = false;
    public vectorSkin = null;
    public triangleSkin = null;
    public aClass40Array1681: VertexNormal[] | null = null;

    public vertexCount: number = 0;
    public triangleCount: number = 0;
    public texturedTriangleCount: number = 0;
    public verticesX: number[] = [];
    public verticesY: number[] = [];
    public verticesZ: number[] = [];
    public trianglePointsX: number[] = [];
    public trianglePointsY: number[] = [];
    public trianglePointsZ: number[] = [];
    public texturedTrianglePointsX: number[] = [];
    public texturedTrianglePointsY: number[] = [];
    public texturedTrianglePointsZ: number[] = [];

    public verticesNormal: VertexNormal[] = [];

    constructor(modelHeader: ModelHeader) {
        this.header = modelHeader;
        this.vertexCount = modelHeader.vertexCount;
        this.triangleCount = modelHeader.triangleCount;
        this.texturedTriangleCount = modelHeader.texturedTriangleCount;
        this.verticesX = new Array(this.vertexCount).fill(0);
        this.verticesY = new Array(this.vertexCount).fill(0);
        this.verticesZ = new Array(this.vertexCount).fill(0);
        this.trianglePointsX = new Array(this.triangleCount).fill(0);
        this.trianglePointsY = new Array(this.triangleCount).fill(0);
        this.trianglePointsZ = new Array(this.triangleCount).fill(0);
        this.texturedTrianglePointsX = new Array(this.texturedTriangleCount).fill(0);
        this.texturedTrianglePointsY = new Array(this.texturedTriangleCount).fill(0);
        this.texturedTrianglePointsZ = new Array(this.texturedTriangleCount).fill(0);
        
        if (modelHeader.vertexSkinOffset >= 0) this.vertexSkins = new Array(this.vertexCount).fill(0);
        if (modelHeader.texturePointerOffset >= 0) this.texturePoints = new Array(this.triangleCount).fill(0);
        
        if (modelHeader.trianglePriorityOffset >= 0) this.trianglePriorities = new Array(this.triangleCount).fill(0);
        else this.anInt1663 = -modelHeader.trianglePriorityOffset - 1;

        if (modelHeader.triangleAlphaOffset >= 0) this.triangleAlphaValues = new Array(this.triangleCount).fill(0);
        if (modelHeader.triangleSkinOffset >= 0) this.triangleSkinValues = new Array(this.triangleCount).fill(0);

        this.triangleColorValues = new Array(this.triangleCount).fill(0);

        const vertexDirectionOffsetBuffer: StreamBuffer = new StreamBuffer(new Buffer(modelHeader.modelData));
        vertexDirectionOffsetBuffer.setReaderIndex(modelHeader.vertexDirectionOffset);
        const xDataOffsetBuffer: StreamBuffer = new StreamBuffer(new Buffer(modelHeader.modelData));
        xDataOffsetBuffer.setReaderIndex(modelHeader.xDataOffset);
        const yDataOffsetBuffer: StreamBuffer = new StreamBuffer(new Buffer(modelHeader.modelData));
        yDataOffsetBuffer.setReaderIndex(modelHeader.yDataOffset);
        const zDataOffsetBuffer: StreamBuffer = new StreamBuffer(new Buffer(modelHeader.modelData));
        zDataOffsetBuffer.setReaderIndex(modelHeader.zDataOffset);
        const vertexSkinOffsetBuffer: StreamBuffer = new StreamBuffer(new Buffer(modelHeader.modelData));
        vertexSkinOffsetBuffer.setReaderIndex(modelHeader.vertexSkinOffset);
        let baseOffsetX: number = 0;
        let baseOffsetY: number = 0;
        let baseOffsetz: number = 0;
        for (let vertex: number = 0; vertex < this.vertexCount; vertex++) {
            const flag: number = vertexDirectionOffsetBuffer.readUnsignedByte();
            let currentOffsetX: number = 0;
            if ((flag & 1) !== 0) {
                currentOffsetX = xDataOffsetBuffer.readSignedSmart(); // getSignedSmart();
            }
            let currentOffsetY: number = 0;
            if ((flag & 2) !== 0) {
                currentOffsetY = yDataOffsetBuffer.readSignedSmart(); // getSignedSmart();
            }
            let currentOffsetZ: number = 0;
            if ((flag & 4) !== 0) {
                currentOffsetZ = zDataOffsetBuffer.readSignedSmart(); // getSignedSmart();
            }
            this.verticesX[vertex] = baseOffsetX + currentOffsetX;
            this.verticesY[vertex] = baseOffsetY + currentOffsetY;
            this.verticesZ[vertex] = baseOffsetz + currentOffsetZ;
            baseOffsetX = this.verticesX[vertex];
            baseOffsetY = this.verticesY[vertex];
            baseOffsetz = this.verticesZ[vertex];
            if (this.vertexSkins.length > 0) {
                this.vertexSkins[vertex] = vertexSkinOffsetBuffer.readUnsignedByte();
            }

        }

        vertexDirectionOffsetBuffer.setReaderIndex(modelHeader.colorDataOffset);
        xDataOffsetBuffer.setReaderIndex(modelHeader.texturePointerOffset);
        yDataOffsetBuffer.setReaderIndex(modelHeader.trianglePriorityOffset);
        zDataOffsetBuffer.setReaderIndex(modelHeader.triangleAlphaOffset);
        vertexSkinOffsetBuffer.setReaderIndex(modelHeader.triangleSkinOffset);
        for (let l1: number = 0; l1 < this.triangleCount; l1++) {
            this.triangleColorValues[l1] = vertexDirectionOffsetBuffer.readUnsignedShortBE();
            if (this.texturePoints.length > 0) this.texturePoints[l1] = xDataOffsetBuffer.readUnsignedByte();
            if (this.trianglePriorities.length > 0) this.trianglePriorities[l1] = yDataOffsetBuffer.readUnsignedByte();
            if (this.triangleAlphaValues.length > 0) this.triangleAlphaValues[l1] = zDataOffsetBuffer.readUnsignedByte();
            if (this.triangleSkinValues.length > 0) this.triangleSkinValues[l1] = vertexSkinOffsetBuffer.readUnsignedByte();
        }

        vertexDirectionOffsetBuffer.setReaderIndex(modelHeader.triangleDataOffset);
        xDataOffsetBuffer.setReaderIndex(modelHeader.triangleTypeOffset);
        let trianglePointOffsetX: number = 0;
        let trianglePointOffsetY: number = 0;
        let trianglePointOffsetZ: number = 0;
        let offset: number = 0;
        for (let triangle: number = 0; triangle < this.triangleCount; triangle++) {
            const type: number = xDataOffsetBuffer.readUnsignedByte();
            if (type === 1) {
                trianglePointOffsetX = vertexDirectionOffsetBuffer.readSignedSmart() + offset;
                offset = trianglePointOffsetX;
                trianglePointOffsetY = vertexDirectionOffsetBuffer.readSignedSmart() + offset;
                offset = trianglePointOffsetY;
                trianglePointOffsetZ = vertexDirectionOffsetBuffer.readSignedSmart() + offset;
                offset = trianglePointOffsetZ;
                this.trianglePointsX[triangle] = trianglePointOffsetX;
                this.trianglePointsY[triangle] = trianglePointOffsetY;
                this.trianglePointsZ[triangle] = trianglePointOffsetZ;
            }
            if (type === 2) {
                trianglePointOffsetY = trianglePointOffsetZ;
                trianglePointOffsetZ = vertexDirectionOffsetBuffer.readSignedSmart() + offset;
                offset = trianglePointOffsetZ;
                this.trianglePointsX[triangle] = trianglePointOffsetX;
                this.trianglePointsY[triangle] = trianglePointOffsetY;
                this.trianglePointsZ[triangle] = trianglePointOffsetZ;
            }
            if (type === 3) {
                trianglePointOffsetX = trianglePointOffsetZ;
                trianglePointOffsetZ = vertexDirectionOffsetBuffer.readSignedSmart() + offset;
                offset = trianglePointOffsetZ;
                this.trianglePointsX[triangle] = trianglePointOffsetX;
                this.trianglePointsY[triangle] = trianglePointOffsetY;
                this.trianglePointsZ[triangle] = trianglePointOffsetZ;
            }
            if (type === 4) {
                const oldTrianglePointOffsetX: number = trianglePointOffsetX;
                trianglePointOffsetX = trianglePointOffsetY;
                trianglePointOffsetY = oldTrianglePointOffsetX;
                trianglePointOffsetZ = vertexDirectionOffsetBuffer.readSignedSmart() + offset;
                offset = trianglePointOffsetZ;
                this.trianglePointsX[triangle] = trianglePointOffsetX;
                this.trianglePointsY[triangle] = trianglePointOffsetY;
                this.trianglePointsZ[triangle] = trianglePointOffsetZ;
            }
        }
        vertexDirectionOffsetBuffer.setReaderIndex(modelHeader.uvMapTriangleOffset);
        for (let triangle: number = 0; triangle < this.texturedTriangleCount; triangle++) {
            {
                this.texturedTrianglePointsX[triangle] = vertexDirectionOffsetBuffer.readUnsignedShortBE();
                this.texturedTrianglePointsY[triangle] = vertexDirectionOffsetBuffer.readUnsignedShortBE();
                this.texturedTrianglePointsZ[triangle] = vertexDirectionOffsetBuffer.readUnsignedShortBE();
            }
        }
    }

    public static method597(i: number, j: number, k: number): number {
        if ((k & 2) === 2) {
            if (j < 0) {
                j = 0;
            } else if (j > 127) {
                j = 127;
            }
            j = 127 - j;
            return j;
        }
        j = (j * (i & 127)) >> 7;
        if (j < 2) {
            j = 2;
        } else if (j > 126) {
            j = 126;
        }
        return (i & 65408) + j;
    }

    public method596(i: number, j: number, k: number, l: number, i1: number) {
        for (let j1: number = 0; j1 < this.triangleCount; j1++) {
            {
                const k1: number = this.trianglePointsX[j1];
                const i2: number = this.trianglePointsY[j1];
                const j2: number = this.trianglePointsZ[j1];
                if (this.texturePoints == null) {
                    const i3: number = this.triangleColorValues[j1];
                    let class40: VertexNormal = this.verticesNormal[k1];
                    let k2: number = i + (((k * class40.x + l * class40.y + i1 * class40.z) / (j * class40.magnitude)) | 0);
                    this.triangleHSLA[j1] = Model.method597(i3, k2, 0);
                    class40 = this.verticesNormal[i2];
                    k2 = i + (((k * class40.x + l * class40.y + i1 * class40.z) / (j * class40.magnitude)) | 0);
                    this.triangleHSLB[j1] = Model.method597(i3, k2, 0);
                    class40 = this.verticesNormal[j2];
                    k2 = i + (((k * class40.x + l * class40.y + i1 * class40.z) / (j * class40.magnitude)) | 0);
                    this.triangleHSLC[j1] = Model.method597(i3, k2, 0);
                } else if ((this.texturePoints[j1] & 1) === 0) {
                    const j3: number = this.triangleColorValues[j1];
                    const k3: number = this.texturePoints[j1];
                    let class40_1: VertexNormal = this.verticesNormal[k1];
                    let l2: number = i + (((k * class40_1.x + l * class40_1.y + i1 * class40_1.z) / (j * class40_1.magnitude)) | 0);
                    this.triangleHSLA[j1] = Model.method597(j3, l2, k3);
                    class40_1 = this.verticesNormal[i2];
                    l2 = i + (((k * class40_1.x + l * class40_1.y + i1 * class40_1.z) / (j * class40_1.magnitude)) | 0);
                    this.triangleHSLB[j1] = Model.method597(j3, l2, k3);
                    class40_1 = this.verticesNormal[j2];
                    l2 = i + (((k * class40_1.x + l * class40_1.y + i1 * class40_1.z) / (j * class40_1.magnitude)) | 0);
                    this.triangleHSLC[j1] = Model.method597(j3, l2, k3);
                }
            }
        }
        this.verticesNormal = [];
        this.aClass40Array1681 = null;
        this.vertexSkins = [];
        this.triangleSkinValues = [];
        if (this.texturePoints.length > 0) {
            for (let l1: number = 0; l1 < this.triangleCount; l1++) {
                if ((this.texturePoints[l1] & 2) === 2) {
                    return;
                }
            }
        }
        this.triangleColorValues = [];
    }

    public calculateDiagonals() {
        this.modelHeight = 0;
        this.shadowIntensity = 0;
        this.maxY = 0;
        for (let vertex: number = 0; vertex < this.vertexCount; vertex++) {
            {
                const vertexX: number = this.verticesX[vertex];
                const vertexY: number = this.verticesY[vertex];
                const vertexZ: number = this.verticesZ[vertex];
                if (-vertexY > this.modelHeight) {
                    this.modelHeight = -vertexY;
                }
                if (vertexY > this.maxY) {
                    this.maxY = vertexY;
                }
                const j1: number = vertexX * vertexX + vertexZ * vertexZ;
                if (j1 > this.shadowIntensity) {
                    this.shadowIntensity = j1;
                }
            }
        }
        this.shadowIntensity = ((Math.sqrt(this.shadowIntensity) + 0.99) as number) | 0;
        this.anInt1674 =
            ((Math.sqrt(this.shadowIntensity * this.shadowIntensity + this.modelHeight * this.modelHeight) + 0.99) as number) | 0;
        this.anInt1673 =
            this.anInt1674 + (((Math.sqrt(this.shadowIntensity * this.shadowIntensity + this.maxY * this.maxY) + 0.99) as number) | 0);
    }

    public method583(i: number) {
        throw Error("method583");

        // this.modelHeight = 0;
        // this.shadowIntensity = 0;
        // this.maxY = 0;
        // let j: number = 32767;
        // let k: number = -32767;
        // let l: number = -32767;
        // let i1: number = 32767;
        // for (let j1: number = 0; j1 < this.vertexCount; j1++) {
        //     {
        //         const k1: number = this.verticesX[j1];
        //         const l1: number = this.verticesY[j1];
        //         const i2: number = this.verticesZ[j1];
        //         if (k1 < j) {
        //             j = k1;
        //         }
        //         if (k1 > k) {
        //             k = k1;
        //         }
        //         if (i2 < i1) {
        //             i1 = i2;
        //         }
        //         if (i2 > l) {
        //             l = i2;
        //         }
        //         if (-l1 > this.modelHeight) {
        //             this.modelHeight = -l1;
        //         }
        //         if (l1 > this.maxY) {
        //             this.maxY = l1;
        //         }
        //         const j2: number = k1 * k1 + i2 * i2;
        //         if (j2 > this.shadowIntensity) {
        //             this.shadowIntensity = j2;
        //         }
        //     }
        // }
        // this.shadowIntensity = (Math.sqrt(this.shadowIntensity) as number) | 0;
        // this.anInt1674 = (Math.sqrt(this.shadowIntensity * this.shadowIntensity + this.modelHeight * this.modelHeight) as number) | 0;
        // this.anInt1673 = this.anInt1674 + ((Math.sqrt(this.shadowIntensity * this.shadowIntensity + this.maxY * this.maxY) as number) | 0);
        // this.anInt1669 = (j << 16) + (k & 65535);
        // this.anInt1670 = (l << 16) + (i1 & 65535);
    }

    public applyLighting(i: number, j: number, k: number, l: number, i1: number, flag: boolean) {
        const j1: number = (Math.sqrt(k * k + l * l + i1 * i1) as number) | 0;
        const k1: number = (j * j1) >> 8;
        if (this.triangleHSLA.length === 0) {
            this.triangleHSLA = new Array(this.triangleCount).fill(0);
            this.triangleHSLB = new Array(this.triangleCount).fill(0);
            this.triangleHSLC = new Array(this.triangleCount).fill(0);
        }
        if (this.verticesNormal.length === 0) {
            this.verticesNormal = new Array(this.vertexCount).fill(0);
            for (let l1: number = 0; l1 < this.vertexCount; l1++) {
                this.verticesNormal[l1] = new VertexNormal();
            }
        }
        for (let i2: number = 0; i2 < this.triangleCount; i2++) {
            {
                const j2: number = this.trianglePointsX[i2];
                const l2: number = this.trianglePointsY[i2];
                const i3: number = this.trianglePointsZ[i2];
                const j3: number = this.verticesX[l2] - this.verticesX[j2];
                const k3: number = this.verticesY[l2] - this.verticesY[j2];
                const l3: number = this.verticesZ[l2] - this.verticesZ[j2];
                const i4: number = this.verticesX[i3] - this.verticesX[j2];
                const j4: number = this.verticesY[i3] - this.verticesY[j2];
                const k4: number = this.verticesZ[i3] - this.verticesZ[j2];
                let l4: number = k3 * k4 - j4 * l3;
                let i5: number = l3 * i4 - k4 * j3;
                let j5: number;
                for (j5 = j3 * j4 - i4 * k3; l4 > 8192 || i5 > 8192 || j5 > 8192 || l4 < -8192 || i5 < -8192 || j5 < -8192; j5 >>= 1) {
                    {
                        l4 >>= 1;
                        i5 >>= 1;
                    }
                }
                let k5: number = (Math.sqrt(l4 * l4 + i5 * i5 + j5 * j5) as number) | 0;
                if (k5 <= 0) {
                    k5 = 1;
                }
                l4 = ((l4 * 256) / k5) | 0;
                i5 = ((i5 * 256) / k5) | 0;
                j5 = ((j5 * 256) / k5) | 0;
                if (this.texturePoints == null || (this.texturePoints[i2] & 1) === 0) {
                    let class40_2: VertexNormal = this.verticesNormal[j2];
                    class40_2.x += l4;
                    class40_2.y += i5;
                    class40_2.z += j5;
                    class40_2.magnitude++;
                    class40_2 = this.verticesNormal[l2];
                    class40_2.x += l4;
                    class40_2.y += i5;
                    class40_2.z += j5;
                    class40_2.magnitude++;
                    class40_2 = this.verticesNormal[i3];
                    class40_2.x += l4;
                    class40_2.y += i5;
                    class40_2.z += j5;
                    class40_2.magnitude++;
                } else {
                    const l5: number = i + (((k * l4 + l * i5 + i1 * j5) / (k1 + ((k1 / 2) | 0))) | 0);
                    this.triangleHSLA[i2] = Model.method597(this.triangleColorValues[i2], l5, this.texturePoints[i2]);
                }
            }
        }
        if (flag) {
            this.method596(i, k1, k, l, i1);
        } else {
            this.aClass40Array1681 = new Array(this.vertexCount).fill(null);
            for (let k2: number = 0; k2 < this.vertexCount; k2++) {
                {
                    const class40: VertexNormal = this.verticesNormal[k2];
                    const class40_1: VertexNormal = (this.aClass40Array1681[k2] = new VertexNormal());
                    class40_1.x = class40.x;
                    class40_1.y = class40.y;
                    class40_1.z = class40.z;
                    class40_1.magnitude = class40.magnitude;
                }
            }
            this.anInt1668 = (i << 16) + (k1 & 65535);
        }
        if (flag) {
            this.calculateDiagonals();
            return;
        } else {
            this.method583(426);
            return;
        }
    }

    public static getModelId(type: number, types: number[], models: number[]): number {
        if (models.length === 1) return models[0];
        else if (types) return models[types.indexOf(type)] & 65535;
        return models[0];
    }
}