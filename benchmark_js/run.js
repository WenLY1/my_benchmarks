
// import { createDeltaBlueTest } from "./delatblue_origin.js";
import { createSplayTest } from "./splay_origin.js";
import { BenchmarkSuite } from "./base_origin.js";


  var success = true;
function PrintResult(name, result) {
  console.log(name + ': ' + result);
}
function PrintError(name, error) {
  PrintResult(name, error);
  success = false;
}
function PrintScore(score) {
  if (success) {
    console.log('----');
    console.log('Score (version ' + BenchmarkSuite.version + '): ' + score);
  }
}


// createDeltaBlueTest();
createSplayTest();
BenchmarkSuite.RunSuites({ NotifyResult: PrintResult,
                           NotifyError: PrintError,
                           NotifyScore: PrintScore });