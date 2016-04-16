JSXpression
===========

Getting started
---------------
**Include JSXpression**
```html
<script src="jsxpression.js"></script>
```

**Parse an expression**
```javascript
var expr = new Expression("a*x^2+b*x+c");
```
*`expr` now contains an expression with a `tokens` property, which represents each token in the expression in postfix (RPN) order.*

**Evaluate an expression**
```javascript
var expr = new Expression("2+2");
expr.eval() //4
```
or
```javascript
var expr = new Expression("(a+b)*c");
expr.eval({a: 1, b: 2, c: 3}); //9
```

**Other functions** - *See inline documentation for more information*
+ `clone()` - return a duplicate Expression
+ `nmin()` - numerically minimize a function over an interval
+ `nsolve()` - numerically solve a function for a single variable over an interval
