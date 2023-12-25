import { StreamBuffer } from './StreamBuffer';
import { CacheArchive } from './CacheArchive';
import { CacheIndices } from './CacheIndices';
import { CacheMapRegions } from './CacheMapRegions';

import { ClientLandscapeObjectParser } from "./parsers/ClientLandscapeObjectParser";

import { ungzip } from "pako";
import { Buffer } from "buffer";
import { ModelParser } from './parsers/ModelParser';
import { TerrainParser } from './parsers/TerrainParser';
import { LandscapeObjectDefinition } from './definitions/LandscapeObjectDefinition';

const INDEX_FILE_COUNT = 5;
const INDEX_SIZE = 6;
const DATA_BLOCK_SIZE = 512;
const DATA_HEADER_SIZE = 8;
const DATA_SIZE = DATA_BLOCK_SIZE + DATA_HEADER_SIZE;

export interface CacheFile {
    cacheId: number;
    fileId: number;
    data: StreamBuffer;
}

export class ClientData {

    public onLoaded = () => {};

    private dataFile: StreamBuffer;
    private indexFiles: StreamBuffer[] = [];
    public cacheIndices: CacheIndices;
    public definitionArchive: CacheArchive;
    public versionListArchive: CacheArchive;
    public landscapeObjectDefinitions: Map<number, LandscapeObjectDefinition>;
    public mapRegions: CacheMapRegions;

    public models: ModelParser;
    public terrain: TerrainParser;

    public constructor(cacheDirectory: string) {
        const dataFilePromise = this.fetchFile(`${cacheDirectory}/main_file_cache.dat`);

        let indexFilesPromises: Promise<ArrayBuffer>[] = [];
        for(let i = 0; i < INDEX_FILE_COUNT; i++) {
            indexFilesPromises.push(this.fetchFile(`${cacheDirectory}/main_file_cache.idx${i}`));
        }

        Promise.all([dataFilePromise, ...indexFilesPromises]).then(files => {
            this.dataFile = new StreamBuffer(Buffer.from(files[0]));
            for (let indexFile of files.slice(1)) {
                this.indexFiles.push(new StreamBuffer(Buffer.from(indexFile)));
            }


            this.definitionArchive = new CacheArchive(this.getCacheFile(0, 2));
            this.versionListArchive = new CacheArchive(this.getCacheFile(0, 5));
            this.cacheIndices = new CacheIndices(this.definitionArchive, this.versionListArchive);
    
            this.models = new ModelParser(this.versionListArchive, this);
            
            this.terrain = new TerrainParser(this);

            this.landscapeObjectDefinitions = ClientLandscapeObjectParser.ParseLandscapeObjectDefinitions(this.cacheIndices.landscapeObjectDefinitionIndices, this.definitionArchive);
            
            this.mapRegions = new CacheMapRegions();
            this.mapRegions.parseMapRegions(this.cacheIndices.mapRegionIndices, this);
    
            console.log(`[ClientData] Loaded ${this.landscapeObjectDefinitions.size} landscape objects.`);

            this.onLoaded();
        })
    }

    private fetchFile(url: string): Promise<ArrayBuffer> {
        return fetch(url).then(response => response.arrayBuffer());
    }

    public unzip(cacheFile: CacheFile): StreamBuffer {
        // const unzippedBuffer = gunzipSync(cacheFile.data.getBuffer());
        // const deflated = deflate(cacheFile.data.getBuffer());
        const deflated = ungzip(cacheFile.data.getBuffer());
        if (!deflated) throw Error("Unable to unzip");
        const unzippedBuffer = Buffer.from(deflated);
        return new StreamBuffer(unzippedBuffer);
    }

    public getCacheFile(cacheId: number, fileId: number) {
        const indexFile = this.indexFiles[cacheId];
        cacheId++;

        const index = indexFile.getSlice(INDEX_SIZE * fileId, INDEX_SIZE);
        const fileSize = (index.readUnsignedByte() << 16) | (index.readUnsignedByte() << 8) | index.readUnsignedByte();
        const fileBlock = (index.readUnsignedByte() << 16) | (index.readUnsignedByte() << 8) | index.readUnsignedByte();

        let remainingBytes = fileSize;
        let currentBlock = fileBlock;

        const fileBuffer = StreamBuffer.create(fileSize);
        let cycles = 0;

        while(remainingBytes > 0) {
            let size = DATA_SIZE;
            let remaining = this.dataFile.getReadable() - currentBlock * DATA_SIZE;
            if(remaining < DATA_SIZE) {
                size = remaining;
            }

            const block = this.dataFile.getSlice(currentBlock * DATA_SIZE, size);
            let nextFileId = block.readUnsignedShortBE();
            let currentPartId = block.readUnsignedShortBE();
            let nextBlockId = (block.readUnsignedByte() << 16) | (block.readUnsignedByte() << 8) | block.readUnsignedByte();
            let nextCacheId = block.readUnsignedByte();

            size -= 8;

            let bytesThisCycle = remainingBytes;
            if(bytesThisCycle > DATA_BLOCK_SIZE) {
                bytesThisCycle = DATA_BLOCK_SIZE;
            }

            //fileBuffer.writeBytes(block.getBuffer().slice(block.getReaderIndex(), bytesThisCycle));
            block.getBuffer().copy(fileBuffer.getBuffer(), fileBuffer.getWriterIndex(), block.getReaderIndex(), block.getReaderIndex() + size);
            fileBuffer.setWriterIndex(fileBuffer.getWriterIndex() + bytesThisCycle);
            remainingBytes -= bytesThisCycle;

            if(cycles != currentPartId) {
                throw('Cycle does not match part id.');
            }

            if(remainingBytes > 0) {
                if(nextCacheId != cacheId) {
                    throw('Unexpected next cache id.');
                }
                
                if(nextFileId != fileId) {
                    throw('Unexpected next file id.');
                }
            }

            cycles++;
            currentBlock = nextBlockId;
        }

        return { cacheId, fileId, data: fileBuffer } as CacheFile;
    }

}
