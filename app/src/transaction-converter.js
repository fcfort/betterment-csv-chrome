var TransactionsToCsv = require('./transactions-to-csv');
var TransactionsToQif = require('./transactions-to-qif');

var TransactionConverter = function() {};

TransactionConverter.toCsv = function(transactions) {
  return TransactionsToCsv.convert(transactions);
};

TransactionConverter.toQif = function(transactions) {
  return TransactionsToQif.convert(transactions);
};

// For mocha testing
var module = module || {};
if (module && module.exports) {
  module.exports = TransactionConverter;
}
