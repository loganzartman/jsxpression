var Expression = function(str) {
	if (typeof str === "string") {
		//fix implied multiply

		//parse expression
		this.tokens = str.match(new RegExp(Expression.regex.token, "g"));
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
	}
};
Expression.DEBUG = true;
/**
 * Minimizes a single variable over a given interval at a given step resolution.
 */
Expression.prototype.nmin = function(variable, low, high, step) {
	var min = Infinity, x = 0;
	var sub = {};
	if (typeof step === "undefined") step = (high-low)/1000;
	for (var i=low; i<=high; i+=step) {
		sub[variable] = i;
		var val = this.eval(sub);
		if (val < min) {
			min = val;
			x = i;
		}
	}
	return {
		input: x,
		value: min
	};
};
/**
 * Solves for a single variable over a given interval at a given step resolution.
 */
Expression.prototype.nsolve = function(variable, value, low, high, step) {
	var min = Infinity, x = 0;
	var sub = {};
	if (typeof step === "undefined") step = (high-low)/1000;
	for (var i=low; i<=high; i+=step) {
		sub[variable] = i;
		var val = this.eval(sub);
		if (Math.abs(value-val) < min) {
			min = Math.abs(value-val);
			x = i;
		}
	}
	return {
		input: x,
		error: min
	};
};
Expression.prototype.eval = function(vars) {
	var expr = this.clone();
	
	//optional variable substitution
	if (typeof vars === "object") {
		expr.tokens = expr.tokens.map(function(token){
			if (vars.hasOwnProperty(token)) {
				return vars[token];
			}
			return token;
		});
	}

	//evaluate postfix expression
	var stack = [];
	expr.tokens.forEach(function(token){
		if (Expression.regex.number.test(token)) {
			stack.push(parseFloat(token));
		}
		else if (Expression.regex.operator.test(token)) {
			if (stack.length < 2) throw new Error("Incomplete expression (not enough operands).");
            var right = stack.pop();
            var left = stack.pop();
            var result = 0;
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
                case "=":
                    result = (left==right);
                    break;
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
Expression.prototype.clone = function() {
	return new Expression(this.tokens);
};
Expression.regex = {
	number: "((?:\\d*\\.)?\\d+)",
	variable: "\\w",
	operator: "[+\\-*^/=]",
	parenthesis: "[()]"
};
(function(){
	Expression.regex.token = 
		"" + Expression.regex.number +
		"|" + Expression.regex.variable +
		"|" + Expression.regex.operator +
		"|" + Expression.regex.parenthesis;
	Object.keys(Expression.regex).forEach(function(key){
		Expression.regex[key] = new RegExp(Expression.regex[key], "i");
	});
})();
Expression.precedenceList = ["=","-","+","/","*","^"];
Expression.getPrecedence = function(op) {
	return Expression.precedenceList.indexOf(op);
};
Expression.infixToPostfix = function(infixTokens) {
	//shunting-yard algorithm
	//https://en.wikipedia.org/wiki/Shunting-yard_algorithm#The_algorithm_in_detail
	var output = [], opstack = [];
	for (var i=0; i<infixTokens.length; i++) {
		var token = infixTokens[i];
		if (Expression.regex.number.test(token) || Expression.regex.variable.test(token)) {
			output.push(token);
		}
		else if (Expression.regex.operator.test(token)) {
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