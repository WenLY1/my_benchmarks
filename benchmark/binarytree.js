"use strict";
exports.__esModule = true;
exports.test = void 0;
function main() {
    //console.log(1);
    var maxDepth = Math.max(6, 0);
    var stretchDepth = maxDepth + 1;
    var stretchTree = createTree(stretchDepth);
    //console.log(`stretch tree of depth ${stretchDepth} check: ${checksum(stretchTree)}`)
    console.log("".concat(stretchDepth));
    var longLivedTree = createTree(maxDepth);
    for (var depth = 4; depth <= maxDepth; depth += 2) {
        var iterations = Math.pow(2, maxDepth) - depth + 4;
        var sum = 0;
        for (var i = 0; i < iterations; i++) {
            var tree = createTree(depth);
            sum += checksum(tree);
        }
        //console.log(`${iterations} trees of depth ${depth} check: ${sum}`)
    }
    // console.log(
    //     `long lived tree of depth ${maxDepth} check: ${checksum(longLivedTree)}`
    // );
}
function checksum(node) {
    if (!node.left) {
        return 1;
    }
    return 1 + checksum(node.left) + checksum(node.right);
}
function createTree(depth) {
    depth--;
    if (depth > 0) {
        return { left: createTree(depth), right: createTree(depth) };
    }
    else {
        return { left: null, right: null };
    }
}
function test() {
    main();
}
exports.test = test;
