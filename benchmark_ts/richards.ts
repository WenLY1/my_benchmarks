import { BenchmarkSuite, Benchmark } from "./base";

export function createRichardsTest() {
    const Richards = new BenchmarkSuite('Richards', 35302, [
        new Benchmark("Richards", runRichards)
    ]);
}

const STATE_RUNNING = 0;
const STATE_RUNNABLE = 1;
const STATE_SUSPENDED = 2;
const STATE_HELD = 4;
const STATE_SUSPENDED_RUNNABLE = STATE_SUSPENDED | STATE_RUNNABLE;
const STATE_NOT_HELD = ~STATE_HELD;

const DATA_SIZE = 4;

class Packet {
    public id: number;
    public kind: number;
    public a1: number | undefined;
    public a2: number[] | undefined;
    public link: Packet | null | undefined;

    constructor(
        id: number,
        kind: number,
        a1?: number,
        a2?: number[],
        link?: Packet | null
    ) {
        this.id = id;
        this.kind = kind;
        this.a1 = a1;
        this.a2 = a2;
        this.link = link;
    }
    addTo(queue: Packet | null): Packet {
        this.link = null;
        if (queue == null) return this;
        let peek, next = queue;
        while ((peek = next.link) != null)
            next = peek;
        next.link = this;
        return queue;
    };
    toString(): string {
        return "Packet";
    };
}

interface Task {
    run(packet: Packet | null): TaskControlBlock | null;
    toString(): string;
}

class TaskControlBlock {
    link: TaskControlBlock | null;
    id: number;
    priority: number;
    queue: Packet | null;
    task: Task;
    state: number;
    constructor(
        public link_: TaskControlBlock | null,
        public id_: number,
        public priority_: number,
        public queue_: Packet | null,
        public task_: Task,
    ) {
        this.link = link_
        this.id = id_;
        this.priority = priority_;
        this.queue = queue_;
        this.task = task_;
        if (queue_ == null) {
            this.state = STATE_SUSPENDED;
        } else {
            this.state = STATE_SUSPENDED_RUNNABLE;
        }
    }
    setRunning() {
        this.state = STATE_RUNNING;
    }
    markAsNotHeld() {
        this.state = this.state & STATE_NOT_HELD;
    }
    markAsHeld() {
        this.state = this.state | STATE_HELD;
    }
    isHeldOrSuspended() {
        return (this.state & STATE_HELD) != 0 || (this.state == STATE_SUSPENDED);
    }
    markAsSuspended() {
        this.state = this.state | STATE_SUSPENDED;
    }
    markAsRunnable() {
        this.state = this.state | STATE_RUNNABLE;
    }
    run() {
        let packet;
        if (this.state == STATE_SUSPENDED_RUNNABLE) {
            packet = this.queue;
            if (packet && packet.link) this.queue = packet.link;
            if (this.queue == null) {
                this.state = STATE_RUNNING;
            } else {
                this.state = STATE_RUNNABLE;
            }
        } else {
            packet = null;
        }
        return this.task.run(packet);
    }

    checkPriorityAdd(task: TaskControlBlock | null, packet: Packet): TaskControlBlock | null {
        if (this.queue == null) {
            this.queue = packet;
            this.markAsRunnable();
            if (task != null && this.priority > task.priority) return this;
        } else {
            this.queue = packet.addTo(this.queue);
        }
        return task;
    }
    toString(): string {
        return "tcb { " + this.task + "@" + this.state + " }";
    }
}

class IdleTask implements Task {
    constructor(
        private scheduler: Scheduler,
        private v1: number,
        private count: number
    ) {
    }
    run(packet: Packet | null): TaskControlBlock | null {
        this.count--;
        if (this.count == 0) return this.scheduler.holdCurrent();
        if ((this.v1 & 1) == 0) {
            this.v1 = this.v1 >> 1;
            return this.scheduler.release(ID_DEVICE_A);
        } else {
            this.v1 = (this.v1 >> 1) ^ 0xD008;
            return this.scheduler.release(ID_DEVICE_B);
        }
    }
    toString(): string {
        return "IdleTask";
    }
}

class DeviceTask implements Task {
    constructor(
        private scheduler: Scheduler,
        private v1: null | Packet,
    ) {

    }
    run(packet: Packet | null): TaskControlBlock | null {
        if (packet == null) {
            if (this.v1 == null) return this.scheduler.suspendCurrent();
            const v = this.v1;
            this.v1 = null;
            return this.scheduler.queue(v);
        } else {
            this.v1 = packet;
            return this.scheduler.holdCurrent();
        }
    }
    toString(): string {
        return "DeviceTask";
    }
}

class WorkerTask implements Task {
    constructor(
        private scheduler: Scheduler,
        private v1: number,
        private v2: number
    ) { }
    run(packet: Packet | null): TaskControlBlock | null {
        if (packet == null) {
            return this.scheduler.suspendCurrent();
        } else {
            if (this.v1 == ID_HANDLER_A) {
                this.v1 = ID_HANDLER_B;
            } else {
                this.v1 = ID_HANDLER_A;
            }
            packet.id = this.v1;
            packet.a1 = 0;
            for (let i = 0; i < DATA_SIZE; i++) {
                this.v2++;
                if (this.v2 > 26) this.v2 = 1;
                if (packet.a2) packet.a2[i] = this.v2;
            }
            return this.scheduler.queue(packet);
        }
    }
    toString(): string {
        return "WorkerTask";
    }
}

class HandlerTask implements Task {
    constructor(
        private scheduler: Scheduler,
        private v1: null | Packet,
        private v2: null | Packet
    ) { }
    run(packet: Packet | null): TaskControlBlock | null {
        if (packet != null) {
            if (packet.kind == KIND_WORK) {
                this.v1 = packet.addTo(this.v1);
            } else {
                this.v2 = packet.addTo(this.v2);
            }
        }
        if (this.v1 != null) {
            const count = this.v1.a1;
            let v;
            if (count && count < DATA_SIZE) {
                if (this.v2 != null) {
                    v = this.v2;
                    if (this.v2.link && this.v1.a2) {
                        this.v2 = this.v2.link;
                        v.a1 = this.v1.a2[count];
                        this.v1.a1 = count + 1;
                    }

                    return this.scheduler.queue(v);
                }
            } else {
                v = this.v1;
                if (this.v1.link) this.v1 = this.v1.link;
                return this.scheduler.queue(v);
            }
        }
        return this.scheduler.suspendCurrent();
    }
    toString(): string {
        return "HandlerTask";
    }
}
class Scheduler {
    queueCount: number = 0;
    holdCount: number = 0;
    blocks: Array<TaskControlBlock | null> = new Array(NUMBER_OF_IDS);
    list: TaskControlBlock | null = null;
    currentTcb: TaskControlBlock | null = null;
    currentId: number | null = null;

    // other methods...

    addIdleTask(id: number, priority: number, queue: Packet | null, count: number): void {
        this.addRunningTask(id, priority, queue, new IdleTask(this, 1, count));
    }

    addWorkerTask(id: number, priority: number, queue: Packet | null): void {
        this.addTask(id, priority, queue, new WorkerTask(this, ID_HANDLER_A, 0));
    }

    addHandlerTask(id: number, priority: number, queue: Packet | null): void {
        this.addTask(id, priority, queue, new HandlerTask(this, null, null));
    }

    addDeviceTask(id: number, priority: number, queue: Packet | null): void {
        this.addTask(id, priority, queue, new DeviceTask(this, null))
    }

    addRunningTask(id: number, priority: number, queue: Packet | null, task: Task): void {
        this.addTask(id, priority, queue, task);
        if (this.currentTcb) this.currentTcb.setRunning();
    }

    addTask(id: number, priority: number, queue: Packet | null, task: Task): void {
        if (this.list)
            this.currentTcb = new TaskControlBlock(this.list, id, priority, queue, task);
        this.list = this.currentTcb;
        this.blocks[id] = this.currentTcb;
    }

    schedule(): void {
        this.currentTcb = this.list;
        while (this.currentTcb != null) {
            if (this.currentTcb.isHeldOrSuspended()) {
                if (this.currentTcb.link) this.currentTcb = this.currentTcb.link;
            } else {
                this.currentId = this.currentTcb.id;
                this.currentTcb = this.currentTcb.run();
            }
        }
    }

    release(id: number): TaskControlBlock | null {
        const tcb = this.blocks[id];
        if (tcb == null) return tcb;
        tcb.markAsNotHeld();
        if (this.currentTcb && tcb.priority > this.currentTcb.priority) {
            return tcb;
        } else {
            return this.currentTcb;
        }

    }

    holdCurrent(): TaskControlBlock | null {
        this.holdCount++;
        if (this.currentTcb) {
            this.currentTcb.markAsHeld();
            return this.currentTcb.link;
        } else {
            return null;
        }
    }

    suspendCurrent(): TaskControlBlock | null {
        if (this.currentTcb) this.currentTcb.markAsSuspended();
        return this.currentTcb;
    }

    queue(packet: Packet): TaskControlBlock | null {
        const t = this.blocks[packet.id];
        if (t == null) return t;
        this.queueCount++;
        packet.link = null;
        packet.id = this.currentId ? this.currentId : 0;
        return t.checkPriorityAdd(this.currentTcb, packet);
    }
}

const COUNT = 1000;
const EXPECTED_QUEUE_COUNT = 2322;
const EXPECTED_HOLD_COUNT = 928;
const ID_IDLE = 0;
const ID_WORKER = 1;
const ID_HANDLER_A = 2;
const ID_HANDLER_B = 3;
const ID_DEVICE_A = 4;
const ID_DEVICE_B = 5;
const NUMBER_OF_IDS = 6;
const KIND_DEVICE = 0;
const KIND_WORK = 1;

function runRichards() {
    const scheduler = new Scheduler();
    scheduler.addIdleTask(ID_IDLE, 0, null, COUNT);
    // let queue = new Packet(null, ID_WORKER, KIND_WORK);
    let queue = new Packet(ID_WORKER, KIND_WORK);
    scheduler.addWorkerTask(ID_WORKER, 1000, queue);
    // queue = new Packet(null, ID_DEVICE_A, KIND_DEVICE);
    queue = new Packet(ID_DEVICE_A, KIND_DEVICE);
    queue = new Packet(ID_DEVICE_A, KIND_DEVICE);
    scheduler.addHandlerTask(ID_HANDLER_A, 2000, queue);
    // queue = new Packet(null, ID_DEVICE_B, KIND_DEVICE);
    queue = new Packet(ID_DEVICE_B, KIND_DEVICE);
    queue = new Packet(ID_DEVICE_B, KIND_DEVICE);
    scheduler.addHandlerTask(ID_HANDLER_B, 3000, queue);
    scheduler.addDeviceTask(ID_DEVICE_A, 4000, null);
    scheduler.addDeviceTask(ID_DEVICE_B, 5000, null);
    scheduler.schedule();
    if (scheduler.queueCount != EXPECTED_QUEUE_COUNT ||
        scheduler.holdCount != EXPECTED_HOLD_COUNT) {
        let msg =
            "Error during execution: queueCount = " + scheduler.queueCount +
            ", holdCount = " + scheduler.holdCount + ".";
        throw new Error(msg);
    }
}
