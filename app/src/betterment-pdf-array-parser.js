var BettermentPdfArrayParser = function() {
};

// Two possible date formats, the first one from brokerage and the second one from 401(k)
BettermentPdfArrayParser.bettermentDateRe = /(?:\w{3} \d{1,2} \d{4}|\w{3} \d{1,2}(?:th|st|nd|rd), \d{4})/;

BettermentPdfArrayParser.prototype.parse = function(array) {
  var transactions = [];
  var inTransactionSection = false;
  var afterHeaderRow = false;
  var date;
  var descriptionArray = [];
  var goal;
  var isDescriptionDone = false;
  var dateAfterTransaction = false; // assume old format (date|txn) until we detect otherwise

  if (is2026Format(array)) {
    console.debug("Parsing PDF using 2026 format logic")
    return parse2026Format(array);
  } else if (is20161111Format(array)) {
    console.debug("Parsing PDF using 2016 format logic")
    return parse20161111Format(array);
  } else {
    console.debug("Parsing PDF using pre-2016 format logic")
    //
    // Old format
    //
    array.forEach(function(line) {
      goal = parseGoal(line, goal);

      // See if we're in a transaction section
      if(isAfterHeaderRow(line)) {
        afterHeaderRow = true;
      }

      if(afterHeaderRow) {
        //console.log('Line: ' + line);

        // Seeing a date after the header row is when we know we are in a transaction activity section.
        // If this transaction contains a date & description, consume & store them
        if(line[0].match(BettermentPdfArrayParser.bettermentDateRe)) {
            date = line.shift();
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

          transactions.push(createTransaction(
            goal,
            date,
            line[0], // ticker
            descriptionArray,
            line[1], // price
            line[3] // amount
          ));
        } else if(date && !isDescriptionDone) {
            // Add description items while we have a date but not a transaction
            Array.prototype.push.apply(descriptionArray, line);
        }
      }
    });
  }
  return transactions;
};


/*
 * Is new column order of descr then date
 */
function is20161111Format(pdfArray) {;
  var afterHeaderRow = false;

  return pdfArray.some(function(line) {
    if(isAfterHeaderRow(line)) {
      afterHeaderRow = true;
    }

    if(afterHeaderRow) {
      // if new format where it's descr | date instead of date |descr
      if(line.length >= 7 && line.slice(-7, -6)[0].match(BettermentPdfArrayParser.bettermentDateRe)) {
        return true;
      }
    }

    return false;
  });
}


function parse20161111Format(pdfArray) {
  var goal;
  var currentDescription = [];
  var lastDate = '';
  var transactions = [];
  var afterHeaderRow = false;

  pdfArray.forEach(function(line) {
    goal = parseGoal(line, goal);

    if(isHeaderRow(line)) {
      afterHeaderRow = true;
      // The current description is reset every time we see a header row since otherwise we accumulate
      // description items from things that are not actually part of transactions like other parts of
      // the PDF.
      currentDescription = [];
    }

    if(afterHeaderRow) {
      line.reverse();

      // accumulate descr items
      if(line.length == 1) {
        currentDescription.push(line[0]);
      }

      // transaction line if len > 6 and has $xx.xx
      if(line.length >= 6 && line[0].match(/\$[\d.,]+\.\d{2}/)) {
        if(line.length == 8) {
          currentDescription.push(line[7]);
        }

        if(line.length >= 7) {
          lastDate = line[6];
        }

        if(currentDescription.length > 0) {
          lastDescription = currentDescription;
        }

        transactions.push(createTransaction(
          goal,
          lastDate,
          line[5], // ticker
          lastDescription,
          line[4], // price
          line[2] // amount
        ));

        currentDescription = [];
      }
    }
  });

  return transactions;
}


/*
 * For the 20161111 format. Added since there are two kinds of header rows which indicate the
 * the start of a transaction section.
 */
function isHeaderRow(line) {
  return arraysEqual(["Fund","Price","Shares","Value","Shares","Value"], line) ||
      arraysEqual(["Value","Shares","Value"], line)
}


function arraysEqual(a, b) {
  return a.length == b.length && a.every(function(el, i) {return el === b[i];});
}


function parseGoal(line, goal) {
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

  // Case #5 - New format in 2026
  if (!goal && line.length === 1 && line[0].match(/^[a-zA-Z ]+ - [a-zA-Z ]+$/)) {
    goal = line[0];
  }

  return goal;
}


/*
 * 4 kinds of header rows, 1) in which there are superscripts on the column (line[0]),
 * and another 2) in which there are no superscripts (or footnotes) on the row (line[2]),
 * and 3), for the new (as of Q12016) quarterly 401(k) PDFs which have CAPITAL LETTERS.
 * 4) For brokerage statements generated after Aug 19.
 */
function isAfterHeaderRow(line) {
  return line.length > 0 && (
    line[0] == 'Portfolio/Fund' || // case 1
    line[2] == 'Portfolio/Fund' || // case 2
    line[0] == 'PORTFOLIO/FUND' || // case 3
    line[0] == 'Fund' // case 4
  );
}


function getQuantity(price, amount) {
  return (amount/price).toFixed(6);
}


function getCashValue(dollarAmountString) {
  return dollarAmountString.replace('$','').replace(',','');
}


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


function createTransaction(goal, date, ticker, descriptionArray, price, amount, quantity) {
  var priceValue = getCashValue(price);
  var amountValue = getCashValue(amount);
  var quantityValue = quantity ? quantity : getQuantity(priceValue, amountValue);

  return {
    account: goal,
    description: descriptionArray.join(" "),
    date: parseBettermentDate(date),
    ticker: getTicker(ticker),
    price: priceValue,
    amount: amountValue,
    quantity: parseFloat(quantityValue).toFixed(6),
  };
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
  if (!dateStr) return null;
  const yyyymmddRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (yyyymmddRegex.test(dateStr)) {
    // Append 'T00:00:00Z' to force UTC parsing for YYYY-MM-DD format
    return new Date(dateStr + 'T00:00:00Z');
  } else {
    // Parse other formats in local time
    return new Date(dateStr.replace(/(?:th|st|nd|rd)/, ''));
  }
}

function is2026Format(pdfArray) {
  return pdfArray.some(line => arraysEqual(["Ticker","Type","Price","Shares","Value"], line));
}

function parse2026Format(pdfArray) {
  var transactions = [];
  var lastGoalFound = "";
  var date = "";
  var inTradesSection = false;

  // Find the date anywhere in the array
  for (var i = 0; i < pdfArray.length; i++) {
    var line = pdfArray[i];
    if (line.length === 1 && line[0].match(/^\d{4}-\d{2}-\d{2}$/)) {
      date = line[0];
      break;
    }
  }

  for (var i = 0; i < pdfArray.length; i++) {
    var line = pdfArray[i];

    // Match account names - single element lines that aren't known headers or dates
    if (line.length === 1) {
      var content = line[0];
      if (!content.match(/^\d{4}-\d{2}-\d{2}$/) && // Not a date
          !content.match(/^\d+$/) && // Not a page number
          content !== "TRADES" &&
          content !== "POSITION TRANSFERS" &&
          content !== "Ticker" &&
          content !== "Type" &&
          content !== "Price" &&
          content !== "Shares" &&
          content !== "Value" &&
          content !== "ACCOUNT HOLDER" &&
          content !== "IN THIS DOCUMENT" &&
          content !== "Daily Activity Details" &&
          content !== "Betterment" &&
          !content.match(/^Account #/) &&
          !content.match(/^[A-Z ]+ \(ACCT # \d+\)$/) &&
          !content.endsWith("Goal") &&
          content.trim() !== "") {
         lastGoalFound = content;
      }
    }

    if (arraysEqual(["Ticker","Type","Price","Shares","Value"], line)) {
      inTradesSection = true;
      continue;
    }

    if (line.length === 1 && line[0] === "POSITION TRANSFERS") {
        inTradesSection = false;
        continue;
    }

    if (inTradesSection && line.length === 5) {
      var ticker = line[0];
      var type = line[1];
      var price = line[2];
      var shares = line[3];
      var amount = line[4];

      // Sell transactions have positive shares in the PDF, but we need them to be negative
      var quantity = parseFloat(shares);
      if (type.toLowerCase() === 'sell') {
        quantity = quantity * -1;
        let numericAmount = parseFloat(getCashValue(amount));
        if (numericAmount > 0) {
          amount = "-" + amount;
        }
      }

      transactions.push(createTransaction(
        lastGoalFound,
        date, // Use the single date found
        ticker,
        [type], // Description
        price,
        amount,
        quantity // Pass shares directly
      ));
    }
  }

  return transactions;
}

module.exports.BettermentPdfArrayParser = BettermentPdfArrayParser;
