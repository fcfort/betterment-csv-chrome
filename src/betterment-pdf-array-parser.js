var BettermentPdfArrayParser = function() {
};

BettermentPdfArrayParser.bettermentDateRe = /\w{3} \d{1,2} \d{4}/; 

BettermentPdfArrayParser.prototype.parse = function(array){
  var transactions = [];
  var inTransactionSection = false;
  var afterHeaderRow = false;
  var date;
  var descriptionArray = [];
  var goal;
  
  array.forEach(function(line) {
    // Grab goal
  	if(!goal && line.length == 1 && line[0].endsWith("Goal")) {
  		goal = line[0];
  	}

    // See if we're in a transaction section
    if(line.length > 0 && line[0] == 'Portfolio/Fund') {
      afterHeaderRow = true;
    }

    // If we're in a transaction activity section
    if(afterHeaderRow) {
      var isTransactionLine = line.some(function(str) {
        return str.startsWith("Stocks / ") || str.startsWith("Bonds / ");
      });

      // If the line contains a transaction
      if(isTransactionLine) {
        // If this transaction contains a date & description, consume & store them
        if(line[0].match(BettermentPdfArrayParser.bettermentDateRe)) {
          date = new Date(line.shift());
          descriptionArray = [line.shift()];
        }
          
        ticker = line[0].split(" / ")[1];
        price = line[1].substr(1).replace(',','');
        amount = line[3].substr(1).replace(',','');
        quantity = (amount/price).toFixed(6);

        transactions.push({
          account: goal,
          description: descriptionArray.join(" "),
          date: date,
          ticker: ticker,
          price: price,
          amount: amount,
          quantity: quantity,
        });        
      } else {
        if(date) {
          // Add description items while we have a date but not a transaction
          Array.prototype.push.apply(descriptionArray, line);
        } else {
          if(line.length == 1 && line[0].match(BettermentPdfArrayParser.bettermentDateRe)) {
            // Create a date if we're not in a transaction and we haven't found a date before
            date = new Date(line[0]);
            // Start new description            
            descriptionArray = [];
          }
        }
      }
    }
  });

  return transactions;
};

// For mocha
if(module && module.exports) {
  module.exports.BettermentPdfArrayParser = BettermentPdfArrayParser;
}
