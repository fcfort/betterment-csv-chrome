var Papa = require('papaparse');

var TransactionsToCsv = function() {};

TransactionsToCsv.convert = function(transactions) {
  if (transactions.length === 0) {
    return "";
  }
  const lines = [];

  const headers = [ 'Account', 'Date', 'Transaction', 'Portfolio/Fund', 'Price', 'Shares', 'Value' ];

  lines.push(headers);

  [].push.apply(lines, transactions.map(function(tran) {
    let formattedDate = '';
    if (tran.date) {
      const year = tran.date.getUTCFullYear();
      const month = tran.date.getUTCMonth() + 1;
      const day = tran.date.getUTCDate();
      formattedDate = `${month}/${day}/${year}`;
    }

    const price = parseFloat(tran.price).toFixed(2);
    const amount = parseFloat(tran.amount).toFixed(2);

    return [
      tran.account, formattedDate, tran.description,
      tran.ticker, price, tran.quantity, amount
    ];
  }));

  return Papa.unparse(lines, {newline: '\n'});
};

// For mocha testing
var module = module || {};
if (module && module.exports) {
  module.exports = TransactionsToCsv;
}

module.exports = TransactionsToCsv;
