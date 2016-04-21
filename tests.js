var Tests = {
    benchmarks: {
        parse: function() {
            return Tests.bench(function(){
                var z = new Expression("a+b-c*d/e*(f+g-sin(h)^j)");
            });
        },
        eval: function() {
            var x = new Expression("2x^2+3*(x^4)/2").substitute({x: Math.E});
            return Tests.bench(function(){
                var z = x.eval();
            });
        }
    },
    bench: function(f) {
        var debug = Expression.DEBUG;
        Expression.DEBUG = false;
        var dtTarget = 1000, dtMin = 100, runsTarget = 6;
        var t0 = 0;
        var runs = 0, loops = 10, totalOps = 0;
        while (runs < runsTarget) {
            t0 = Date.now();
            for (var i=loops; i>=0; i--) {
                f();
            }
            dt = Date.now() - t0;
            console.log("%s loops in %s ms", Math.ceil(loops), dt);
            if (dt > dtMin) {
                totalOps += Math.ceil(loops)/dt;
                runs++;
            }
            if (dt !== 0) loops *= (dtTarget / dt);
            else loops *= 1000;
        }
        Expression.DEBUG = debug;
        return totalOps / runs;
    }
};
