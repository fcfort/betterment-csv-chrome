var pdfToTextArray = require('./pdf-to-text-array');
var TransactionsToCsv = require('./transactions-to-csv');
var TransactionsToQif = require('./transactions-to-qif');
var pdfparser = require('./betterment-pdf-array-parser');
var $ = require('jquery');
var MutationSummary = require('mutation-summary');

function createTransactionRegex() {
  return new RegExp(
    'app/quarterly_statements/\\d+' +
    '|' +
    'app/legacy_quarterly_statements/\\d+' +
    '|' +
    'app/transaction_documents/\\d+'
  );
}

var transactionPdfRe = createTransactionRegex();
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
  return new Promise(function(resolve) {
    $.ajax({url: pdfUrl}).done(function(data, textStatus, jqXHR) {
      // content-disposition: attachment; filename="Betterment_401k_Quarterly_Statement_2015-12-31.pdf"
      var contentDisposition = jqXHR.getResponseHeader('content-disposition');
      var found = contentDisposition.match(/filename="(.*?)"/);
      resolve(found[1]);
    });
  });
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
