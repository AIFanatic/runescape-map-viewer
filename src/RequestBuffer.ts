export class RequestBuffer {
    private actions: Array<() => {}>;
    private delay: number;
    private actionsPerRun: number;

    constructor(delay: number, actionsPerRun: number) {
        this.actions = [];
        this.delay = delay;
        this.actionsPerRun = actionsPerRun;

        this.run();
    }

    public addAction(action: () => {}) {
        this.actions.push(action);
    }

    public async run() {
        if (this.actions.length > 0) {
            for (let i = 0; i < this.actionsPerRun; i++) {
                const action = this.actions.pop() as () => {};
                action();
                if (this.actions.length === 0) return;
            }
            setTimeout(async () => {
                this.run();
            }, this.delay);
        }
        else {
            setTimeout(async () => {
                this.run();
            }, 100);
        }

    }

    public clear() {
        this.actions = [];
    }
}