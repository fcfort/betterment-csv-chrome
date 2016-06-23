var pdfToTextArray = require('./pdf-to-text-array');
var tran2csv = require('./transactions-to-csv');
var pdfparser = require('./betterment-pdf-array-parser');
var $ = require('jquery');

/* Only documents beginning with these names will be converted to .csv */
var transactionPdfStrings = [
  'Betterment_Deposit_',
  'Betterment_Dividend_Reinvestment_',
  'Betterment_Quarterly_Statement',
  'Betterment_Account_Transfer_From_',
  'Betterment_Account_Transfer_To_',
  'Betterment_Position_Only_Transfer_All_From_',
  'Betterment_Position_Only_Transfer_To_'
];

function createTransactionRegex() {
  // Two cases
  // 1. app/quarterly_statements for 401k quarterly statements
  // 2. document/blah.pdf for all other PDFs
  return new RegExp(
    '.*?/(?:app/quarterly_statements/\\d+|document/(?:' + 
    transactionPdfStrings.join('|') + 
    ').*?\\.pdf)'
  );
}

var quarterlyPdfUrlRe = /.*?\/app\/quarterly_statements\/\d+.*/;
var transactionPdfRe = createTransactionRegex();
var transactionPdfNameRe = /.*?\/document\/(.*?)\.pdf/;
var pdftoArray = new pdfparser.BettermentPdfArrayParser();

var observer = new MutationSummary({
  callback: handleNewAnchors,
  queries: [{ element: 'a[href]' }]
});

function handleNewAnchors(summaries) {
  var anchorSummaries = summaries[0];

  anchorSummaries.added.forEach(function(newEl) {
    var pdfUrl = newEl.href;
    if(transactionPdfRe.test(pdfUrl)) {
      pdfToTextArray(pdfUrl).then(function(result) {
        var transactions = pdftoArray.parse(result);
        var csvBlob = tran2csv.TransactionsToCsv(transactions);

        getFilenamePromise(pdfUrl).then(function(filename) {
          $(newEl).before(createCsvUrl(csvBlob, pdfUrl, filename));
        });
      });
    }
  });
}

// Grab filename for CSV from PDF URL. Is a promise because we have to make
// an ajax call if it is a quarterly 401k PDF.
// https://wwws.betterment.com/document/Betterment_Deposit_2016-02-18.pdf
function getFilenamePromise(pdfUrl) {
  if(quarterlyPdfUrlRe.test(pdfUrl)) {
    return new Promise(function(resolve) {
      $.ajax({url: pdfUrl}).done(function(data, textStatus, jqXHR) {
        // content-disposition: attachment; filename="Betterment_401k_Quarterly_Statement_2015-12-31.pdf"
        var contentDisposition = jqXHR.getResponseHeader('content-disposition');
        var found = contentDisposition.match(/(Betterment.*?)\.pdf/);
        resolve(found[1] + '.csv');
      });
    });
  } else {
    var found = pdfUrl.match(transactionPdfNameRe);
    if(found) {
      return Promise.resolve(found[1] + '.csv');
    } else {
      return Promise.resolve('transactions.csv');
    }
  }
}

function createCsvUrl(csvBlob, pdfUrl, filename) {
  var a = document.createElement('a');
  a.href = window.URL.createObjectURL(csvBlob);
  a.download = filename;
  a.textContent = '.csv';
  a.style = 'font-size: 12px';
  a.setAttribute('data-no-toggle', 'true');
  return a;
}
