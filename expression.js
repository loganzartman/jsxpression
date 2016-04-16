var Expression = function(str) {
	//fix implied multiply

	//parse expression
	this.tokens = str.match(new RegExp(Expression.regex.token, "g"));
	console.log(this.tokens);
	this.tokens = Expression.infixToPostfix(this.tokens);
	console.log(this.tokens);
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
		"|" + Expression.regex.operator;
	Object.keys(Expression.regex).forEach(function(key){
		Expression.regex[key] = new RegExp(Expression.regex[key], "i");
	});
})();
Expression.precedenceList = ["-","+","/","*","^","="];
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