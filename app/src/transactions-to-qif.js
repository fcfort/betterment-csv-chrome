var _ = require('underscore');

var TransactionsToQif = function() {};

// https://github.com/Gnucash/gnucash/blob/master/src/import-export/qif-imp/file-format.txt
// https://www.w3.org/2000/10/swap/pim/qif-doc/QIF-doc.htm

TransactionsToQif.convert = function(transactions) {
  var lines = [];

  // For each unique account, add account header
  var accountNames = _.uniq(_.pluck(transactions, "account"));

  [].push.apply(lines, _.flatten(accountNames.map(function(accountName) {
    // Having a space before !Account breaks gnu-cash qif importing
    return ["!Account", "N" + accountName, "D" + accountName, "TInvst", "^"];
  })));

  // For each txn
  [].push.apply(lines, _.flatten(transactions.map(function(txn) {
    var action = txn.quantity >= 0 ? 'Buy' : 'Sell';

    return [
      "!Type:Invst",
      "D" + txn.date.toLocaleDateString('en-US'),
      "N" + action,
      "Y" + txn.ticker,
      "I" + txn.price,
      // The direction is determined by the action, not the sign.
      "Q" + Math.abs(txn.quantity),
      "T" + Math.abs(txn.amount),
      "P" + txn.description,
      "O0.00",
      "^"
    ];
  })));

  return lines.join('\n');
};

// For mocha testing
var module = module || {};
if(module && module.exports) {
  module.exports = TransactionsToQif;
}

module.exports = TransactionsToQif;
