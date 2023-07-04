import { BenchmarkSuite } from "./base";
import { createSplayTest } from "./splay";
var success = true;
function PrintResult(name: string, result:string) {
  console.log(name + ': ' + result);
}

function PrintError(name: string, error: string) {
    PrintResult(name, error);
    success = false;
}


function PrintScore(score: string) {
    if (success) {
        console.log('----');
        console.log('Score (version ' + BenchmarkSuite.version + '): ' + score);
    }
}
function runTest() {
    BenchmarkSuite.RunSuites({
        NotifyResult: PrintResult,
        NotifyError: PrintError,
        NotifyScore: PrintScore
    });
}
createSplayTest();
runTest();