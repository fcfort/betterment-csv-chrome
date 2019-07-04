var TransactionsToCsv = require('./transactions-to-csv');
var TransactionsToQif = require('./transactions-to-qif');

var TransactionConverter = function() {};

TransactionConverter.convert =
    function(transactions, extension) {
  if (extension === 'qif') {
    return TransactionsToQif.convert(transactions);
  } else if (extension == 'csv') {
    return TransactionsToCsv.convert(transactions);
  }
}

// For mocha testing
var module = module || {};
if (module && module.exports) {
  module.exports = TransactionConverter;
}
