var BettermentPdfArrayParser = function() {
};

// Two possible date formats, the first one from brokerage and the second one from 401(k)
BettermentPdfArrayParser.bettermentDateRe = /(?:\w{3} \d{1,2} \d{4}|\w{3} \d{1,2}(?:th|st|nd|rd), \d{4})/; 

BettermentPdfArrayParser.prototype.parse = function(array){
  var transactions = [];
  var inTransactionSection = false;
  var afterHeaderRow = false;
  var date;
  var descriptionArray = [];
  var goal;
  var isDescriptionDone = false;
  
  array.forEach(function(line) {
    // Two goal cases, one for everything but quarterly statements
  	if(!goal && line.length == 1 && line[0].endsWith("Goal")) {
  		goal = line[0];
  	}
    // Another for quarterly brokerage statements, which look like "BUILD WEALTH"
    // No check if goal is not null since a quarterly PDF will have many
    // different goal transaction sections
    if(line.length == 1 && line[0].match(/^[A-Z ]+$/)) {
      goal = toTitleCase(line[0]) + ' Goal';
    }

    // Another case for quarterly 401(k) statements
    // This is currently a hack due to issue #15
    if(line.length == 3 && line[2].match(/^(?:Traditional|Roth) 401\(k\)$/)) {      
      goal = line[2];
    }

    // See if we're in a transaction section
    if(line.length > 0 && line[0] == 'Portfolio/Fund') {
      afterHeaderRow = true;
    }

    // If we're in a transaction activity section
    if(afterHeaderRow) {
      var isTransactionLine = line.some(function(str) {
        return str.toLowerCase().startsWith("stocks / ") || str.toLowerCase().startsWith("bonds / ");
      });

      // If the line contains a transaction
      if(isTransactionLine) {
        // If this transaction contains a date & description, consume & store them
        if(line[0].match(BettermentPdfArrayParser.bettermentDateRe)) {
          date = parseBettermentDate(line.shift());
          descriptionArray = [line.shift()];
        }
        
        // Now that we are using the description, stop accumulating more description fields.
        isDescriptionDone = true;

        ticker = line[0].split(" / ")[1];
        price = line[1].replace('$','').replace(',','');
        amount = line[3].replace('$','').replace(',','');
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
        if(date && !isDescriptionDone) {
          // Add description items while we have a date but not a transaction
          Array.prototype.push.apply(descriptionArray, line);
        } else {
          if(line.length == 1 && line[0].match(BettermentPdfArrayParser.bettermentDateRe)) {
            // Create a date if we're not in a transaction and we haven't found a date before
            date = parseBettermentDate(line[0]);
            // Start new description            
            descriptionArray = [];
            isDescriptionDone = false;
          }
        }
      }
    }
  });

  return transactions;
};

// http://stackoverflow.com/a/196991
function toTitleCase(str) {
  return str.replace(
    /\w\S*/g, function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    }
  );
}

function parseBettermentDate(dateStr) {
  return new Date(dateStr.replace(/(?:th|st|nd|rd)/, ''));
}

module.exports.BettermentPdfArrayParser = BettermentPdfArrayParser;
