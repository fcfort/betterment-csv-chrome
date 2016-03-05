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
