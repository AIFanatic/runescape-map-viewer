import { StreamBuffer } from "../StreamBuffer";
import { Buffer } from "buffer";

export class ModelHeader {
    public modelData: Buffer;
    public vertexCount: number = 0;
    public triangleCount: number = 0;
    public texturedTriangleCount: number = 0;
    public vertexDirectionOffset: number = 0;
    public xDataOffset: number = 0;
    public yDataOffset: number = 0;
    public zDataOffset: number = 0;
    public vertexSkinOffset: number = 0;
    public triangleDataOffset: number = 0;
    public triangleTypeOffset: number = 0;
    public colorDataOffset: number = 0;
    public texturePointerOffset: number = 0;
    public trianglePriorityOffset: number = 0;
    public triangleAlphaOffset: number = 0;
    public triangleSkinOffset: number = 0;
    public uvMapTriangleOffset: number = 0;

    constructor(buffer: StreamBuffer) {
        buffer.setReaderIndex(buffer.getBuffer().length - 18);
        this.modelData = buffer.getBuffer();
        this.vertexCount = buffer.readUnsignedShortBE();

        this.triangleCount = buffer.readUnsignedShortBE();
        this.texturedTriangleCount = buffer.readUnsignedByte();

        const useTextures: number = buffer.readUnsignedByte();
        const useTrianglePriority: number = buffer.readUnsignedByte();
        const useTransparency: number = buffer.readUnsignedByte();
        const useTriangleSkinning: number = buffer.readUnsignedByte();
        const useVertexSkinning: number = buffer.readUnsignedByte();
        const xDataLength: number = buffer.readUnsignedShortBE();
        const yDataLength: number = buffer.readUnsignedShortBE();
        const zDataLength: number = buffer.readUnsignedShortBE();
        const triangleDataLength: number = buffer.readUnsignedShortBE();
        
        let offset: number = 0;
        this.vertexDirectionOffset = offset;
        offset += this.vertexCount;
        this.triangleTypeOffset = offset;
        offset += this.triangleCount;
        this.trianglePriorityOffset = offset;

        if (useTrianglePriority === 255) offset += this.triangleCount;
        else this.trianglePriorityOffset = -useTrianglePriority - 1;

        this.triangleSkinOffset = offset;
        if (useTriangleSkinning === 1) offset += this.triangleCount;
        else this.triangleSkinOffset = -1;

        this.texturePointerOffset = offset;
        if (useTextures === 1) offset += this.triangleCount;
        else this.texturePointerOffset = -1;

        this.vertexSkinOffset = offset;
        if (useVertexSkinning === 1) offset += this.vertexCount;
        else this.vertexSkinOffset = -1;

        this.triangleAlphaOffset = offset;
        if (useTransparency === 1) offset += this.triangleCount;
        else this.triangleAlphaOffset = -1;

        this.triangleDataOffset = offset;
        offset += triangleDataLength;
        this.colorDataOffset = offset;
        offset += this.triangleCount * 2;
        this.uvMapTriangleOffset = offset;
        offset += this.texturedTriangleCount * 6;
        this.xDataOffset = offset;
        offset += xDataLength;
        this.yDataOffset = offset;
        offset += yDataLength;
        this.zDataOffset = offset;
        offset += zDataLength;
    }
}
