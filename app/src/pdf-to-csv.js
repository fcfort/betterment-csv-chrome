var pdfToTextArray = require('./pdf-to-text-array');
var TransactionsToCsv = require('./transactions-to-csv');
var TransactionsToQif = require('./transactions-to-qif');
var pdfparser = require('./betterment-pdf-array-parser');
var $ = require('jquery');
var MutationSummary = require('mutation-summary');

/* Only documents beginning with these names will be converted to .csv */
var transactionPdfStrings = [
  'Betterment_Account_Transfer_From_',
  'Betterment_Account_Transfer_To_',
  'Betterment_Deposit_',
  'Betterment_Dividend_Reinvestment_',
  'Betterment_Position_Only_Transfer_All_From_',
  'Betterment_Position_Only_Transfer_To_',
  'Betterment_Quarterly_Statement',
  'Betterment_Rebalance',
];

function createTransactionRegex() {
  return new RegExp(
    // 1. app/quarterly_statements for 401k quarterly statements. Now includes a "legacy"
    //    for quarterly PDFs generated before 2016-Q4.
    '.*?/(?:app/(?:legacy_)?quarterly_statements/\\d+|document/(?:' +
    // 2. document/blah.pdf for all other PDFs
    transactionPdfStrings.join('|') +
    // 3. General case for all PDF types Betterment_DATE
    "|Betterment_.*_\\d{4}-\\d{2}-\\d{2}" +
    ').*?\\.pdf)'
  );
}

var quarterlyPdfUrlRe = /.*?\/app\/quarterly_statements\/\d+.*/;
var transactionPdfRe = createTransactionRegex();
var transactionPdfNameRe = /.*?\/document\/(.*?)\.pdf/;
var transactionParser = new pdfparser.BettermentPdfArrayParser();

// Global variable for options
var outputFormatOptions;

// Async call to get options
chrome.storage.sync.get({
  csvOutputDesired: true,
  qifOutputDesired: false
}, function(items) {
  // Store results
  outputFormatOptions = items;

  // Create observer for anchor tags
  new MutationSummary({
    callback: handleNewAnchors,
    queries: [{ element: 'a[href]' }]
  });
});

function handleNewAnchors(summaries) {
  var anchorSummaries = summaries[0];

  anchorSummaries.added.forEach(function(anchorEl) {
    var pdfUrl = anchorEl.href;

    if(transactionPdfRe.test(pdfUrl)) {
      pdfToTextArray(pdfUrl).then(function(textArray) {
        var transactions = transactionParser.parse(textArray);

        getFilenamePromise(pdfUrl).then(function(filename) {
          if(outputFormatOptions.csvOutputDesired) {
            var csv = TransactionsToCsv.convert(transactions);
            $(anchorEl).before(createDataUrl(csv, 'text/csv', filename, '.csv'));
          }

          if(outputFormatOptions.qifOutputDesired) {
            var qif = TransactionsToQif.convert(transactions);
            $(anchorEl).before(createDataUrl(qif, 'application/qif', filename, '.qif'));
          }
        });
      });
    }
  });
}

// Grab filename (without .pdf at the end) from PDF URL. Is a promise because we
// have to make an ajax call if it is a quarterly 401k PDF.
// https://wwws.betterment.com/document/Betterment_Deposit_2016-02-18.pdf
function getFilenamePromise(pdfUrl) {
  if(quarterlyPdfUrlRe.test(pdfUrl)) {
    return new Promise(function(resolve) {
      $.ajax({url: pdfUrl}).done(function(data, textStatus, jqXHR) {
        // content-disposition: attachment; filename="Betterment_401k_Quarterly_Statement_2015-12-31.pdf"
        var contentDisposition = jqXHR.getResponseHeader('content-disposition');
        var found = contentDisposition.match(/(Betterment.*?)\.pdf/);
        resolve(found[1]);
      });
    });
  } else {
    var found = pdfUrl.match(transactionPdfNameRe);
    if(found) {
      return Promise.resolve(found[1]);
    } else {
      return Promise.resolve('transactions');
    }
  }
}

function createDataUrl(data, mimeType, filename, extension) {
  var blob = new Blob([data], {type: mimeType, endings: 'native'});
  var blobUrl = window.URL.createObjectURL(blob);

  var a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename + extension;
  a.textContent = extension;
  a.style = 'font-size: 12px';
  // Hack so that this a tag doesn't make the row disappear.
  a.setAttribute('data-no-toggle', 'true');
  return a;
}
