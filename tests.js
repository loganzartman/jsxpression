var Tests = {
    unitTests: function() {
        //Addition
        var expr = new Expression("x+y+z");
        var vars = {
            "x": 1,
            "y": 3,
            "z": 5
        };
        assert(expr.eval(vars) === 9);

        //Order of operations
        expr = new Expression("x+y*z^w-v");
        vars = {
            "v": 7,
            "w": 2,
            "x": 23,
            "y": 3,
            "z": 5
        };
        assert(expr.eval(vars) === 91);

        //Implied multiply
        expr = new Expression("10x+20y+10");
        vars = {
            x: 1,
            y: 2
        };
        assert(expr.eval(vars) === 60);

        //Functions
        expr = new Expression("floor(2.1*x)*2");
        vars = {
            x: 2
        };
        assert(expr.eval(vars) === 8);

        //Calculus test
        expr = new Expression("(x+2)*(x-3)");
        var x0 = expr.nsolven("x");
        var x1 = expr.nsolven("x", 5);
        assert(x0 === -2);
        assert(x1 === 3);
    },
    benchmarks: {
        parse: function() {
            return Tests.bench(function(){
                var z = new Expression("a+b-c*d/e*(f+g-sin(h)^j)");
            });
        },
        eval: function() {
            var x = new Expression("2x^2+3*(x^4)/2").substitute({x: Math.PI});
            return Tests.bench(function(){
                var z = x.eval();
            });
        }
    },
    bench: function(f) {
        var debug = Expression.DEBUG;
        Expression.DEBUG = false;
        var dtTarget = 250, dtMin = 200, runsTarget = 12;
        var t0 = 0;
        var runs = 0, loops = 10, totalOps = 0;
        while (runs < runsTarget) {
            t0 = Date.now();
            for (var i=loops; i>=0; i--) {
                f();
            }
            dt = Date.now() - t0;
            if (debug) console.log("%s loops in %s ms", Math.ceil(loops), dt);
            if (dt > dtMin) {
                totalOps += Math.ceil(loops)/dt;
                runs++;
            }
            if (dt !== 0) loops *= (dtTarget / dt);
            else loops *= 1000;
        }
        Expression.DEBUG = debug;
        return totalOps / runs;
    },
    fbench: function(f) {
        var debug = Expression.DEBUG;
        Expression.DEBUG = false;
        var dtTarget = 250, dtMin = 200, loopMax = 1e6, runsTarget = 12;
        var t0 = 0;
        var runs = 0, loops = 10, totalOps = 0;
        while (runs < runsTarget) {
            t0 = Date.now();
            for (var i=loops; i>=0; i--) {
                f();
            }
            dt = Date.now() - t0;
            if (debug) console.log("%s loops in %s ms", Math.ceil(loops), dt);
            if (dt > dtMin) {
            	if (loops > loopMax) {
            		var downscale = 1+(loops-loopMax)/loopMax;
            		dtTarget /= downscale;
            		dtMin /= downscale;
            	}
            	else {
	                totalOps += Math.ceil(loops)/dt;
	                runs++;
	            }
            }
            if (dt !== 0) loops *= (dtTarget / dt);
            else loops *= 1000;
        }
        Expression.DEBUG = debug;
        return totalOps / runs;
    }
};

function assert(bool) {
    if (!bool) throw new Error("Assertion is false!");
}