var Expression = function(str, b) {
	if (typeof str === "string") {
		//fix implied multiply
		str = str.replace(new RegExp(Expression.regex.impliedMultiply.source, "g"), "$1*$2");

		//parse expression
		this.tokens = str.match(new RegExp(Expression.regex.token.source, "g"));
		this.originalString = this.tokens.join("");
		if (Expression.DEBUG) console.log("infix: %s", this.tokens);
		this.tokens = Expression.infixToPostfix(this.tokens);
		if (Expression.DEBUG) console.log("postfix: %s", this.tokens);
	}
	else {
		this.tokens = [];
		var that = this;
		str.forEach(function(token){
			that.tokens.push(token);
		});
		if (b) this.originalString = b;
	}
};
Expression.DEBUG = true;
Expression.SOLVE_TOL = Number.EPSILON;
Expression.FLOAT_TOL = Number.EPSILON;
Expression.precedenceList = ["=","-","+","*","/","%","^"];

/**
 * Contains patterns that match various types of tokens.
 */
Expression.regex = {
	number: "(?:(?:\\d*\\.)?\\d+)",
	funct: "\\w{2,}(?=\\()",
	functname: "\\w{2,}", //function names require 2+ characters for now to be distinct from variables
	variable: "\\w{1}",
	operator: "[+\\-*%^/=<>]",
	parenthesis: "[()]"
};
//compile patterns
(function(){
	Expression.regex.token =
		"[,]|" + Expression.regex.number +
		"|" + Expression.regex.funct +
		"|" + Expression.regex.variable +
		"|" + Expression.regex.operator +
		"|" + Expression.regex.parenthesis;
	Expression.regex.impliedMultiply =
		"(" + Expression.regex.number + ")" +
		"(" + Expression.regex.variable + ")";
	Object.keys(Expression.regex).forEach(function(key){
		Expression.regex[key] = new RegExp(Expression.regex[key], "i");
	});
})();

/**
 * Contains implementations of all functions that can be parsed.
 * Each function should explicitly define its arguments (instead of using the arguments object).
 */
Expression.functionMap = {
	abs: function(x){return Math.abs(x);},
	sin: function(x){return Math.sin(x);},
	cos: function(x){return Math.cos(x);},
	tan: function(x){return Math.tan(x);},
	asin: function(x){return Math.asin(x);},
	acos: function(x){return Math.acos(x);},
	atan: function(x){return Math.atan(x);},
	sec: function(x){return 1/Math.cos(x);},
	csc: function(x){return 1/Math.sin(x);},
	cot: function(x){return 1/Math.tan(x);},
	ceil: function(x){return Math.ceil(x);},
	round: function(x){return Math.round(x);},
	floor: function(x){return Math.floor(x);},
	rand: function(){return Math.random();},
	ln: function(x){return Math.log(x);},
	log: function(x){return Math.log10(x);},
	logn: function(x,n){return Math.log(x)/Math.log(n);},
	sqrt: function(x){return Math.sqrt(x);},
	sign: function(x){return Math.sign(x);},
	max: function(x,y){return Math.max(x,y);},
	min: function(x,y){return Math.min(x,y);},
	iff: function(c,t,f){return c?t:f;}
};

/**
 * Evaluates this experssion over an interval and passes the input, result, and a data object
 * to a function func.
 */
Expression.prototype.evalInterval = function(func, variable, low, high, step) {
	var sub = {};
	if (typeof step === "undefined") step = (high-low)/1000;
	for (var i=low; i<=high; i+=step) {
		sub[variable] = i;
		var val = this.eval(sub);
		func(i, val);
	}
};

/**
 * Solves an expression of a single variable for f(x) = 0.
 * Uses the bracketing method, which assumes that the function is continuous.
 * The interval given should contain only one zero.
 * @param {string} variable variable to solve for
 * @param {number} iterations max iterations before stopping (higher => more accuracy)
 * @param {number} low lower bound of interval
 * @param {number} high upper bound of interval
 * @return {number} approximate solution
 */
Expression.prototype.nsolveIntv = function(variable, iterations, low, high) {
	var x1 = low,
		x2 = high,
		x3 = (x1+x2)*0.5;
	var y1, y2, y3;
	for (var i=0; i<iterations; i++) {
		y1 = this.eval(variable, x1);
		y2 = this.eval(variable, x2);
		y3 = this.eval(variable, x3);
		if (Expression.floatEquals(x3, 0) || Math.abs((x2-x1)/2) < Expression.SOLVE_TOL) {break;}
		if (Math.sign(y3) === Math.sign(y1)) {x1 = x3;}
		else {x2 = x3;}
		x3 = (x1+x2)*0.5;
	}
	return x3;
};

/**
 * Replaces variables with other values from a map vars.
 * Syntax: substitute({"name": val, "name2": val2}) or substitute("name", val)
 * @param {object} vars key=>value map of substitutions
 * @return {Expression} new Expression with appropriate substitutions
 */
Expression.prototype.substitute = function(vars) {
	if (arguments.length === 2) {
		var z = {};
		z[arguments[0]] = arguments[1];
		vars = z;
	}
	var expr = this.clone();
	if (typeof vars === "object") {
		expr.tokens = expr.tokens.map(function(token){
			if (vars.hasOwnProperty(token)) {
				return vars[token];
			}
			return token;
		});
	}
	return expr;
};

/**
 * Evaluates the expression with an optional substitution map.
 * @param {object} vars optional substitution (see Expression.prototype.substitute)
 * @return {number} eval result
 */
Expression.prototype.eval = function(vars) {
	//optional variable substitution
	var expr = this.substitute.apply(this, arguments);

	//evaluate postfix expression
	var stack = [];
	expr.tokens.forEach(function(token){
		//push numbers to output stack
		if (typeof token === "number") {
			stack.push(token);
		}
		//handle operations
		else if (Expression.isOperator(token) || Expression.isFunctName(token)) {
			var result = 0;
			//check to see if this is a defined function and evaluate
			if (Expression.functionMap.hasOwnProperty(token)) {
				var f = Expression.functionMap[token];
				var nargs = f.length, args = [];
				for (var i=0; i<nargs; i++) args.push(stack.pop());
				result = f.apply(this, args);
			}
			//otherwise assume it may be an operator
			else {
				var right = stack.pop();
				var left = stack.pop();
				switch (token) {
					case "-":
						result = left-right;
						break;
					case "+":
						result = left+right;
						break;
					case "/":
						result = left/right;
						break;
					case "*":
						result = left*right;
						break;
					case "^":
						result = Math.pow(left, right);
						break;
					case "%":
						result = left%right;
						break;
					case "=":
						result = (left==right);
						break;
					case "<":
						result = (left<right);
						break;
					case ">":
						result = (left>right);
						break;
				}
			}
			//push result to output stack
            stack.push(result);
		}
		//symbolic operations would be handled above, but this catches them for now.
		else if (Expression.regex.variable.test(token)) {
			throw new Error("Symbolic operations not yet supported.");
		}
	});
	if (stack.length !== 1) throw new Error("Incomplete expression (extra items on stack).");
	return stack.pop(); //last item on output stack should be result
};

/**
 * Returns a duplicate of this.
 * @return {Expression} a clone of this
 */
Expression.prototype.clone = function() {
	return new Expression(this.tokens, this.originalString);
};

/**
 * Returns the precedence of a given operator
 * @param {string} op operator
 * @return {number} precedence
 */
Expression.getPrecedence = function(op) {
	return Expression.precedenceList.indexOf(op);
};

/**
 * Efficiently determines if a *parsed* token is an operator.
 * @param {string} parsed token
 * @return {boolean} whether or not token is an operator
 */
Expression.isOperator = function(str) {
	return str === "+" ||
		   str === "-" ||
		   str === "*" ||
		   str === "/" ||
		   str === "^" ||
		   str === "=" ||
		   str === "<" ||
		   str === ">" ||
		   str === "%";
};

/**
 * Efficiently determines if a *parsed* token is a function name
 * @param {string} parsed token
 * @return {boolean} whether or not token is a function name
 */
Expression.isFunctName = function(str) {
	if (typeof str === "number") return false;
	if (str.length < 2) return false;
	return true;
};

/**
 * Float equality check
 * @param {number} x
 * @param {number} y
 * @return {boolean} equality
 */
Expression.floatEquals = function(x,y) {
	return Math.abs(x-y) <= Expression.FLOAT_TOL;
};

/**
 * Used internally to convert list of tokens from infix to postfix notation.
 * @param {array} infixTokens array of parsed tokens (strings)
 */
Expression.infixToPostfix = function(infixTokens) {
	//shunting-yard algorithm
	//https://en.wikipedia.org/wiki/Shunting-yard_algorithm#The_algorithm_in_detail
	var output = [], opstack = [];
	for (var i=0; i<infixTokens.length; i++) {
		var token = infixTokens[i];
		//push numbers to output stack
		if (Expression.regex.number.is(token)) {
			output.push(parseFloat(token));
		}
		//push variables to output stack
		else if (Expression.regex.variable.is(token)) {
			output.push(token);
		}
		//push function names to output stack
		else if (Expression.regex.functname.is(token)) {
			opstack.push(token);
		}
		//handle function argument separators
		else if (token === ",") {
			//search for the first open parenthesis
			var found = false;
			while (opstack.length > 0) {
				if (opstack[opstack.length-1] === "(") {
					found = true;
					break;
				}
				//move operations onto the output stack until then
				output.push(opstack.pop());
			}
			if (!found) throw new Error("Mismatched parenthesis in function.");
		}
		else if (Expression.regex.operator.is(token)) {
			while (opstack.length > 0) {
				var nextOp = opstack[opstack.length-1];
				if (token === "=" || token === "^" || token === "<" || token === ">") {
					if (Expression.getPrecedence(token) < Expression.getPrecedence(nextOp)) {
						output.push(opstack.pop());
					}
					else {
						break;
					}
				}
				else if (Expression.getPrecedence(token) <= Expression.getPrecedence(nextOp)) {
					output.push(opstack.pop());
				}
				else {
					break;
				}
			}
			opstack.push(token);
		}
		else if (token === "(") {
			opstack.push(token);
		}
		else if (token === ")") {
			var found = false;
			while (opstack.length > 0) {
				if (opstack[opstack.length-1] === "(") {
					found = true;
					opstack.pop();
					if (Expression.regex.functname.is(opstack[opstack.length-1])) {
						output.push(opstack.pop());
					}
					break;
				}
				output.push(opstack.pop());
			}
			if (!found) throw new Error("Mismatched parenthesis.");
		}
	}
	while (opstack.length > 0) {
		var op = opstack.pop();
		if (op === "(") throw new Error("Mismatched parenthesis.");
		output.push(op);
	}
	return output;
};

String.prototype.test = function(regex) {
	return regex.test(this);
};
RegExp.prototype.is = function(string) {
	var match = this.exec(string);
	return match && match[0] === string;
};
