import { Benchmark, BenchmarkSuite } from "./base_origin.js";
export function createSplayTest(){
    var Splay = new BenchmarkSuite('Splay', 81491, [
        new Benchmark("Splay", SplayRun, SplaySetup, SplayTearDown)
    ]);
}

// Configuration.
var kSplayTreeSize = 8000;
var kSplayTreeModifications = 80;
var kSplayTreePayloadDepth = 5;
var splayTree = null;
function GeneratePayloadTree(depth, tag) {
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
    var key;
    do {
        key = GenerateKey();
    } while (splayTree.find(key) != null);
    var payload = GeneratePayloadTree(kSplayTreePayloadDepth, String(key));
    splayTree.insert(key, payload);
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
    var keys = splayTree.exportKeys();
    splayTree = null;
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
        var greatest = splayTree.findGreatestLessThan(key);
        if (greatest == null) splayTree.remove(key);
        else splayTree.remove(greatest.key);
    }
}
/**
 * Constructs a Splay tree.  A splay tree is a self-balancing binary
 * search tree with the additional property that recently accessed
 * elements are quick to access again. It performs basic operations
 * such as insertion, look-up and removal in O(log(n)) amortized time.
 *
 * @constructor
 */
function SplayTree() {
};
/**
 * Pointer to the root node of the tree.
 *
 * @type {SplayTree.Node}
 * @private
 */
SplayTree.prototype.root_ = null;
/**
 * @return {boolean} Whether the tree is empty.
 */
SplayTree.prototype.isEmpty = function () {
    return !this.root_;
};
/**
 * Inserts a node into the tree with the specified key and value if
 * the tree does not already contain a node with the specified key. If
 * the value is inserted, it becomes the root of the tree.
 *
 * @param {number} key Key to insert into the tree.
 * @param {*} value Value to insert into the tree.
 */
SplayTree.prototype.insert = function (key, value) {
    if (this.isEmpty()) {
        this.root_ = new SplayTree.Node(key, value);
        return;
    }
    // Splay on the key to move the last node on the search path for
    // the key to the root of the tree.
    this.splay_(key);
    if (this.root_.key == key) {
        return;
    }
    var node = new SplayTree.Node(key, value);
    if (key > this.root_.key) {
        node.left = this.root_;
        node.right = this.root_.right;
        this.root_.right = null;
    } else {
        node.right = this.root_;
        node.left = this.root_.left;
        this.root_.left = null;
    }
    this.root_ = node;
};
/**
 * Removes a node with the specified key from the tree if the tree
 * contains a node with this key. The removed node is returned. If the
 * key is not found, an exception is thrown.
 *
 * @param {number} key Key to find and remove from the tree.
 * @return {SplayTree.Node} The removed node.
 */
SplayTree.prototype.remove = function (key) {
    if (this.isEmpty()) {
        throw Error('Key not found: ' + key);
    }
    this.splay_(key);
    if (this.root_.key != key) {
        throw Error('Key not found: ' + key);
    }
    var removed = this.root_;
    if (!this.root_.left) {
        this.root_ = this.root_.right;
    } else {
        var right = this.root_.right;
        this.root_ = this.root_.left;
        // Splay to make sure that the new root has an empty right child.
        this.splay_(key);
        // Insert the original right child as the right child of the new
        // root.
        this.root_.right = right;
    }
    return removed;
};
/**
 * Returns the node having the specified key or null if the tree doesn't contain
 * a node with the specified key.
 *
 * @param {number} key Key to find in the tree.
 * @return {SplayTree.Node} Node having the specified key.
 */
SplayTree.prototype.find = function (key) {
    if (this.isEmpty()) {
        return null;
    }
    this.splay_(key);
    return this.root_.key == key ? this.root_ : null;
};
/**
 * @return {SplayTree.Node} Node having the maximum key value.
 */
SplayTree.prototype.findMax = function (opt_startNode) {
    if (this.isEmpty()) {
        return null;
    }
    var current = opt_startNode || this.root_;
    while (current.right) {
        current = current.right;
    }
    return current;
};
/**
 * @return {SplayTree.Node} Node having the maximum key value that
 *     is less than the specified key value.
 */
SplayTree.prototype.findGreatestLessThan = function (key) {
    if (this.isEmpty()) {
        return null;
    }
    // Splay on the key to move the node with the given key or the last
    // node on the search path to the top of the tree.
    this.splay_(key);
    // Now the result is either the root node or the greatest node in
    // the left subtree.
    if (this.root_.key < key) {
        return this.root_;
    } else if (this.root_.left) {
        return this.findMax(this.root_.left);
    } else {
        return null;
    }
};
/**
 * @return {Array<*>} An array containing all the keys of tree's nodes.
 */
SplayTree.prototype.exportKeys = function () {
    var result = [];
    if (!this.isEmpty()) {
        this.root_.traverse_(function (node) { result.push(node.key); });
    }
    return result;
};
/**
 * Perform the splay operation for the given key. Moves the node with
 * the given key to the top of the tree.  If no node has the given
 * key, the last node on the search path is moved to the top of the
 * tree. This is the simplified top-down splaying algorithm from:
 * "Self-adjusting Binary Search Trees" by Sleator and Tarjan
 *
 * @param {number} key Key to splay the tree on.
 * @private
 */
SplayTree.prototype.splay_ = function (key) {
    if (this.isEmpty()) {
        return;
    }
    // Create a dummy node.  The use of the dummy node is a bit
    // counter-intuitive: The right child of the dummy node will hold
    // the L tree of the algorithm.  The left child of the dummy node
    // will hold the R tree of the algorithm.  Using a dummy node, left
    // and right will always be nodes and we avoid special cases.
    var dummy, left, right;
    dummy = left = right = new SplayTree.Node(null, null);
    var current = this.root_;
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
};
/**
 * Constructs a Splay tree node.
 *
 * @param {number} key Key.
 * @param {*} value Value.
 */
SplayTree.Node = function (key, value) {
    this.key = key;
    this.value = value;
};
/**
 * @type {SplayTree.Node}
 */
SplayTree.Node.prototype.left = null;
/**
 * @type {SplayTree.Node}
 */
SplayTree.Node.prototype.right = null;
/**
 * Performs an ordered traversal of the subtree starting at
 * this SplayTree.Node.
 *
 * @param {function(SplayTree.Node)} f Visitor function.
 * @private
 */
SplayTree.Node.prototype.traverse_ = function (f) {
    var current = this;
    while (current) {
        var left = current.left;
        if (left) left.traverse_(f);
        f(current);
        current = current.right;
    }
};