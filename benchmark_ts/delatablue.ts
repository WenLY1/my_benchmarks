import { BenchmarkSuite, Benchmark } from "./base";

export function createDelatBlueTest(){
    var DeltaBlue = new BenchmarkSuite('DeltaBlue', 66118, [
        new Benchmark('DeltaBlue', deltaBlue)
    ]);
}


class OrderedCollection<T>{
    elms: Array<T> = new Array();

    add(elm: T){
        this.elms.push(elm);
    }

    at(index: number): T{
        return this.elms[index];
    }

    size(): number{
        return this.elms.length;
    }

    removeFirst(){
        return this.elms.pop();
    }

    remove(elm: T){
        let index = 0;
        let skipped = 0;
        let i = 0;
        for(i = 0; i < this.elms.length; i++){
            let value = this.elms[i];
            if(value != elm){
                this.elms[index] = value;
                index++;
            }
            else {
                skipped++;
            }
        }
        for(i = 0; i < skipped; i++){
            this.elms.pop();
        }

    }
}

class Strength{
    constructor(strengthValue: number, name: string){
        this.strengthValue = strengthValue;
        this.name = name;
    }
    static REQUIRED = new Strength(0, "required");
    static STRONG_PREFERRED = new Strength(1, "strongPreferred");
    static PREFERRED = new Strength(2, "preferred");
    static STRONG_DEFAULT = new Strength(3, "strongDefault");
    static NORMAL = new Strength(4, "normal");
    static WEAK_DEFAULT = new Strength(5, "weakDefault");
    static WEAKEST = new Strength(6, "weakest");
    public strengthValue: number;
    public name: string;

    static stronger(s1: Strength, s2: Strength){
        return s1.strengthValue < s2.strengthValue;
    }

    static weaker(s1: Strength, s2: Strength){
        return s1.strengthValue > s2.strengthValue;
    }

    static weakestOf(s1: Strength, s2: Strength){
        return this.weaker(s1, s2) ? s1 : s2;
    }

    static strongest(s1: Strength, s2: Strength){
        return this.stronger(s1, s2) ? s1 : s2;
    }

    nextWeaker(){
        switch(this.strengthValue){
            case 0: return Strength.STRONG_PREFERRED;
            case 1: return Strength.PREFERRED;
            case 2: return Strength.STRONG_DEFAULT;
            case 3: return Strength.NORMAL;
            case 4: return Strength.WEAK_DEFAULT;
            case 5: return Strength.WEAKEST;
        }
        return Strength.WEAKEST;
    }

}

class Constraint{
    constructor(strength: Strength){
        this.strength = strength;
    }
    strength: Strength;

    markUnsatisfied(){

    }

    removeFromGraph(){

    }

    output(){
        return new Variable("");
    }


    execute(){
    }

    isSatisfied(): boolean{
        return true;
    }

    addToGraph(){
    }

    recalculate(){

    }

    chooseMethod(mark: number){

    }

    markInputs(mark: number){

    }

    inputsKnown(mark: number){
        return false;
    }

    addConstraint(){
        this.addToGraph();
        planner.incrementalAdd(this);
    }

    satisfy(mark: number){
        this.chooseMethod(mark);
        if(!this.isSatisfied()){
            if(this.strength == Strength.REQUIRED){
                console.log("Could not satisfy a required constraint!");
            }
            return null;
        }
        this.markInputs(mark);
        var out = this.output();
        var overridden = out.determinedBy;
        if(overridden != null){
            overridden.markUnsatisfied();
        }
        out.determinedBy = this;
        
        if(!planner.addPropagate(this, mark)){
            console.log("Cycle encountered");
        }
        out.mark = mark;
        return overridden;
    }

    destroyConstraint(){
        if(this.isSatisfied()) {
            planner.incrementalRemove(this);
        }
        else{
            this.removeFromGraph();
        }
    }

    isInput(){
        return false;
    }
}

class UnaryConstraint extends Constraint{
    constructor(v: Variable, strength: Strength){
        super(strength);
        this.myOutput = v;
        this.satisfied = false;
        this.addConstraint();
    }
    public myOutput: Variable;
    public satisfied: boolean;

    addToGraph(){
        this.myOutput.addConstraint(this);
        this.satisfied = false;
    }

    chooseMethod(mark: number){
        this.satisfied = (this.myOutput.mark != mark) && Strength.stronger(this.strength, this.myOutput.walkStrength);
    }

    isSatisfied(){
        return this.satisfied;
    }
    
    markInputs(mark: number){

    }

    output(){
        return this.myOutput;
    }

    recalculate(){
        this.myOutput.walkStrength = this.strength;
        this.myOutput.stay = !this.isInput();
        if(this.myOutput.stay){
            this.execute();
        }
    }

    markUnsatisfied(){
        this.satisfied = false;
    }

    inputsKnown(){
        return true;
    }

    removeFromGraph(){
        if (this.myOutput != null) 
        {
            this.myOutput.removeConstraint(this);
        }
        this.satisfied = false;
    }
}

class StayConstraint extends UnaryConstraint{
    constructor(v: Variable, str: Strength){
        super(v, str);
    }
}

class EditConstraint extends UnaryConstraint{
    constructor(v: Variable, str: Strength){
        super(v, str);
    }

    isInput(): boolean {
        return true;
    }

    execute(){
    }
}

enum Direction{
    NONE = 0,
    FORWARD = 1,
    BACKWARD = -1,
}

class BinaryConstraint extends Constraint{
    constructor(var1: Variable, var2: Variable, strength: Strength, scale?: Variable, offset?: Variable){
        super(strength);
        this.v1 = var1;
        this.v2 = var2;
        this.direction = Direction.NONE;
        this.offset = offset;
        this.scale = scale;
        this.addConstraint();
    }
    public v1: Variable;
    public v2: Variable;
    public direction: Direction;
    public scale?: Variable;
    public offset?: Variable;

    chooseMethod(mark: number){
        if(this.v1.mark == mark){
            this.direction = (this.v2.mark != mark && Strength.stronger(this.strength, this.v2.walkStrength))
                ? Direction.FORWARD 
                : Direction.NONE;
        }
        if(this.v2.mark == mark){
            this.direction = (this.v1.mark != mark && Strength.stronger(this.strength, this.v1.walkStrength))
                ? Direction.BACKWARD
                : Direction.NONE;
        }
        if (Strength.weaker(this.v1.walkStrength, this.v2.walkStrength)) {
            this.direction = Strength.stronger(this.strength, this.v1.walkStrength)
                ? Direction.BACKWARD
                : Direction.NONE;
        } else {
            this.direction = Strength.stronger(this.strength, this.v2.walkStrength)
                ? Direction.FORWARD
                : Direction.BACKWARD
        }
    }

    addToGraph(){
        this.v1.addConstraint(this);
        this.v2.addConstraint(this);
        this.direction = Direction.NONE;
    }

    isSatisfied(){
        return this.direction != Direction.NONE;
    }

    markInputs(mark: number){
        this.input().mark = mark;
    }

    input() {
        return (this.direction == Direction.FORWARD) ? this.v1 : this.v2;
    }

    output(){
        return (this.direction == Direction.FORWARD) ? this.v2 : this.v1;
    }

    recalculate(){
        let ihn = this.input();
        let out = this.output();
        out.walkStrength = Strength.weakestOf(this.strength, ihn.walkStrength);
        out.stay = ihn.stay;
        if (out.stay) 
        {
            this.execute();
        }
    }

    markUnsatisfied(){
        this.direction = Direction.NONE;
    }

    inputsKnown(mark: number){
        var i = this.input();
        return i.mark == mark || i.stay || i.determinedBy == null;
    }

    removeFromGraph(){
        if (this.v1 != null) this.v1.removeConstraint(this);
        if (this.v2 != null) this.v2.removeConstraint(this);
        this.direction = Direction.NONE;
    }


   
}

class ScaleConstraint extends BinaryConstraint{
    constructor(public src: Variable, scale: Variable, offset: Variable, dest: Variable, strength: Strength){
        super(src, dest, strength, scale, offset);
        this.direction = Direction.NONE;
    }
    

    addConstraint(){
        this.addToGraph();
        planner.incrementalAdd(this);
    }

    addToGraph(){
        super.addToGraph();
        this.scale!.addConstraint(this);
        this.offset!.addConstraint(this);
    }

    removeFromGraph(): void {
        super.removeFromGraph();
        if (this.scale != null) this.scale.removeConstraint(this);
        if (this.offset != null) this.offset.removeConstraint(this);
    }

    markInputs(mark: any): void {
        super.markInputs(mark);
        this.scale!.mark = this.offset!.mark = mark;
    }

    execute() {
        if (this.direction == Direction.FORWARD) {
            this.v2.value = this.v1.value * this.scale!.value + this.offset!.value;
        } else {
            this.v1.value = (this.v2.value - this.offset!.value) / this.scale!.value;
        }
    }

    recalculate(): void {
        var ihn = this.input(), out = this.output();
        out.walkStrength = Strength.weakestOf(this.strength, ihn.walkStrength);
        out.stay = ihn.stay && this.scale!.stay && this.offset!.stay;
        if (out.stay) this.execute();
    }

}

class EqualityConstraint extends BinaryConstraint{
    constructor(var1: Variable, var2: Variable, strength: Strength){
        super(var1, var2, strength);
    }

    execute(){
        this.output().value = this.input().value;
    }

}

class Variable{
    constructor(name: string, initialValue?: number){
        this.value = initialValue? initialValue : 0;
        this.constraints = new OrderedCollection();
        this.determinedBy = null;
        this.mark = 0;
        this.walkStrength = Strength.WEAKEST;
        this.stay = true;
        this.name = name;
    }
    public value: number;
    public constraints: OrderedCollection<Constraint>;
    public determinedBy: Constraint | null;
    public mark: number;
    public walkStrength: Strength;
    public stay: boolean;
    public name: string;

    addConstraint(c: Constraint){
        this.constraints.add(c);
    }

    removeConstraint(c: Constraint){
        this.constraints.remove(c);
        if(this.determinedBy == c){
            this.determinedBy = null;
        }
    }
}

class Planner{
    constructor(){
        this.currentMark = 0;
    }
    public currentMark: number;

    incrementalAdd(c: Constraint) {
        var mark = this.newMark();
        var overridden = c.satisfy(mark);

        while (overridden != null){
            overridden = overridden.satisfy(mark);
        }
            
    }

    incrementalRemove(c: Constraint) {
        var out = c.output();
        c.markUnsatisfied();
        c.removeFromGraph();
        
        
        var unsatisfied = this.removePropagateFrom(out);
        var strength = Strength.REQUIRED;
        
        do {
            for (var i = 0; i < unsatisfied.size(); i++) {
                var u = unsatisfied.at(i);
                if (u.strength == strength){
                    this.incrementalAdd(u);
                }
                   
            }
            strength = strength.nextWeaker();
        } while (strength != Strength.WEAKEST);
    }

    newMark(){
        return ++this.currentMark;
    }

    makePlan(sources: OrderedCollection<Constraint>) {
        var mark = this.newMark();
        var plan = new Plan();
        var todo = sources;
        while (todo.size() > 0) {
            var c: Constraint = todo.removeFirst()!;
            if (c.output().mark != mark && c.inputsKnown(mark)) {
                plan.addConstraint(c);
                c.output().mark = mark;
                this.addConstraintsConsumingTo(c.output(), todo);
            }
        }
        return plan;

    }

    extractPlanFromConstraints(constraints: OrderedCollection<Constraint>) {
        var sources = new OrderedCollection<Constraint>();
        for (var i = 0; i < constraints.size(); i++) {
            var c = constraints.at(i);
            if (c.isInput() && c.isSatisfied())
                // not in plan already and eligible for inclusion
                sources.add(c);
        }
        return this.makePlan(sources);
    }

    addPropagate(c: Constraint, mark: number) {
        var todo = new OrderedCollection<Constraint>();
        todo.add(c);
        while (todo.size() > 0) {
            var d = todo.removeFirst()!;
            if (d.output().mark == mark) {                
                this.incrementalRemove(c);
                
                return false;
            }

            d.recalculate();
            this.addConstraintsConsumingTo(d.output(), todo);
        }
        return true;
    }

    removePropagateFrom(out: Variable) {
        out.determinedBy = null;
        out.walkStrength = Strength.WEAKEST;
        out.stay = true;
        var unsatisfied = new OrderedCollection<Constraint>();
        var todo = new OrderedCollection<Variable>();
        todo.add(out);
        while (todo.size() > 0) {
            var v = todo.removeFirst()!;
            for (var i = 0; i < v.constraints.size(); i++) {
                var c = v.constraints.at(i);
                if (!c.isSatisfied())
                    unsatisfied.add(c);
            }
            var determining = v.determinedBy;
            for (var i = 0; i < v.constraints.size(); i++) {
                var next = v.constraints.at(i);
                if (next != determining && next.isSatisfied()) {
                    next.recalculate();
                    todo.add(next.output());
                }
            }
        }
        return unsatisfied;
    }

    addConstraintsConsumingTo(v: Variable, coll: OrderedCollection<Constraint>){
        var determining = v.determinedBy;
        var cc = v.constraints;
        for (var i = 0; i < cc.size(); i++) {
            var c = cc.at(i);
            if (c != determining && c.isSatisfied())
                coll.add(c);
        }
    }
}

class Plan{
    constructor(){
        this.v = new OrderedCollection<Constraint>();
    }
    v: OrderedCollection<Constraint>;

    addConstraint(c: Constraint){
        this.v.add(c);
    }

    size(){
        return this.v.size();
    }

    constraintAt(index: number){
        return this.v.at(index);
    }

    execute() {
        for (var i = 0; i < this.size(); i++) {
            var c = this.constraintAt(i);
            c.execute();
        }
    }
}

function chainTest(n: number) {
    planner = new Planner();
    var prev: Variable | null = null;
    let first: Variable | null = null;
    let last: Variable | null = null;
    // Build chain of n equality constraints
    for (var i = 0; i <= n; i++) {
        var name = "v" + i;         // toString is required
        var v = new Variable(name);
        if (prev != null)
            new EqualityConstraint(prev, v, Strength.REQUIRED);
        if (i == 0) first = v;
        if (i == n) last = v;
        prev = v;
    }
    new StayConstraint(last!, Strength.STRONG_DEFAULT);
    var edit = new EditConstraint(first!, Strength.PREFERRED);
    var edits = new OrderedCollection<Constraint>();
    edits.add(edit);
    var plan = planner.extractPlanFromConstraints(edits);
    for (var i = 0; i < 100; i++) {
        first!.value = i;
        plan.execute();
        if (last!.value != i){
            console.log("Chain test failed.");
        }
            
    }
}

function projectionTest(n: number) {
    planner = new Planner();
    let scale = new Variable("scale", 10);
    let offset = new Variable("offset", 1000);
    let src: Variable | null = null;
    let dst: Variable | null = null;
    let dests = new OrderedCollection<Variable>();
    for (var i = 0; i < n; i++) {
        src = new Variable("src" + i, i);
        dst = new Variable("dst" + i, i);
        dests.add(dst);
        new StayConstraint(src, Strength.NORMAL);
        new ScaleConstraint(src, scale, offset, dst, Strength.REQUIRED);
    }
    change(src!, 17);
    if (dst!.value != 1170) console.log("Projection 1 failed");
    change(dst!, 1050);
    if (src!.value != 5) console.log("Projection 2 failed");
    change(scale, 5);
    for (var i = 0; i < n - 1; i++) {
        if (dests.at(i).value != i * 5 + 1000){
            console.log("Projection 3 failed");
        }
            
    }
    change(offset, 2000);
    for (var i = 0; i < n - 1; i++) {
        if (dests.at(i).value != i * 5 + 2000)
            console.log("Projection 4 failed");
    }

}

function change(v: Variable, newValue: number) {
    var edit = new EditConstraint(v, Strength.PREFERRED);
    var edits = new OrderedCollection<Constraint>();
    edits.add(edit);
    var plan = planner.extractPlanFromConstraints(edits);
    for (var i = 0; i < 10; i++) {
        v.value = newValue;
        plan.execute();
    }
    edit.destroyConstraint();
}

var planner: Planner;
function deltaBlue() {
  chainTest(100);
  projectionTest(100);
}