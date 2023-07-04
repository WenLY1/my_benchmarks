
import { BenchmarkSuite, Benchmark } from "./base";

export function createSplayTest(){
    var Splay = new BenchmarkSuite('Splay', 81491, [
        new Benchmark("Splay", SplayRun, SplaySetup, SplayTearDown)
    ]);
}

const kSplayTreeSize = 8000;
const kSplayTreeModifications = 80;
const kSplayTreePayloadDepth = 5;

let splayTree: SplayTree | undefined = undefined;

class SplayTreeNode {
    constructor(public key: number, public value) {

    }
    left: SplayTreeNode | undefined = undefined;
    right: SplayTreeNode | undefined = undefined;

    traverse_(f: (node: SplayTreeNode) => void) {
        let current: SplayTreeNode | undefined = this;
        while (current) {
            var left = current.left;
            if (left) left.traverse_(f);
            f(current);
            current = current.right;
        }
    }
}

class SplayTree {

    root_: SplayTreeNode | undefined = undefined;
    letf: SplayTreeNode | undefined = undefined;

    isEmpty() {
        return !this.root_;
    }

    insert(key: number, value: any) {
        if (this.isEmpty()) {
            this.root_ = new SplayTreeNode(key, value);
            return;
        }

        this.splay_(key);
        if (this.root_!.key == key) {
            return;
        }

        let node = new SplayTreeNode(key, value);

        if (key > this.root_!.key) {
            node.left = this.root_;
            node.right = this.root_!.right;
            this.root_!.right = undefined;
        } else {
            node.right = this.root_;
            node.left = this.root_!.left;
            this.root_!.left = undefined;
        }
        this.root_ = node;
    }

    remove(key: number) {
        if (this.isEmpty()) {
            throw Error('Key not found: ' + key);
        }
        this.splay_(key);
        if (this.root_!.key != key) {
            throw Error('Key not found: ' + key);
        }
        var removed = this.root_;
        if (!this.root_!.left) {
            this.root_ = this.root_!.right;
        } else {
            var right = this.root_!.right;
            this.root_ = this.root_!.left;
            // Splay to make sure that the new root has an empty right child.
            this.splay_(key);
            // Insert the original right child as the right child of the new
            // root.
            this.root_.right = right;
        }
        return removed;
    }

    find(key: number) {
        if (this.isEmpty()) {
            return undefined;
        }
        this.splay_(key);
        return this.root_!.key == key ? this.root_ : null;
    }

    findMax(opt_startNode: SplayTreeNode | undefined) {
        if (this.isEmpty()) {
            return null;
        }
        var current = opt_startNode || this.root_;
        while (current?.right) {
            current = current?.right;
        }
        return current;
    }

    findGreatestLessThan(key: number) {
        if (this.isEmpty()) {
            return undefined;
        }
        // Splay on the key to move the node with the given key or the last
        // node on the search path to the top of the tree.
        this.splay_(key);
        // Now the result is either the root node or the greatest node in
        // the left subtree.
        if (this.root_!.key < key) {
            return this.root_;
        } else if (this.root_!.left) {
            return this.findMax(this.root_!.left);
        } else {
            return undefined;
        }
    }

    exportKeys() {
        let result: number[] = [];
        if (!this.isEmpty()) {
            this.root_!.traverse_(function (node) { result.push(node.key); });
        }
        return result;
    }

    splay_(key: number) {
        if (this.isEmpty()) {
            return;
        }
        // Create a dummy node.  The use of the dummy node is a bit
        // counter-intuitive: The right child of the dummy node will hold
        // the L tree of the algorithm.  The left child of the dummy node
        // will hold the R tree of the algorithm.  Using a dummy node, left
        // and right will always be nodes and we avoid special cases.
        var dummy: SplayTreeNode, left: SplayTreeNode, right: SplayTreeNode;
        dummy = left = right = new SplayTreeNode(0, null);
        var current = this.root_!;
        while (true) {
            if (key < current.key) {
                if (!current.left) {
                    break;
                }
                if (key < current.left.key) {
                    // Rotate right.
                    var tmp = current.left;
                    current.left = tmp.right;
                    tmp.right = current;
                    current = tmp;
                    if (!current.left) {
                        break;
                    }
                }
                // Link right.
                right.left = current;
                right = current;
                current = current.left;
            } else if (key > current.key) {
                if (!current.right) {
                    break;
                }
                if (key > current.right.key) {
                    // Rotate left.
                    var tmp = current.right;
                    current.right = tmp.left;
                    tmp.left = current;
                    current = tmp;
                    if (!current.right) {
                        break;
                    }
                }
                // Link left.
                left.right = current;
                left = current;
                current = current.right;
            } else {
                break;
            }
        }
        // Assemble.
        left.right = current.left;
        right.left = current.right;
        current.left = dummy.right;
        current.right = dummy.left;
        this.root_ = current;
    }



}

function GeneratePayloadTree(depth: number, tag: string) {
    if (depth == 0) {
        return {
            array: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
            string: 'String for key ' + tag + ' in leaf node'
        };
    } else {
        return {
            left: GeneratePayloadTree(depth - 1, tag),
            right: GeneratePayloadTree(depth - 1, tag)
        };
    }
}


function GenerateKey() {
    // The benchmark framework guarantees that Math.random is
    // deterministic; see base.js.
    return Math.random();
}

function InsertNewNode() {
    // Insert new node with a unique key.
    let key: number;
    do {
        key = GenerateKey();
    } while (splayTree?.find(key) != null);
    var payload = GeneratePayloadTree(kSplayTreePayloadDepth, String(key));
    splayTree?.insert(key, payload);
    return key;
}

function SplaySetup() {
    splayTree = new SplayTree();
    for (var i = 0; i < kSplayTreeSize; i++) InsertNewNode();
}

function SplayTearDown() {
    // Allow the garbage collector to reclaim the memory
    // used by the splay tree no matter how we exit the
    // tear down function.
    var keys = splayTree!.exportKeys();
    splayTree = undefined;
    // Verify that the splay tree has the right size.
    var length = keys.length;
    if (length != kSplayTreeSize) {
        throw new Error("Splay tree has wrong size");
    }
    // Verify that the splay tree has sorted, unique keys.
    for (var i = 0; i < length - 1; i++) {
        if (keys[i] >= keys[i + 1]) {
            throw new Error("Splay tree not sorted");
        }
    }
}

function SplayRun() {
    // Replace a few nodes in the splay tree.
    for (var i = 0; i < kSplayTreeModifications; i++) {
        var key = InsertNewNode();
        var greatest = splayTree!.findGreatestLessThan(key);
        if (greatest == null) splayTree!.remove(key);
        else splayTree!.remove(greatest.key);
    }
}