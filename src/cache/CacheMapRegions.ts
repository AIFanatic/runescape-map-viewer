import { StreamBuffer } from "./StreamBuffer";
import { MapRegionIndex } from "./CacheIndices";
import { ClientData } from "./ClientData";
import { MapObjectDefinition } from "./definitions/MapObjectDefinition";

// export class MapRegionTile {

//     public bridge: boolean;
//     public nonWalkable: boolean;

//     public constructor(public x: number, public y: number, public level: number, public flags: number) {
//         this.bridge = (flags & 0x2) == 0x2;
//         this.nonWalkable = (flags & 0x1) == 0x1;
//     }

// }

export class CacheMapRegions {

    private landScapeBuffers: {[key: string]: StreamBuffer};
    private mapObjectListByCoords: {[key: string]: MapObjectDefinition[]};

    public constructor() {
        this.landScapeBuffers = {};
        this.mapObjectListByCoords = {};

    }

    public parseMapRegions(mapRegionIndices: MapRegionIndex[], gameCache: ClientData): void {
        console.info('Parsing map regions...');

        mapRegionIndices.forEach(mapRegionIndex => {
            const mapRegionX = ((mapRegionIndex.id >> 8) & 0xff) * 64;
            const mapRegionY = (mapRegionIndex.id & 0xff) * 64;
            // const mapRegionBuffer = gameCache.unzip(gameCache.getCacheFile(4, mapRegionIndex.mapRegionFileId));
            const landscapeBuffer = gameCache.unzip(gameCache.getCacheFile(4, mapRegionIndex.landscapeFileId));

            const landscapeKey = `${mapRegionX}.${mapRegionY}`;
            this.landScapeBuffers[landscapeKey] = landscapeBuffer;
        });

        // console.info(`Parsed ${this._mapRegionTileList.length} map region tiles and ${this._mapObjectList.length} landscape objects.`);
    }

    public getRegionObjects(mapRegionX: number, mapRegionY: number): MapObjectDefinition[] {
        const landscapeKey = `${mapRegionX}.${mapRegionY}`;
        if (this.mapObjectListByCoords[landscapeKey]) {
            return this.mapObjectListByCoords[landscapeKey];
        }

        const buffer = this.landScapeBuffers[landscapeKey];
        buffer.setReaderIndex(0);

        let objectId = -1;

        while(true) {
            const objectIdOffset = buffer.readSmart();

            if(objectIdOffset === 0) {
                break;
            }

            objectId += objectIdOffset;
            let objectPositionInfo = 0;

            while(true) {
                const objectPositionInfoOffset = buffer.readSmart();

                if(objectPositionInfoOffset === 0) {
                    break;
                }

                objectPositionInfo += objectPositionInfoOffset - 1;

                const x = ((objectPositionInfo >> 6 & 0x3f) + mapRegionX);
                const y = ((objectPositionInfo & 0x3f) + mapRegionY);
                const level = objectPositionInfo >> 12;
                const objectMetadata = buffer.readUnsignedByte();
                const type = objectMetadata >> 2;
                const rotation = objectMetadata & 3;

                if (!this.mapObjectListByCoords[landscapeKey]) {
                    this.mapObjectListByCoords[landscapeKey] = [];
                }
                this.mapObjectListByCoords[landscapeKey].push({ objectId, x, y, level, type, rotation });
            }
        }
        return this.mapObjectListByCoords[landscapeKey];
    }

    public deleteRegionObjects(mapRegionX: number, mapRegionY: number): boolean {
        const landscapeKey = `${mapRegionX}.${mapRegionY}`;
        return delete this.mapObjectListByCoords[landscapeKey];
    }
}
