var pdfToTextArray = require('./pdf-to-text-array');
var TransactionConverter = require('./transaction-converter');
var pdfparser = require('./betterment-pdf-array-parser');
var $ = require('jquery');
var MutationSummary = require('mutation-summary');


/*
 * ElementLocation
 */
const ElementLocation = Object.freeze({'BEFORE': 1, 'REPLACE': 2});


/*
 * OutputFormat
 */
const OutputFormat = Object.freeze({'CSV': 1, 'QIF': 2});


/*
 * DataFile
 */
var DataFile = function(name, format, data) {
  this.name = name;
  this.data = data;

  if (format === OutputFormat.CSV) {
    this.extension = '.csv';
    this.mimetype = 'text/csv';
  } else if (format === OutputFormat.QIF) {
    this.extension = '.qif';
    this.mimetype = 'application/qif';
  } else {
    throw 'Unrecognized extension';
  }
};

DataFile.makeCsv = function(name, data) {
  return new DataFile(name, OutputFormat.CSV, data);
};

DataFile.makeQif = function(name, data) {
  return new DataFile(name, OutputFormat.QIF, data);
};


/*
 * Summary Tracker
 */
var SummaryTracker = function(id) {
  this.id = id;
  this.elementQuery = 'a[href^="/app/activity_transactions.csv"]';
  this.txns = [];
};

SummaryTracker.prototype.appendTxns = function(txns) {
  this.txns.push.apply(this.txns, txns);
};

SummaryTracker.prototype.writeTxns = function() {
  const container = createContainerFromTransactions(this.txns, 'all', this.id);
  const el = $('#' + this.id);
  if (el.length === 0) {
    insertContainer($(this.elementQuery), ElementLocation.BEFORE, container);
  } else {
    insertContainer(el, ElementLocation.REPLACE, container);
  }
};


/*
 * globals
 */

const transactionPdfRe = new RegExp(
    'app/quarterly_statements/\\d+' +
    '|' +
    'app/legacy_quarterly_statements/\\d+' +
    '|' +
    'app/transaction_documents/\\d+');
const transactionParser = new pdfparser.BettermentPdfArrayParser();

// Global variable for options
const OUTPUT_FORMATS = [];
var ADD_COMBINED_OUTPUT = false;
const TRANSACTION_CACHE = {};

// Async call to get options
chrome.storage.sync.get(
    {
      csvOutputDesired: true,
      qifOutputDesired: false,
      combinedOutputDesired: false,
    },
    function(items) {
      // Store results
      if (items.csvOutputDesired) {
        OUTPUT_FORMATS.push(OutputFormat.CSV);
      }
      if (items.qifOutputDesired) {
        OUTPUT_FORMATS.push(OutputFormat.QIF);
      }

      ADD_COMBINED_OUTPUT = items.combinedOutputDesired;

      // Create observer for anchor tags
      new MutationSummary(
          {callback: handleNewAnchors, queries: [{element: 'a[href]'}]});
    });

// Creates new download links for the transactions contained in each PDF within
// the current activity page. Also creates the combined output download link
// that holds all transactions for every PDF within the current page.
//
// The key optimizations here are:
//
//   1. Returns if no new PDF URLs have been added. This is needed because the
//      download links that are added by this function triggers this callback
//      again unnecessarily.
//   2. Caches the parsing of the PDFs using their URL as the key. This is so
//      when the page changes we don't have to redownload and reparse the PDFs.
//   3. The combined output queries the entire page rather than relying upon
//      the mutation summaries provided by the MutationSummary library. This is
//      so we don't have to track state about which transactions are present
//      within the combined output.
//   4. De-dupe URLs in combined output, since each PDF URL appears twice on
//      the page.
function handleNewAnchors(summaries) {
  // Return early if there are no PDFs to parse.

  const addedAnchors = summaries[0].added;

  const noPdfUrls = addedAnchors.every(function(anchorEl) {
    return !transactionPdfRe.test(anchorEl.href);
  });

  if (noPdfUrls) {
    return;
  }

  // Handle per-PDF transaction files.

  const perPdfPromises = [];

  addedAnchors.forEach(function(anchorEl) {
    const url = anchorEl.href;

    if (transactionPdfRe.test(url)) {
      perPdfPromises.push(getTransactionsForUrl(url).then(function(transactions) {
        getFilenamePromise(url).then(function(filename) {
          const container =
              createContainerFromTransactions(transactions, filename);
          insertContainer($(anchorEl), ElementLocation.BEFORE, container);
        });
      }));
    }
  });

  // Now handle combined output

  if (ADD_COMBINED_OUTPUT) {
    Promise.allSettled(perPdfPromises).then(function () {
      const summaryTracker = new SummaryTracker('betterment-csv-chrome-combined');
      const combinedOutputPromises = [];
      // Query all anchors again from the entire document and de-dupe them.
      const pdfUrlSet = new Set();
      $("a[href]").each(function () {
        if (transactionPdfRe.test(this.href)) {
          pdfUrlSet.add(this.href);
        }
      });

      pdfUrlSet.forEach(function (url) {
        if (transactionPdfRe.test(url)) {
          combinedOutputPromises.push(getTransactionsForUrl(url).then(function(transactions) {
            summaryTracker.appendTxns(transactions);
          }));
        }
      });
      // Populate download file with all txns to bottom of the page
      Promise.allSettled(combinedOutputPromises).then(function () {
        summaryTracker.writeTxns();
      });
    });
  }
}

// Returns Promise, checking in cache first. Expects valid PDF URL.
function getTransactionsForUrl(url) {
  if (url in TRANSACTION_CACHE) {
    return Promise.resolve(TRANSACTION_CACHE[url]);
  } else {
    return pdfToTextArray(url).then(function(textArray) {
      const transactions = transactionParser.parse(textArray);
      TRANSACTION_CACHE[url] = transactions;
      return transactions;
    });
  }
}

// Returns a plain DOM element
function createContainerFromTransactions(transactions, filename, id) {
  const files = createDownloadFiles(transactions, filename);
  return createDownloadContainer(files, id);
}

function createDownloadFiles(transactions, filename) {
  const files = [];

  OUTPUT_FORMATS.forEach(function(format) {
    if (format === OutputFormat.CSV) {
      const data = TransactionConverter.toCsv(transactions);
      const file = DataFile.makeCsv(filename, data);
      files.push(file);
    } else if (format === OutputFormat.QIF) {
      const data = TransactionConverter.toQif(transactions);
      const file = DataFile.makeQif(filename, data);
      files.push(file);
    }
  });

  return files;
}

// Note: elPos must be a jQuery element, not a plain DOM element.
function insertContainer(elPos, elLoc, container) {
  if (elLoc === ElementLocation.BEFORE) {
    elPos.before(container);
  } else if (elLoc === ElementLocation.REPLACE) {
    elPos.replaceWith(container);
  }
}

// Grab filename (without .pdf at the end) from PDF URL. Is a promise because
// we have to make an ajax call if it is a quarterly 401k PDF.
// https://wwws.betterment.com/document/Betterment_Deposit_2016-02-18.pdf
function getFilenamePromise(pdfUrl) {
  return new Promise(function(resolve) {
    $.ajax({url: pdfUrl}).done(function(data, textStatus, jqXHR) {
      // content-disposition: attachment;
      // filename="Betterment_401k_Quarterly_Statement_2015-12-31.pdf"
      const contentDisposition = jqXHR.getResponseHeader('content-disposition');
      const found = contentDisposition.match(/filename="(.*?)"/);
      resolve(found[1]);
    });
  });
}

// Returns a plain DOM element
function createDataUrl(file) {
  const a = document.createElement('a');

  const blob = new Blob([file.data], {type: file.mimeType, endings: 'native'});
  a.href = window.URL.createObjectURL(blob);
  a.download = file.name + file.extension;
  a.textContent = file.extension;
  a.style = 'font-size: 12px; padding-right: 2px';
  // Hack so that this a tag doesn't make the row disappear.
  a.setAttribute('data-no-toggle', 'true');

  return a;
}

// Returns a <span> el containing blob download links to the given files.
// Order of the files determines the order of the links.
function createDownloadContainer(files, id) {
  const span = document.createElement('span');

  span.id = id;

  files.forEach(function(file) {
    span.appendChild(createDataUrl(file));
  });

  return span;
}
