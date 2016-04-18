var Expression = function(str, b) {
	if (typeof str === "string") {
		//fix implied multiply
		str = str.replace(new RegExp(Expression.regex.impliedMultiply, "g"), "$1*$2");

		//parse expression
		this.tokens = str.match(new RegExp(Expression.regex.token, "g"));
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

/**
 * Contains implementations of all functions that can be parsed.
 * Each function should explicitly define its arguments (instead of using the arguments object).
 */
Expression.functionMap = {
	abs: function(x){return Math.abs(x);},
	sin: function(x){return Math.sin(x);},
	cos: function(x){return Math.cos(x);},
	tan: function(x){return Math.tan(x);},
	rand: function(){return Math.random();},
	ln: function(x){return Math.log(x);},
	log: function(x){return Math.log10(x);},
	logn: function(x,n){return Math.log(x)/Math.log(n);},
	sqrt: function(x){return Math.sqrt(x);}
};

/**
 * Evaluates this experssion over an interval and passes the input, result, and a data object
 * to a function func.
 */
Expression.prototype.evalInterval = function(func, variable, low, high, step, initialData) {
	var sub = {};
	var data = typeof initialData === "undefined" ? {} : initialData;
	if (typeof step === "undefined") step = (high-low)/1000;
	for (var i=low; i<=high; i+=step) {
		sub[variable] = i;
		var val = this.eval(sub);
		func(i, val, data);
	}
	return data;
};

/**
 * Minimizes a single variable over a given interval at a given step resolution.
 */
Expression.prototype.nmin = function(variable, low, high, step) {
	return this.evalInterval(function(i, val, data){
		if (val < data.minVal) {
			data.input = i;
			data.minVal = val;
		}
	}, variable, low, high, step, {
		input: 0,
		minVal: Infinity
	});
};

/**
 * Solves for a single variable over a given interval at a given step resolution.
 */
Expression.prototype.nsolve = function(variable, value, low, high, step) {
	return this.evalInterval(function(i, val, data){
		var error = Math.abs(val-value);
		if (error < data.error) {
			data.input = i;
			data.error = error;
		}
	}, variable, low, high, step, {
		input: 0,
		error: Infinity
	});
};

/**
 * Replaces variables with other values from a map vars.
 */
Expression.prototype.substitute = function(vars) {
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
 */
Expression.prototype.eval = function(vars) {
	//optional variable substitution
	var expr = this.substitute(vars);

	//evaluate postfix expression
	var stack = [];
	expr.tokens.forEach(function(token){
		if (Expression.regex.number.test(token)) {
			stack.push(parseFloat(token));
		}
		else if (Expression.regex.operator.test(token) || Expression.regex.functname.test(token)) {
			// if (stack.length < 2) throw new Error("Incomplete expression (not enough operands).");
			var result = 0;
			if (Expression.functionMap.hasOwnProperty(token)) {
				var f = Expression.functionMap[token];
				var nargs = f.length, args = [];
				for (var i=0; i<nargs; i++) args.push(stack.pop());
				result = f.apply(this, args);
			}
			else { //operator
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
				}
			}
            stack.push(result);
		}
		else if (Expression.regex.variable.test(token)) {
			throw new Error("Symbolic operations not yet supported.");
		}
	});
	if (stack.length !== 1) throw new Error("Incomplete expression (extra items on stack).");
	return stack.pop();
};

/**
 * Returns a duplicate of this.
 */
Expression.prototype.clone = function() {
	return new Expression(this.tokens, this.originalString);
};

/**
 * Contains patterns that match various types of tokens.
 */
Expression.regex = {
	number: "(?:(?:\\d*\\.)?\\d+)",
	funct: "\\w{2,}(?=\\()",
	functname: "\\w{2,}", //function names require 2+ characters for now to be distinct from variables
	variable: "\\w{1}",
	operator: "[+\\-*%^/=]",
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

Expression.precedenceList = ["=","-","+","*","/","%","^"];
Expression.getPrecedence = function(op) {
	return Expression.precedenceList.indexOf(op);
};

/**
 * Used internally to convert list of tokens from infix to postfix notation.
 */
Expression.infixToPostfix = function(infixTokens) {
	//shunting-yard algorithm
	//https://en.wikipedia.org/wiki/Shunting-yard_algorithm#The_algorithm_in_detail
	var output = [], opstack = [];
	for (var i=0; i<infixTokens.length; i++) {
		var token = infixTokens[i];
		if (Expression.regex.number.is(token) || Expression.regex.variable.is(token)) {
			output.push(token);
		}
		else if (Expression.regex.functname.is(token)) {
			opstack.push(token);
		}
		else if (token === ",") {
			var found = false;
			while (opstack.length > 0) {
				if (opstack[opstack.length-1] === "(") {
					found = true;
					break;
				}
				output.push(opstack.pop());
			}
			if (!found) throw new Error("Mismatched parenthesis in function.");
		}
		else if (Expression.regex.operator.is(token)) {
			while (opstack.length > 0) {
				var nextOp = opstack[opstack.length-1];
				if (token === "=" || token === "^") {
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
	};
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
