import { Color, Float32BufferAttribute, Mesh, MeshBasicMaterial, MeshPhongMaterial, PlaneGeometry, Vector3 } from "three";
import { CacheData } from "./CacheData";
import { MapScene } from "./MapScene";
import { Region } from "./Region";
import { CacheIndices } from "./cache/CacheIndices";
import { MapExporter } from "./MapExporter";
import { MapImporter } from "./MapImporter";

export class MapViewer {
    private canvas: HTMLCanvasElement;
    private context: WebGL2RenderingContext;
    private cache: CacheData;

    private mapScene: MapScene;

    private currentRegionX: number;
    private currentRegionY: number;

    private loadedRegions: Region[] = [];

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.context = canvas.getContext("webgl2") as WebGL2RenderingContext;

        
        this.cache = new CacheData();
        
        const startingPosition = {x: 3222, y: 3222}; // lumbridge
        // const startingPosition = {x: 3290, y: 3222}; // Al Kharid
        // const startingPosition = {x: 2846, y: 3469}; // White mountains
        // const startingPosition = {x: 3428, y: 3212}; // varrock

        this.mapScene = new MapScene(this.canvas, new Vector3(startingPosition.x, 0, startingPosition.y));

        this.cache.onLoaded = () => {
            // MapImporter.importGenerated(this.cache, this.mapScene.scene);

            // // MapExporter.exportArea(this.cache, {x: 3200, y: 3200}, {x: 3263, y: 3263});
            // // MapExporter.exportArea(this.cache, {x: 3224, y: 3235}, {x: 3234, y: 3243});
            // MapExporter.exportArea(this.cache, this.mapScene, {x: 3136, y: 3328}, 192);
            // MapExporter.exportArea(this.cache, this.mapScene, {x: 3224, y: 3230}, 16);

            // return;

            {
                const regionBase = Region.coordinatesToRegionBase(startingPosition.x, startingPosition.y);
                this.currentRegionX = regionBase.x;
                this.currentRegionY = regionBase.y;
    
                const region = new Region(this.mapScene.scene, this.currentRegionX, this.currentRegionY, this.cache);
                this.loadedRegions.push(region);
            }

            {
                startingPosition.x = 3290;
                startingPosition.y = 3222;

                const regionBase = Region.coordinatesToRegionBase(startingPosition.x, startingPosition.y);
                this.currentRegionX = regionBase.x;
                this.currentRegionY = regionBase.y;
    
                const region = new Region(this.mapScene.scene, this.currentRegionX, this.currentRegionY, this.cache);
                this.loadedRegions.push(region);
            }

            window.MapViewer = this;
            window.loadedRegions = this.loadedRegions;
            // return;


            // setTimeout(() => {
            //     MapExporter.exportRegionsV2(this.loadedRegions);
            // }, 5000);

            setInterval(() => {
                const regionId = (this.mapScene.target.z >> 6) * 256 + (this.mapScene.target.x >> 6);
                const targetRegionX = (regionId >> 8) << 6;
                const targetRegionY = (regionId & 0xFF) << 6;

                let regionsAroundCamera: {regionX: number, regionY: number}[] = [];
                const regionSize = 64;
                for (let regionY = targetRegionY - regionSize; regionY <= targetRegionY + regionSize; regionY+=regionSize) {
                    for (let regionX = targetRegionX - regionSize; regionX <= targetRegionX + regionSize; regionX+=regionSize) {
                        regionsAroundCamera.push({regionX: regionX, regionY: regionY});
                    }
                }

                // Unload
                for (let i = this.loadedRegions.length - 1; i >= 0; i--) {
                    const loadedRegion = this.loadedRegions[i];
                    const regionX = loadedRegion.regionX;
                    const regionY = loadedRegion.regionY;

                    let match = false;
                    for (let potentialRegion of regionsAroundCamera) {
                        if (potentialRegion.regionX === regionX && potentialRegion.regionY === regionY) {
                            match = true;
                            break;
                        }
                    }

                    if (!match) {
                        console.log("Unloading", loadedRegion.regionX, loadedRegion.regionY);
                        loadedRegion.unload();
                        this.loadedRegions.splice(i, 1);
                    }
                }

                // Load
                for (let potentialRegion of regionsAroundCamera) {
                    let match = false;
                    for (let loadedRegion of this.loadedRegions) {
                        if (potentialRegion.regionX === loadedRegion.regionX && potentialRegion.regionY === loadedRegion.regionY) {
                            match = true;
                        }
                    }
                    if (!match) {
                        console.log("Loading", potentialRegion.regionX, potentialRegion.regionY);
                        const region = new Region(this.mapScene.scene, potentialRegion.regionX, potentialRegion.regionY, this.cache);
                        this.loadedRegions.push(region);
                    }
                }

            }, 1000);
        }
    }
}