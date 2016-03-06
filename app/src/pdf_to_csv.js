var pdfToTextArray = require('./pdf_to_text_array');
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
      pdfToTextArray(pdfUrl).then(function(result) {
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

