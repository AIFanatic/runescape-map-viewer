import { StreamBuffer } from './StreamBuffer';
import { CacheArchive } from './CacheArchive';

export interface DefinitionIndex {
    id: number;
    offset: number;
}

export interface MapRegionIndex {
    id: number;
    mapRegionFileId: number;
    landscapeFileId: number;
    members: boolean;
}

export class CacheIndices {

    private _itemDefinitionIndices: DefinitionIndex[];
    private _npcDefinitionIndices: DefinitionIndex[];
    private _landscapeObjectDefinitionIndices: DefinitionIndex[];
    private _mapRegionIndices: MapRegionIndex[];

    public constructor(private readonly definitionArchive: CacheArchive, private readonly versionListArchive: CacheArchive) {
        this.parseItemDefinitionIndices();
        this.parseNpcDefinitionIndices();
        this.parseLandscapeObjectDefinitionIndices();
        this.parseMapRegionIndices();
    }

    private parseLandscapeObjectDefinitionIndices(): void {
        this._landscapeObjectDefinitionIndices = this.parseDefinitionIndices('loc.idx');
    }

    private parseNpcDefinitionIndices(): void {
        this._npcDefinitionIndices = this.parseDefinitionIndices('npc.idx');
    }

    private parseItemDefinitionIndices(): void {
        this._itemDefinitionIndices = this.parseDefinitionIndices('obj.idx');
    }

    private parseDefinitionIndices(fileName: string): DefinitionIndex[] {
        const buffer: StreamBuffer = this.definitionArchive.getFileData(fileName);
        const indexCount = buffer.readUnsignedShortBE();
        const indices: DefinitionIndex[] = new Array(indexCount);
        let offset = 2;

        for(let id = 0; id < indexCount; id++) {
            indices[id] = { id, offset };
            offset += buffer.readUnsignedShortBE();
        }

        return indices;
    }

    private parseMapRegionIndices(): void {
        const buffer: StreamBuffer = this.versionListArchive.getFileData('map_index');
        const indexCount = Math.floor(buffer.getBuffer().length / 7);
        const indices: MapRegionIndex[] = new Array(indexCount);

        for(let i = 0; i < indexCount; i++) {
            const id = buffer.readUnsignedShortBE();
            const mapRegionFileId = buffer.readUnsignedShortBE();
            const landscapeFileId = buffer.readUnsignedShortBE();
            const members = buffer.readUnsignedByte() === 1;
            indices[i] = { id, mapRegionFileId, landscapeFileId, members };
        }

        this._mapRegionIndices = indices;
    }

    public get itemDefinitionIndices(): DefinitionIndex[] {
        return this._itemDefinitionIndices;
    }

    public get npcDefinitionIndices(): DefinitionIndex[] {
        return this._npcDefinitionIndices;
    }

    public get landscapeObjectDefinitionIndices(): DefinitionIndex[] {
        return this._landscapeObjectDefinitionIndices;
    }

    public get mapRegionIndices(): MapRegionIndex[] {
        return this._mapRegionIndices;
    }

    public regId(i: number, regX: number, regY: number, l: number): number {
        const localRegHash: number = (regX << 8) + regY;
        for (let reg: number = 0; reg < this._mapRegionIndices.length; reg++) {
            if (this._mapRegionIndices[reg].id === localRegHash) {
                if (l === 0) {
                    return this._mapRegionIndices[reg].mapRegionFileId;
                } else {
                    return this._mapRegionIndices[reg].landscapeFileId;
                }
            }
        }
        return -1;
    }
}
