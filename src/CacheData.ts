import { CacheIndices } from "./cache/CacheIndices";
import { CacheMapRegions } from "./cache/CacheMapRegions";
import { ClientData } from "./cache/ClientData";

import { LandscapeObjectDefinition } from "./cache/definitions/LandscapeObjectDefinition";
import { MapObjectDefinition } from "./cache/definitions/MapObjectDefinition";
import { FloorDefinition } from "./cache/parsers/FloorDefinition";
import { ModelParser } from "./cache/parsers/ModelParser";
import { TerrainParser } from "./cache/parsers/TerrainParser";

export class CacheData {
    public onLoaded = () => {};

    public landscapeItems: Map<number, LandscapeObjectDefinition>;
    public mapRegion: CacheMapRegions;
    public models: ModelParser;
    public terrain: TerrainParser;
    public cacheIndices: CacheIndices;

    constructor() {
        const clientData = new ClientData("./cache");
        clientData.onLoaded = () => {
            this.landscapeItems = clientData.landscapeObjectDefinitions;
    
            this.mapRegion = clientData.mapRegions;
            this.models = clientData.models;
            this.terrain = clientData.terrain;
            this.cacheIndices = clientData.cacheIndices;

            FloorDefinition.load(clientData.definitionArchive);

            this.onLoaded();
        }

    }
}