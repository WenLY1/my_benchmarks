interface ITreeNode {
    left: ITreeNode | null;
    right: ITreeNode | null;
}

function main() {
    const maxDepth: number = Math.max(6, 0);
    const stretchDepth: number = maxDepth + 1;
    const stretchTree = createTree(stretchDepth);
    //console.log(`stretch tree of depth ${stretchDepth} check: ${checksum(stretchTree)}`)
    const longLivedTree = createTree(maxDepth);

    for (let depth = 4; depth <= maxDepth; depth += 2) {
        const iterations: number = Math.pow(2, maxDepth) - depth + 4;
        let sum = 0;
        for (let i = 0; i < iterations; i++) {
            const tree = createTree(depth);
            sum += checksum(tree);
        }
        //console.log(`${iterations} trees of depth ${depth} check: ${sum}`)
    }
    console.log('main');
    // console.log(
    //     `long lived tree of depth ${maxDepth} check: ${checksum(longLivedTree)}`
    // );
}

function checksum(node: ITreeNode | null): number {
    if (!node) {
        return 1;
    }
    if (!node.left) {
        return 1;
    }
    return 1 + checksum(node.left) + checksum(node.right);
}

function createTree(depth: number): ITreeNode {
    depth--;
    if (depth > 0) {
        return { left: createTree(depth), right: createTree(depth) };
    } else {
        return { left: null, right: null };
    }
}

export function test() {
    main();
}
