import { InstancedMesh, Matrix4 } from "three";

export class DynamicInstancedMesh extends InstancedMesh {
    private originalCount: number;

    constructor(geometry, material, count) {
        super(geometry, material, count);
        this.originalCount = count;
        this.count = 0;
    }

    addInstance(matrix4): number | null {
        if (this.count + 1 > this.originalCount) {
            console.warn("Trying to add object but InstanceMesh cant fit it");
            return null;
        }
        const index = this.count;
        this.setMatrixAt(index, matrix4);
        this.count++;
        // this.computeBoundingSphere();
        return index;
    }

    // removeInstance(i) {
    //     if (i >= this.count) {
    //         throw Error(`Trying to remove object at index ${i} but count is ${this.count}`)
    //     }
    //     // matrix
    //     const lastMatrix = new Matrix4();
    //     this.getMatrixAt(this.count-1, lastMatrix);
    //     this.setMatrixAt(i, lastMatrix);
    //     this.instanceMatrix.needsUpdate = true;

    //     globalInstanceIDMap.delete(i); // Remove from global map

    //     // Update global map for shifted indices
    //     for (let j = i; j < this.count - 1; j++) {
    //         globalInstanceIDMap.set(j + 1, j - 1);
    //     }

    //     this.count--;
    //     return true;
    // }

    removeInstance(i) {
        if (i >= this.count) {
            throw Error(`Trying to remove object at index ${i} but count is ${this.count}`)
        }
        // matrix
        const lastMatrix = new Matrix4();
        this.getMatrixAt(this.count-1, lastMatrix);
        this.setMatrixAt(i, lastMatrix);

        this.instanceMatrix.needsUpdate = true;
        // for (let regionIndex = 0; regionIndex < window.loadedRegions.length; regionIndex++) {
        //     const region = window.loadedRegions[regionIndex];
        //     for (let obj of region.objects) {
        //         if (obj.instance === this && obj.instanceId > i) {
        //             obj.instanceId--;
        //         }
        //     }
        // }
        this.count--;
        return true;
    }
}