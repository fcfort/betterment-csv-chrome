var BettermentPdfArrayParser = function() {};

BettermentPdfArrayParser.prototype.parse = function(array){
  var transactions = [];
  var inTransactionSection = false;
  var date;
  var description;
  var goal;

  array.forEach(function(line) {
  	if(!goal && line.length == 1 && line[0].endsWith("Goal")) {
  		goal = line[0];
  	}

  	inTransactionSection = line.some(function(str) {
  	  return str.startsWith("Stocks / ") || str.startsWith("Bonds / ");
  	});

  	if(inTransactionSection) {
  		var offset = 0;
  		if(!date) {
  			// "Feb 19 2016"
  			date = new Date(line.shift());
  			description = line.shift();
  		}
  			// ["Stocks / VTI","$96.96","0.166","$16.11","1.995","$193.42"]
  		ticker = line[0].split(" / ")[1];
  		price = line[1].substr(1).replace(',','');
  		amount = line[3].substr(1).replace(',','');
      quantity = (amount/price).toFixed(6);

  		var transaction = {
  			// global
  			account: goal,
  			description: description,
  			date: date,
  			// line
  			ticker: ticker,
  			price: price,
  			amount: amount,
  			quantity: quantity,
  		};

  		transactions.push(transaction);
  	}
  });

  return transactions;
};


if(module && module.exports) {
  module.exports.BettermentPdfArrayParser = BettermentPdfArrayParser;
}
