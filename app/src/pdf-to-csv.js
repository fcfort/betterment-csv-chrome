var pdfToTextArray = require('./pdf-to-text-array');
var TransactionConverter = require('./transaction-converter');
var pdfparser = require('./betterment-pdf-array-parser');
var $ = require('jquery');
var MutationSummary = require('mutation-summary');

const ElementLocation = Object.freeze({"BEFORE" : 1, "REPLACE" : 2});

function createTransactionRegex() {
  return new RegExp('app/quarterly_statements/\\d+' +
                    '|' +
                    'app/legacy_quarterly_statements/\\d+' +
                    '|' +
                    'app/transaction_documents/\\d+');
}

var transactionPdfRe = createTransactionRegex();
var transactionParser = new pdfparser.BettermentPdfArrayParser();

// Global variable for options
var outputFormatOptions;

// Summary Tracker class
var SummaryTracker = function() {
  this.id = "summary-tracker-betterment-csv-chrome";
  this.elementQuery = 'a[href^="/app/activity_transactions.csv"]';
  this.txns = [];
};

SummaryTracker.prototype.appendTxns =
    function(txns) {
  this.txns.push.apply(this.txns, txns);
  let el = $("#" + this.id);
  if (el.length == 0) {
    console.log("First time writing txns");
    writeTxnsToDataUrls($(this.elementQuery), ElementLocation.BEFORE, this.txns,
                        'all', this.id);
  } else {
    console.log("Not first time writing txns");
    writeTxnsToDataUrls(el, ElementLocation.REPLACE, this.txns, 'all', this.id);
  }
}

// Summary view tracker
var summaryView = new SummaryTracker();

// Async call to get options
chrome.storage.sync.get(
    {csvOutputDesired : true, qifOutputDesired : false}, function(items) {
      // Store results
      outputFormatOptions = items;

      // Create observer for anchor tags
      new MutationSummary(
          {callback : handleNewAnchors, queries : [ {element : 'a[href]'} ]});
    });

function handleNewAnchors(summaries) {
  // All txns
  var allTxns = [];
  var anchorSummaries = summaries[0];

  anchorSummaries.added.forEach(function(anchorEl) {
    var pdfUrl = anchorEl.href;

    if (transactionPdfRe.test(pdfUrl)) {
      console.log('Found PDF url');
      pdfToTextArray(pdfUrl).then(function(textArray) {
        var transactions = transactionParser.parse(textArray);
        summaryView.appendTxns(transactions);
        console.log('Done parsing PDFs to txns');
        getFilenamePromise(pdfUrl).then(function(filename) {
          writeTxnsToDataUrls($(anchorEl), ElementLocation.BEFORE, transactions,
                              filename);
        });
      });
    }
  });
}

function writeTxnsToDataUrls(elPos, elLoc, transactions, filename, id) {
  let newEls = [];

  if (outputFormatOptions.csvOutputDesired) {
    let csv = TransactionConverter.toCsv(transactions);
    let el = createDataUrl(csv, 'text/csv', filename, '.csv', id);
    newEls.push(el);
  }

  if (outputFormatOptions.qifOutputDesired) {
    let qif = TransactionConverter.toQif(transactions);
    let el = createDataUrl(qif, 'application/qif', filename, '.qif', id);
    newEls.push(el);
  }

  newEls.forEach(function(el) {
    if (elLoc === ElementLocation.BEFORE) {
      elPos.before(el);
    } else if (elLoc === ElementLocation.REPLACE) {
      elPos.parentNode.replaceChild(el, elPos);
    }
  });
}

// Grab filename (without .pdf at the end) from PDF URL. Is a promise because we
// have to make an ajax call if it is a quarterly 401k PDF.
// https://wwws.betterment.com/document/Betterment_Deposit_2016-02-18.pdf
function getFilenamePromise(pdfUrl) {
  return new Promise(function(resolve) {
    $.ajax({url : pdfUrl}).done(function(data, textStatus, jqXHR) {
      // content-disposition: attachment;
      // filename="Betterment_401k_Quarterly_Statement_2015-12-31.pdf"
      var contentDisposition = jqXHR.getResponseHeader('content-disposition');
      var found = contentDisposition.match(/filename="(.*?)"/);
      resolve(found[1]);
    });
  });
}

function createDataUrl(data, mimeType, filename, extension, id) {
  let blob = new Blob([ data ], {type : mimeType, endings : 'native'});
  let blobUrl = window.URL.createObjectURL(blob);
  console.log('Got blob url ' + blobUrl);

  let a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename + extension;
  a.textContent = extension;
  a.style = 'font-size: 12px';
  // Hack so that this a tag doesn't make the row disappear.
  a.setAttribute('data-no-toggle', 'true');

  if (typeof id !== 'undefined') {
    a.id = id;
  }

  return a;
}
