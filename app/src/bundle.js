(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

// For mocha testing
var module = module || {};
if(module && module.exports) {
  module.exports.BettermentPdfArrayParser = BettermentPdfArrayParser;
}

module.exports.BettermentPdfArrayParser = BettermentPdfArrayParser;

},{}],2:[function(require,module,exports){
var tran2csv = require('./transactions-to-csv');
var pdfparser = require('./betterment-pdf-array-parser');

/* Only documents beginning with these names will be converted to .csv */
var transactionPdfStrings = [
  'Betterment_Deposit_',
  'Betterment_Dividend_Reinvestment_',
  'Betterment_Quarterly_Statement',
  'Betterment_Account_Transfer_From_',
  'Betterment_Account_Transfer_To_'
];

function createTransactionRegex() {
  // Two cases
  // 1. app/quarterly_statements for 401k quarterly statements
  // 2. document/blah.pdf for all other PDFs
  return new RegExp(
    '.*?/(?:app/quarterly_statements/\\d+|document/(?:' + transactionPdfStrings.join('|') + ').*?\\.pdf)'
  );
}

var transactionPdfRe = createTransactionRegex();
var transactionPdfNameRe = /.*?\/document\/(.*?)\.pdf/;

function handleNewAnchors(summaries) {
  var anchorSummaries = summaries[0];

  var pdftoArray = new pdfparser.BettermentPdfArrayParser();

  anchorSummaries.added.forEach(function(newEl) {
    var pdfUrl = newEl.href;
    if(transactionPdfRe.test(pdfUrl)) {
      pdfToTextArray(newEl.href).then(function(result) {
        var transactions = pdftoArray.parse(result);
        csvBlob = tran2csv.TransactionsToCsv(transactions);
        $(newEl).before(createCsvUrl(csvBlob, pdfUrl));
      });
    }
  });
}

function createCsvUrl(csvBlob, pdfUrl) {
  var a = document.createElement('a');
  a.href = window.URL.createObjectURL(csvBlob);

  // Grab filename for CSV from PDF URL.
  // https://wwws.betterment.com/document/Betterment_Deposit_2016-02-18.pdf
  var found = pdfUrl.match(transactionPdfNameRe);
  if(found) {
    a.download = found[1] + '.csv';  
  } else {
    a.download = 'transactions.csv';
  }

  a.textContent = '.csv';
  a.style = 'font-size: 12px';
  return a;
}

var observer = new MutationSummary({
  callback: handleNewAnchors,
  queries: [{ element: 'a[href]' }]
});


/**
 * Takes a PDF url and returns an array of arrays. Each row in the array is a
 * new line and each element in the row array is a separate piece of text from
 * the document.
 */
function pdfToTextArray(pdfUrl) {
  return PDFJS.getDocument(pdfUrl).then(function(pdf) {
   var lineOffset = 0;
   var textArray = [[]];

   var pages = [];
   for (var i = 0; i < pdf.numPages; i++) {
       pages.push(i);
   }
  /*
   * This is a bit poorly documented but basically each section of text on the PDF
   * is represented by a six element transform array that PDF.js uses to overlay
   * the text content back onto the rendering of the PDF document. 
   *
   * I simply use the vertical offset of the text item (transform[5]) to determine
   * where a new "line" is in the PDF document. It's a bit hacky but it works for
   * the most part.
   * 
   * See the full details here:
   * https://github.com/mozilla/pdf.js/blob/master/src/display/text_layer.js#L60
   */
   return Promise.all(pages.map(function(pageNumber) {
       return pdf.getPage(pageNumber + 1).then(function(page) {       
           return page.getTextContent().then(function(textContent) {
             var lastOffset = 0;
               return textContent.items.map(function(item) {
                  var offset = item.transform[5];

                  if(offset != lastOffset) {
                    lineOffset++;
                    textArray.push([]);
                  }

                  textArray[lineOffset].push(item.str);

                  lastOffset = item.transform[5];
               }).join(' ');
           });
       });
   })).then(function(pages) {
    return textArray;
   });
  });
}

},{"./betterment-pdf-array-parser":1,"./transactions-to-csv":3}],3:[function(require,module,exports){
var TransactionsToCsv = function(transactions) {
  var headers = [
    'Account',
    'Date',
    'Transaction',
    'Portfolio/Fund',
    'Price',
    'Shares',
    'Value'
  ];

  var tranRows = [headers.join()];
  tranRows = tranRows.concat(transactions.map(function(tran) {
    return [
      tran.account, 
      tran.date.toLocaleDateString('en-US'), 
      tran.description,
      tran.ticker,    
      tran.price,
      tran.quantity,
      tran.amount
    ].join()
  }));

  var tranCsv = tranRows.join('\n');

  return new Blob([tranCsv], {type: 'text/csv', endings: 'native'});  
};

// For mocha testing
var module = module || {};
if(module && module.exports) {
  module.exports.TransactionsToCsv = TransactionsToCsv;
}

module.exports.TransactionsToCsv = TransactionsToCsv;

},{}]},{},[2]);
