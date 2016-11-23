var pdfToTextArray = require('../../app/src/pdf-to-text-array');
var pdfparser = require('../../app/src/betterment-pdf-array-parser');
var tran2csv = require('../../app/src/transactions-to-csv');

var debug = false;

describe("PDF Parsing to CSV", function() {
  var pdftoArray = new pdfparser.BettermentPdfArrayParser();

  for (var file in window.__karma__.files) {  // Hack to iterate over served files.
    if(file.endsWith('pdf')) {
      (function(testFile) {  // Need closure over test
        it("Correctly parses pdf " + testFile, function(done) {
          (function(pdfFile) {  // Need closure to capture file variable.
            pdfToTextArray(pdfFile).then(function(lines) {
              if(debug) {
                for(var i = 0; i < lines.length; i++) {
                  console.log('Line:' + i + ' ' + JSON.stringify(lines[i]));
                }
              }

              // Actual
              var transactions = pdftoArray.parse(lines);

              if(debug) {
                for(var i = 0; i < transactions.length; i++) {
                  console.log('Txns:' + i + ' ' + JSON.stringify(transactions[i]));
                }
              }

              var csvBlob = tran2csv.TransactionsToCsv(transactions);

              var actualCsvResults = blobToString(csvBlob);

              // Expected
              var expectedCsvUri = pdfFile + '.csv';
              var expectedCsvResults = urlToString(expectedCsvUri);

              expect(toUnixLineEndings(actualCsvResults)).toBe(toUnixLineEndings(expectedCsvResults));
              done();
            });
          })(testFile);
        });
      })(file);
    }
  }
});

/**
 * This is needed so tests work on both windows and unix. The csv is always returned
 * with line endings of the host system but git pulls down the files using unix
 * line endings.
 */
function toUnixLineEndings(s) {
  return s.replace(/\r\n/g,'\n');
}

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
