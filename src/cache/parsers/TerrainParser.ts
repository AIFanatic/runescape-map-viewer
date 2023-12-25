import { ClientData } from "../ClientData";
import { StreamBuffer } from "../StreamBuffer";

export class TerrainParser {
    private gameCache: ClientData;

    public vertexHeights: number[][][];
    public overlayFloorIds: number[][][];
    public underlayFloorIds: number[][][];

    private COSINE: number[];

    constructor(gameCache: ClientData) {
        this.gameCache = gameCache;

        this.vertexHeights = this.array3d(4, 104, 104, 0);
        this.overlayFloorIds = this.array3d(4, 104, 104, 0);
        this.underlayFloorIds = this.array3d(4, 104, 104, 0);

        this.COSINE = Array(2048).fill(0);
        for (let k: number = 0; k < 2048; k++) {
            this.COSINE[k] = (((65536.0 * Math.cos(k * 0.0030679615)) as number) | 0);
        }
    }

    private array3d<T>(x: number,y: number,z: number, init: T): T[][][] {
        return Array.from(Array(x), _ => Array.from(Array(y), _ => Array(z).fill(init)));
    }

    private noise(x: number, y: number) {
        let xw = x;
        let yw = y;
        let n = xw + yw * 57|0;
        n ^= n << 13;
        return (((n * (n * n * 15731|0 + 789221|0) + 1376312589|0) & 0x7fffffff|0) >> 19 & 255|0);
    }

    private calculateNoise(x: number, seed: number): number {
        return this.noise(x, seed);
    }

    private method176(i: number, i_226_: number, i_227_: number, i_228_: number): number {
        const i_229_: number = (65536 - this.COSINE[((i_227_ * 1024) / i_228_) | 0]) >> 1;
        return ((i * (65536 - i_229_)) >> 16) + ((i_226_ * i_229_) >> 16);
    }

    private method178(i: number, i_233_: number): number {
        const i_234_: number =
            this.calculateNoise(i - 1, i_233_ - 1) +
            this.calculateNoise(i + 1, i_233_ - 1) +
            this.calculateNoise(i - 1, i_233_ + 1) +
            this.calculateNoise(i + 1, i_233_ + 1);
        const i_235_: number =
            this.calculateNoise(i - 1, i_233_) +
            this.calculateNoise(i + 1, i_233_) +
            this.calculateNoise(i, i_233_ - 1) +
            this.calculateNoise(i, i_233_ + 1);
        const i_236_: number = this.calculateNoise(i, i_233_);
        return ((i_234_ / 16) | 0) + ((i_235_ / 8) | 0) + ((i_236_ / 4) | 0);
    }

    private method163(i: number, i_0_: number, i_1_: number): number {
        const i_2_: number = (i / i_1_) | 0;
        const i_3_: number = i & (i_1_ - 1);
        const i_4_: number = (i_0_ / i_1_) | 0;
        const i_5_: number = i_0_ & (i_1_ - 1);
        const i_6_: number = this.method178(i_2_, i_4_);
        const i_7_: number = this.method178(i_2_ + 1, i_4_);
        const i_8_: number = this.method178(i_2_, i_4_ + 1);
        const i_9_: number = this.method178(i_2_ + 1, i_4_ + 1);
        const i_10_: number = this.method176(i_6_, i_7_, i_3_, i_1_);
        const i_11_: number = this.method176(i_8_, i_9_, i_3_, i_1_);
        return this.method176(i_10_, i_11_, i_5_, i_1_);
    }

    private calculateVertexHeight(i: number, i_281_: number): number {
        let mapHeight: number =
            this.method163(i + 45365, i_281_ + 91923, 4) -
            128 +
            ((this.method163(i + 10294, i_281_ + 37821, 2) - 128) >> 1) +
            ((this.method163(i, i_281_, 1) - 128) >> 2);
        mapHeight = (((mapHeight * 0.3) as number) | 0) + 35;
        if (mapHeight < 10) {
            mapHeight = 10;
        } else if (mapHeight > 60) {
            mapHeight = 60;
        }
        return mapHeight;
    }

    private loadTerrainTile(
        offsetX: number,
        i_272_: number,
        offsetY: number,
        stream: StreamBuffer,
        i_274_: number,
        tileX: number,
        tileZ: number,
        tileY: number
    ) {
        // if (i_272_ !== -61) {
        //     this.aBoolean140 = !this.aBoolean140;
        // }
        if (tileX >= 0 && tileX < 104 && tileY >= 0 && tileY < 104) {
            // this.renderRuleFlags[tileZ][tileX][tileY] = (0 as number) | 0;
            for (;;) {
                const value: number = stream.readUnsignedByte();
                if (value === 0) {
                    if (tileZ === 0) {
                        this.vertexHeights[0][tileX][tileY] = -this.calculateVertexHeight(932731 + tileX + offsetX, 556238 + tileY + offsetY) * 8;
                    } else {
                        this.vertexHeights[tileZ][tileX][tileY] = this.vertexHeights[tileZ - 1][tileX][tileY] - 240;
                        break;
                    }
                    break;
                }
                if (value === 1) {
                    let height: number = stream.readUnsignedByte();
                    if (height === 1) {
                        height = 0;
                    }
                    if (tileZ === 0) {
                        this.vertexHeights[0][tileX][tileY] = (height != 0 ) ? -height * 8 : 0;
                    } else {
                        this.vertexHeights[tileZ][tileX][tileY] = this.vertexHeights[tileZ - 1][tileX][tileY] - height * 8;
                        break;
                    }
                    break;
                }
                if (value <= 49) {
                    this.overlayFloorIds[tileZ][tileX][tileY] = stream.readByte();
                    // this.overlayClippingPaths[tileZ][tileX][tileY] = ((((value - 2) / 4) | 0) as number) | 0;
                    // this.overlayRotations[tileZ][tileX][tileY] = (((value - 2 + i_274_) & 3) as number) | 0;
                } else if (value <= 81) {
                    // this.renderRuleFlags[tileZ][tileX][tileY] = ((value - 49) as number) | 0;
                } else {
                    this.underlayFloorIds[tileZ][tileX][tileY] = ((value - 81) as number) | 0;
                }
            }
        } else {
            for (;;) {
                const value: number = stream.readUnsignedByte();
                if (value === 0) {
                    break;
                }
                if (value === 1) {
                    stream.readUnsignedByte();
                    break;
                }
                if (value <= 49) {
                    stream.readUnsignedByte();
                }
            }
        }
    }

    private renderFloor(blockY: number, bool: boolean, offsetY: number, blockX: number, is: StreamBuffer, offsetX: number) {
        for (let plane: number = 0; plane < 4; plane++) {
            for (let tileX: number = 0; tileX < 64; tileX++) {
                for (let tileY: number = 0; tileY < 64; tileY++) {
                    this.loadTerrainTile(offsetX, (-61 as number) | 0, offsetY, is, 0, tileX + blockX, plane, tileY + blockY);
                }
            }
        }
    }

    public calculateTerrainData(chunkX: number, chunkY: number, nextTopLeftTileX: number, nextTopRightTileY: number, coordinates: number[], terrainDataIds: number[]) {
        this.vertexHeights = this.array3d(4, 104, 104, 0);
        this.overlayFloorIds = this.array3d(4, 104, 104, 0);
        this.underlayFloorIds = this.array3d(4, 104, 104, 0);
        
        const terrainData: StreamBuffer[] = [];

        for (let id of terrainDataIds) {
            const _terrainData = this.gameCache.getCacheFile(4, id);
            const _terrainDataUnzipped = this.gameCache.unzip(_terrainData);
            terrainData.push(_terrainDataUnzipped);
        }


        for (let j3: number = 0; j3 < terrainData.length; j3++) {
            const j4: number = (coordinates[j3] >> 8) * 64 - nextTopLeftTileX;
            const l5: number = (coordinates[j3] & 255) * 64 - nextTopRightTileY;
            const abyte0: StreamBuffer = terrainData[j3];
            if (abyte0 != null) {
                this.renderFloor(l5, false, (chunkY - 6) * 8, j4, abyte0, (chunkX - 6) * 8);
            }
        }
    }
}