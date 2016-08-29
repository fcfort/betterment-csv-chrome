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
    // Four goal cases, one for everything but quarterly statements
  	if(!goal && line.length == 1 && line[0].endsWith('Goal')) {
  		goal = line[0];
  	}
    // Another for quarterly brokerage statements, which look like "BUILD WEALTH"
    // No check if goal is not null since a quarterly PDF will have many
    // different goal transaction sections
    if(line.length == 1 && line[0].match(/^[A-Z ]+$/)) {
      goal = toTitleCase(line[0]) + ' Goal';
    }

    // Case #3 - For quarterly 401(k) statements
    // This is currently a hack due to issue #15
    if(line.length == 3 && line[2].match(/^(?:Traditional|Roth) 401\(k\)$/)) {
      goal = line[2];
    }

    // Case #4 - New taxable account statements
    // Ex.: BUILD WEALTH (ACCT # 2345234752908347)
    if(line.length == 1 && line[0].match(/^[A-Z ]+ \(ACCT # \d+\)$/)) {
      var goalMatch = /(^[A-Z ]+) \(ACCT # \d+\)$/.exec(line[0])[1];
      // var goalMatch = line[0];
      goal = toTitleCase(goalMatch) + ' Goal';
    }

    // See if we're in a transaction section
    /*
     * 4 kinds of header rows, 1) in which there are superscripts on the column (line[0]),
     * and another 2) in which there are no superscripts (or footnotes) on the row (line[2]),
     * and 3), for the new (as of Q12016) quarterly 401(k) PDFs which have CAPITAL LETTERS.
     * 4) For brokerage statements generated after Aug 19.
     */
    if(line.length > 0 && (
        line[0] == 'Portfolio/Fund' || // case 1
        line[2] == 'Portfolio/Fund' || // case 2
        line[0] == 'PORTFOLIO/FUND' || // case 3
        line[0] == 'Fund' // case 4
      )
    ) {
      afterHeaderRow = true;
    }

    if(afterHeaderRow) {
      //console.log('Line: ' + line);
      //console.log('After header, date:' + date + ' desc:' + descriptionArray + ' isTransactionLine:' + isTransactionLine + ' isDescriptionDone:' + isDescriptionDone);

      // Seeing a date after the header row is when we know we are in a transaction activity section.
      // If this transaction contains a date & description, consume & store them
      if(line[0].match(BettermentPdfArrayParser.bettermentDateRe)) {
          date = parseBettermentDate(line.shift());
          // Sometimes dates appear on their own on a line so we don't always want to grab the rest.
          if(line.length > 0) {
            descriptionArray = [line.shift()];
          } else {
            descriptionArray = [];
          }
          isDescriptionDone = false;
      }

      var isTransactionLine = line.some(function(str) {
        return str.toLowerCase().startsWith("stocks / ") || str.toLowerCase().startsWith("bonds / ");
        }) ||
        // In order to match the Aug 19 PDF format:
        // || /^[A-Z]{3,6}$/.test(str)
        (line.length >= 6 && /^[A-Z]{3,4}$/.test(line[0]))
      ;

      // If the line contains a transaction
      if(isTransactionLine) {
        // Now that we are in a transaction, stop accumulating more description fields.
        isDescriptionDone = true;

        ticker = getTicker(line[0]);
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
      } else if(date && !isDescriptionDone) {
          // Add description items while we have a date but not a transaction
          Array.prototype.push.apply(descriptionArray, line);
      }
    }
  });

  return transactions;
};

function getTicker(tickerString) {
  // Old format e.g. "Stocks / VTI"
  if(tickerString.toLowerCase().startsWith('stocks / ') ||
     tickerString.toLowerCase().startsWith('bonds / ')
  ) {
    return tickerString.split(" / ")[1];
  } else {
    // New Aug 19 format e.g. just "VTI"
    return tickerString;
  }
}

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
