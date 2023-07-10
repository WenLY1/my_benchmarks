// The Computer Language Benchmarks Game
// https://salsa.debian.org/benchmarksgame-team/benchmarksgame/
//
//  Contributed by Ian Osgood
//  Modified for typescript deno by hanabi1224

let last = 42,
    A = 3877,
    C = 29573,
    M = 139968;
function mod(num1: number, num2: number) {
    let res = num1 - num2;
    while (res > num2) {
        res -= num2;
    }
    return res > 0 ? res : 0;
}
function rand(max: number) {
    // last = (last * A + C) % M;
    last = mod(last * A + C, M);
    return (max * last) / M;
}

const ALU =
    'GGCCGGGCGCGGTGGCTCACGCCTGTAATCCCAGCACTTTGG' +
    'GAGGCCGAGGCGGGCGGATCACCTGAGGTCAGGAGTTCGAGA' +
    'CCAGCCTGGCCAACATGGTGAAACCCCGTCTCTACTAAAAAT' +
    'ACAAAAATTAGCCGGGCGTGGTGGCGCGCGCCTGTAATCCCA' +
    'GCTACTCGGGAGGCTGAGGCAGGAGAATCGCTTGAACCCGGG' +
    'AGGCGGAGGTTGCAGTGAGCCGAGATCGCGCCACTGCACTCC' +
    'AGCCTGGGCGACAGAGCGAGACTCCGTCTCAAAAA';

const IUB = {
    a: 0.27,
    c: 0.12,
    g: 0.12,
    t: 0.27,
    B: 0.02,
    D: 0.02,
    H: 0.02,
    K: 0.02,
    M: 0.02,
    N: 0.02,
    R: 0.02,
    S: 0.02,
    V: 0.02,
    W: 0.02,
    Y: 0.02,
};

const HomoSap = {
    a: 0.302954942668,
    c: 0.1979883004921,
    g: 0.1975473066391,
    t: 0.3015094502008,
};

function makeCumulative(table: { [key: string]: number }) {
    let last: string | null = null;
    for (const c in table) {
        if (last) table[c] += table[last];
        last = c;
    }
}

function fastaRepeat(n: number, seq: string) {
    let seqi = 0,
        lenOut = 60;
    while (n > 0) {
        if (n < lenOut) lenOut = n;
        if (seqi + lenOut < seq.length) {
            console.log(seq.slice(seqi, seqi + lenOut));
            seqi += lenOut;
        } else {
            const s = seq.slice(seqi);
            seqi = lenOut - s.length;
            console.log(s + seq.slice(0, seqi));
        }
        n -= lenOut;
    }
}

function fastaRandom(n: number, table: { [key: string]: number }) {
    let line = new Array(60);
    //makeCumulative(table);
    while (n > 0) {
        if (n < line.length) line = new Array(n);
        for (let i = 0; i < line.length; i++) {
            const r = rand(1);
            for (const c in table) {
                if (r < table[c]) {
                    line[i] = c;
                    break;
                }
            }
        }
        //console.log(line.join(''));
        n -= line.length;
    }
}

const n = 10;

console.log('>ONE Homo sapiens alu');
fastaRepeat(2 * n, ALU);

// console.log('>TWO IUB ambiguity codes');
// fastaRandom(3 * n, IUB);

// console.log('>THREE Homo sapiens frequency');
// fastaRandom(5 * n, HomoSap);
