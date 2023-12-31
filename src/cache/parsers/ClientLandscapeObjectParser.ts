import { DefinitionIndex } from "../CacheIndices";
import { CacheArchive } from "../CacheArchive";
import { LandscapeObjectDefinition } from "../definitions/LandscapeObjectDefinition";

export class ClientLandscapeObjectParser {
    public static ParseLandscapeObjectDefinitions(indices: DefinitionIndex[], archive: CacheArchive): Map<number, LandscapeObjectDefinition> {
        const buffer = archive.getFileData('loc.dat');
        if (buffer === null) throw Error("Unable to read loc.dat");

        const landscapeObjectDefinitions: Map<number, LandscapeObjectDefinition> = new Map<number, LandscapeObjectDefinition>();
    
        indices.forEach(cacheIndex => {
            buffer.setReaderIndex(cacheIndex.offset);
    
            let name: string = null;
            let description: string = null;
            let modelIds: number[] = [];
            let modelTypes: number[] = [];
            let sizeX: number = 1;
            let sizeY: number = 1;
            let solid: boolean = true;
            let walkable: boolean = true;
            let hasOptions: boolean = false;
            let options: string[] = null;
            let face: number = 0;
            let translateX: number = 0;
            let translateY: number = 0;
            let translateLevel: number = 0;
            let rotated = false;
    
            while(true) {
                const opcode = buffer.readUnsignedByte();
    
                if(opcode === 0) {
                    break;
                }
    
                switch(opcode) {
                    case 1:
                        const modelCount1 = buffer.readUnsignedByte();
                        for(let modelIdx1 = 0; modelIdx1 < modelCount1; modelIdx1++) {
                            const modelId = buffer.readShortBE(); // model id
                            const modelType = buffer.readByte(); // model type
                            modelIds.push(modelId);
                            modelTypes.push(modelType);
                        }
                        break;
                    case 2:
                        name = buffer.readString();
                        break;
                    case 3:
                        description = buffer.readString();
                        break;
                    case 5:
                        const modelCount2 = buffer.readUnsignedByte();
                        for(let modelIdx2 = 0; modelIdx2 < modelCount2; modelIdx2++) {
                            const modelId = buffer.readShortBE(); // model id
                            modelIds.push(modelId);
                        }
                        modelTypes = null;
                        break;
                    case 14:
                        sizeX = buffer.readUnsignedByte();
                        break;
                    case 15:
                        sizeY = buffer.readUnsignedByte();
                        break;
                    case 17:
                        solid = false;
                        break;
                    case 18:
                        walkable = false;
                        break;
                    case 19:
                        hasOptions = buffer.readUnsignedByte() === 1;
                        options = new Array(9);
                        break;
                    case 21:
                        // adjust to terrain = true
                        break;
                    case 22:
                        // non flat shading = true
                        break;
                    case 23:
                        // ??? some flag set to true
                        break;
                    case 24:
                        buffer.readShortBE(); // animation ID
                        break;
                    case 28:
                        buffer.readByte(); // ???
                        break;
                    case 29:
                        buffer.readByte(); // model light something?
                        break;
                    case 39:
                        buffer.readByte(); // model ambient light?
                        break;
                    case 30:
                    case 31:
                    case 32:
                    case 33:
                    case 34:
                    case 35:
                    case 36:
                    case 37:
                    case 38:
                        if(options === null) {
                            options = new Array(9);
                        }
                        options[opcode - 30] = buffer.readString();
                        break;
                    case 40:
                        const colorCount = buffer.readUnsignedByte();
                        for(let colorIdx = 0; colorIdx < colorCount; colorIdx++) {
                            buffer.readShortBE(); // color being replaced
                            buffer.readShortBE(); // new color
                        }
                        break;
                    case 60:
                        buffer.readShortBE(); // minimap icon id
                        break;
                    case 62:
                        rotated = true;
                        break;
                    case 64:
                        // ??? some flags set to true
                        break;
                    case 65:
                    case 66:
                    case 67:
                        buffer.readShortBE(); // model size x/y/z
                        break;
                    case 68:
                        buffer.readShortBE(); // map scene id
                        break;
                    case 69: // nice
                        face = buffer.readUnsignedByte();
                        break;
                    case 70:
                        translateX = buffer.readShortBE();
                        break;
                    case 71:
                        translateY = buffer.readShortBE();
                        break;
                    case 72:
                        translateLevel = buffer.readShortBE();
                        break;
                    case 73:
                        // ??? some flag set to true
                        break;
                    case 74:
                        // ??? some flag set to true
                        break;
                    case 75:
                        buffer.readUnsignedByte(); // ???
                        break;
                    case 77:
                        buffer.readShortBE(); // varbit id
                        buffer.readShortBE(); // settings id
                        const childrenCount = buffer.readUnsignedByte();
                        for(let childIdx = 0; childIdx < childrenCount; childIdx++) {
                            buffer.readShortBE(); // child id
                        }
                        break;
                }
            }
    
            landscapeObjectDefinitions.set(cacheIndex.id, {
                id: cacheIndex.id,
                name,
                description,
                sizeX,
                sizeY,
                solid,
                walkable,
                rotated,
                hasOptions,
                options,
                face,
                translateX,
                translateY,
                translateLevel,
                modelIds,
                modelTypes
            });
        });
    
        return landscapeObjectDefinitions;
    }
}
