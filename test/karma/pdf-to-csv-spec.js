var pdfToTextArray = require('../../app/src/pdf-to-text-array');
var pdfparser = require('../../app/src/betterment-pdf-array-parser');
var TransactionsToCsv = require('../../app/src/transactions-to-csv');

var debug = false;

var customMatchers = {
  // Matches two multiline strings with support for line-by-line comparison
  toBeMultiline: function(util, customEqualityTesters) {
    return {
      compare: function(actual, expected) {
        actualArray = splitLines(actual);
        expectedArray = splitLines(expected);

        var result = {pass: true};

        // Check array length, fail fast
        result.pass = actualArray.length === expectedArray.length;
        result.message = 'Actual has ' + actualArray.length +
            ' records, while we expected: ' + expectedArray.length;
        if (!result.pass) {
          return result;
        }

        // Check each record, fail fast
        for (var i = 0; i < actualArray.length; i++) {
          actualRecord = actualArray[i];
          expectedRecord = expectedArray[i];
          result.pass = actualRecord === expectedRecord;
          result.message = 'Expected line ' + (i + 1) + ' to be:\n-->' +
              expectedRecord + '<--\n, but got:\n-->' + actualRecord + '<--';
          if (!result.pass) {
            return result;
          }
        }

        return result;
      }
    };
  }
};

describe('PDF Parsing to CSV', function() {
  beforeEach(function() {
    jasmine.addMatchers(customMatchers);
  });

  var pdftoArray = new pdfparser.BettermentPdfArrayParser();

  for (var file in
       window.__karma__.files) {  // Hack to iterate over served files.
    if (file.endsWith('pdf')) {
      (function(testFile) {  // Need closure over test
        it('Correctly parses pdf ' + testFile, function(done) {
          (function(pdfFile) {  // Need closure to capture file variable.
            pdfToTextArray(pdfFile).then(function(lines) {
              if (debug) {
                for (var i = 0; i < lines.length; i++) {
                  console.log('Line:' + i + ' ' + JSON.stringify(lines[i]));
                }
              }

              // Actual
              var transactions = pdftoArray.parse(lines);

              if (debug) {
                for (var i = 0; i < transactions.length; i++) {
                  console.log(
                      'Txns:' + i + ' ' + JSON.stringify(transactions[i]));
                }
              }

              const actualCsvResults = TransactionsToCsv.convert(transactions);

              // Expected
              const expectedCsvResults = fetchUrlBody(pdfFile + '.csv');

              // First use record by record custom matcher, then entire string
              // matcher
              expect(toUnixLineEndings(actualCsvResults))
                  .toBeMultiline(toUnixLineEndings(expectedCsvResults));
              expect(toUnixLineEndings(actualCsvResults))
                  .toBe(toUnixLineEndings(expectedCsvResults));
              done();
            });
          })(testFile);
        });
      })(file);
    }
  }
});

/**
 * This is needed so tests work on both windows and unix. The csv is always
 * returned with line endings of the host system but git pulls down the files
 * using unix line endings.
 */
function toUnixLineEndings(s) {
  return s.replace(/\r\n/g, '\n');
}

function blobToString(b) {
  const uri = URL.createObjectURL(b);
  const result = fetchUrlBody(uri);
  URL.revokeObjectURL(uri);
  return result;
}

function fetchUrlBody(uri) {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', uri, false);
  xhr.send();
  return xhr.response;
}

function splitLines(s) {
  return s.split(/\r?\n/);
}
