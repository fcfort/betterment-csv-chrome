var pdfToTextArray = require('./pdf-to-text-array');
var TransactionConverter = require('./transaction-converter');
var pdfparser = require('./betterment-pdf-array-parser');
var $ = require('jquery');
var MutationSummary = require('mutation-summary');

const ElementLocation = Object.freeze({'BEFORE': 1, 'REPLACE': 2});

function createTransactionRegex() {
  return new RegExp(
      'app/quarterly_statements/\\d+' +
      '|' +
      'app/legacy_quarterly_statements/\\d+' +
      '|' +
      'app/transaction_documents/\\d+');
}

var transactionPdfRe = createTransactionRegex();
var transactionParser = new pdfparser.BettermentPdfArrayParser();


// Global variable for options
var outputFormatOptions;


var DataFile = function(name, extension, data) {
  this.name = name;
  this.extension = extension;
  this.data = data;

  if(extension === 'csv') {
    this.mimetype = 'text/csv';
  else if(extension === 'qif') {
    this.mimetype = 'application/qif';
  } else {
    throw 'Unrecognized extension';
  }
};

DataFile.makeCsv = function(name, data) {
  return new DataFile(name, 'csv', data);
}

DataFile.makeQif = function(name, data) {
  return new DataFile(name, 'qif', data);
}


// Summary Tracker class
var SummaryTracker = function() {
  this.id = 'summary-tracker-betterment-csv-chrome';
  this.elementQuery = 'a[href^="/app/activity_transactions.csv"]';
  this.txns = [];
};

SummaryTracker.prototype.appendTxns =
    function(txns) {
  this.txns.push.apply(this.txns, txns);
  let el = $('#' + this.id);
  if (el.length == 0) {
    console.log('First time writing txns');
    writeTxnsToDataUrls(
        $(this.elementQuery), ElementLocation.BEFORE, this.txns, 'all',
        this.id);
  } else {
    console.log('Not first time writing txns');
    writeTxnsToDataUrls(el, ElementLocation.REPLACE, this.txns, 'all', this.id);
  }
}

// Summary view tracker
var summaryView = new SummaryTracker();

// Async call to get options
chrome.storage.sync.get(
    {csvOutputDesired: true, qifOutputDesired: false}, function(items) {
      // Store results
      outputFormatOptions = items;

      // Create observer for anchor tags
      new MutationSummary(
          {callback: handleNewAnchors, queries: [{element: 'a[href]'}]});
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
          writeTxnsToDataUrls(
              $(anchorEl), ElementLocation.BEFORE, transactions, filename);
        });
      });
    }
  });
}

function writeTxnsToDataUrls(elPos, elLoc, transactions, filename, id) {
  let files = [];

  if (outputFormatOptions.csvOutputDesired) {
    let csvData = TransactionConverter.toCsv(transactions);
    let csvFile = DataFile.makeCsv(filename, csvData);
    files.push(csvFile);
  }

  if (outputFormatOptions.qifOutputDesired) {
    let qifData = TransactionConverter.toQif(transactions);
    let qifFile = DataFile.makeQif(filename, qifData);
    files.push(qifFile);
  }

  files.forEach(function(file) {
    let el = createDataUrl(file);
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
    $.ajax({url: pdfUrl}).done(function(data, textStatus, jqXHR) {
      // content-disposition: attachment;
      // filename="Betterment_401k_Quarterly_Statement_2015-12-31.pdf"
      var contentDisposition = jqXHR.getResponseHeader('content-disposition');
      var found = contentDisposition.match(/filename="(.*?)"/);
      resolve(found[1]);
    });
  });
}

function createDataUrl(file, id) {
  let blob = new Blob([file.data], {type: file.mimeType, endings: 'native'});
  let blobUrl = window.URL.createObjectURL(blob);

  let a = document.createElement('a');
  a.href = blobUrl;
  a.download = file.name + '.'  + file.extension;
  a.textContent = file.extension;
  a.style = 'font-size: 12px';
  // Hack so that this a tag doesn't make the row disappear.
  a.setAttribute('data-no-toggle', 'true');

  if (typeof id !== 'undefined') {
    a.id = id;
  }

  return a;
}
