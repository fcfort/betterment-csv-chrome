var pdfToTextArray = require('../../app/src/pdf-to-text-array');
var pdfparser = require('../../app/src/betterment-pdf-array-parser');
var tran2csv = require('../../app/src/transactions-to-csv');

describe("PDF Parsing to CSV", function() {
  var pdftoArray = new pdfparser.BettermentPdfArrayParser();

  for (var file in window.__karma__.files) {  // Hack to iterate over served files.
    if(file.endsWith('pdf')) {
      (function(testFile) {  // Need closure over test
        it("Correctly parses pdf " + testFile, function(done) {
          (function(pdfFile) {  // Need closure to capture file variable.
            pdfToTextArray(pdfFile).then(function(lines) {
              console.log('Parsing:', pdfFile);

              console.log('Got lines:', lines);
              for (var i = 0; i < lines.length; i++) {
                console.log(lines[i]);
              }

              // Actual
              var transactions = pdftoArray.parse(lines);

              for (var i = 0; i < transactions.length; i++) {
                console.log(transactions[i]);
              }

              //console.log('Got transactions', transactions);

              var csvBlob = tran2csv.TransactionsToCsv(transactions);

              var actualCsvResults = blobToString(csvBlob);

              // Expected
              var expectedCsvUri = pdfFile + '.csv';
              var expectedCsvResults = urlToString(expectedCsvUri);

              expect(actualCsvResults).toBe(expectedCsvResults);
              done();
            });
          })(testFile);
        });
      })(file);
    }
  }
});

function blobToString(b) {
  var uri = URL.createObjectURL(b);
  var result = urlToString(uri);
  URL.revokeObjectURL(uri);
  return result;
}

function urlToString(uri) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', uri, false);
  xhr.send();
  return xhr.response;
}
