export class Benchmark {
    constructor(public name: string, public run: () => void, public setup?: () => void, public tearDown?: () => void) {
        this.setup = this.setup ?? function () { };
        this.tearDown = this.tearDown ?? function () { };
    }
}

class BenchmarkResult {
    constructor(benchmark: Benchmark, time: number) {
        this.benchmark = benchmark;
        this.time = time;
    }
    public benchmark: Benchmark;
    public time: number;

    valueOf(): number {
        return this.time;
    }
}
interface IRunner {
    NotifyResult?: (name: string, result: string) => void;
    NotifyError?: (name: string, error: string) => void;
    NotifyScore?: (score: string) => void;
    NotifyStart?: (name: string) => void;
    NotifyStep?: (name: string) => void;
}

interface IData {
    runs: number;
    elapsed: number;
}

export class BenchmarkSuite {
    constructor(name: string, reference: number, benchmarks: Benchmark[]) {
        this.name = name;
        this.reference = reference;
        this.benchmarks = benchmarks;
        BenchmarkSuite.suites.push(this);
    }
    public name: string;
    public benchmarks: Benchmark[];
    public static suites: BenchmarkSuite[] = [];
    public static scores: number[];
    public reference: number;
    public static version: string = '7';
    public results: number[] = [];
    public runner: IRunner;
    static RunSuites(runner: IRunner) {
        var continuation: any = undefined;
        var suites: BenchmarkSuite[] = BenchmarkSuite.suites;
        var length: number = suites.length;
        BenchmarkSuite.scores = [];
        var index: number = 0;
        function RunStep(): void {
            while (continuation || index < length) {
                if (continuation) {
                    continuation = continuation();
                } else {
                    var suite = suites[index++];
                    if (runner.NotifyStart) runner.NotifyStart(suite.name);
                    continuation = suite.RunStep(runner);
                }
                // if (continuation && typeof window != 'undefined' && window.setTimeout) {
                //     window.setTimeout(RunStep, 25);
                //     return;
                // }
            }
            if (runner.NotifyScore) {
                var score: number = BenchmarkSuite.GeometricMean(BenchmarkSuite.scores);
                var formatted: string = BenchmarkSuite.FormatScore(100 * score);
                runner.NotifyScore(formatted);
            }
        }
        RunStep();
    }

    CountBenchmarks(): number {
        var result: number = 0;
        var suites: BenchmarkSuite[] = BenchmarkSuite.suites;
        for (var i = 0; i < suites.length; i++) {
            result += suites[i].benchmarks.length;
        }
        return result;
    }

    static GeometricMean(numbers: number[]): number {
        var log: number = 0;
        for (var i: number = 0; i < numbers.length; i++) {
            log += Math.log(numbers[i]);
        }
        return Math.pow(Math.E, log / numbers.length);
    }

    // need implement Number
    static FormatScore(value: number): string {
        if (value > 100) {
            return value.toFixed(0);
        } else {
            return value.toPrecision(3);
        }
    }

    NotifyStep(result: BenchmarkResult): void {
        this.results.push(result.time);
        if (this.runner.NotifyStep) this.runner.NotifyStep(result.benchmark.name);
    }

    NotifyResult(): void {
        var mean: number = BenchmarkSuite.GeometricMean(this.results);
        var score: number = this.reference / mean;
        BenchmarkSuite.scores.push(score);
        if (this.runner.NotifyResult) {
            var formatted: string = BenchmarkSuite.FormatScore(100 * score);
            this.runner.NotifyResult(this.name, formatted);
        }
    }

    NotifyError(error: string): void {
        if (this.runner.NotifyError) {
            this.runner.NotifyError(this.name, error);
        }
        if (this.runner.NotifyStep) {
            this.runner.NotifyStep(this.name);
        }
    }

    RunSingleBenchmark(benchmark: Benchmark, data: IData): IData | undefined {
        function Measure(data?: IData) {
            var elapsed: number = 0;
            var start: number = Date.now();
            for (var n = 0; elapsed < 1000; n++) {
                benchmark.run();
                elapsed = Date.now() - start;
            }
            if (data != undefined) {
                data.runs += n;
                data.elapsed += elapsed;
            }
        }

        if (data == undefined) {
            // Measure the benchmark once for warm up and throw the result
            // away. Return a fresh data object.
            Measure();
            return { runs: 0, elapsed: 0 };
        } else {
            Measure(data);
            // If we've run too few iterations, we continue for another second.
            if (data.runs < 32) return data;
            var usec = (data.elapsed * 1000) / data.runs;
            this.NotifyStep(new BenchmarkResult(benchmark, usec));
            return undefined;
        }
    }

    RunStep(runner: IRunner) {
        this.results = [];
        this.runner = runner;
        var length: number = this.benchmarks.length;
        var index: number = 0;
        var suite: BenchmarkSuite = this;
        var data: IData | undefined;
        // Run the setup, the actual benchmark, and the tear down in three
        // separate steps to allow the framework to yield between any of the
        // steps.
        function RunNextSetup() {
            if (index < length) {
                try {
                    if (suite.benchmarks[index].setup != undefined) {
                        suite.benchmarks[index].setup!();
                    }
                } catch (e) {
                    suite.NotifyError(e);
                    return null;
                }
                return RunNextBenchmark;
            }
            suite.NotifyResult();
            return null;
        }
        function RunNextBenchmark() {
            try {
                data = suite.RunSingleBenchmark(suite.benchmarks[index], data!);
            } catch (e) {
                suite.NotifyError(e);
                return null;
            }
            // If data is null, we're done with this benchmark.
            return (data == undefined) ? RunNextTearDown : RunNextBenchmark();
        }
        function RunNextTearDown() {
            try {
                suite.benchmarks[index++].tearDown();
            } catch (e) {
                suite.NotifyError(e);
                return null;
            }
            return RunNextSetup;
        }
        // Start out running the setup.
        return RunNextSetup();
    }



}

Math.random = (function (): () => number {
    var seed = 49734321;
    return function () {
        // Robert Jenkins' 32 bit integer hash function.
        seed = ((seed + 0x7ed55d16) + (seed << 12)) & 0xffffffff;
        seed = ((seed ^ 0xc761c23c) ^ (seed >>> 19)) & 0xffffffff;
        seed = ((seed + 0x165667b1) + (seed << 5)) & 0xffffffff;
        seed = ((seed + 0xd3a2646c) ^ (seed << 9)) & 0xffffffff;
        seed = ((seed + 0xfd7046c5) + (seed << 3)) & 0xffffffff;
        seed = ((seed ^ 0xb55a4f09) ^ (seed >>> 16)) & 0xffffffff;
        return (seed & 0xfffffff) / 0x10000000;
    };
})();