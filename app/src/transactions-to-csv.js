var TransactionsToCsv = function() {};

TransactionsToCsv.convert = function(transactions) {
  var lines = [];

  var headers = [
    'Account',
    'Date',
    'Transaction',
    'Portfolio/Fund',
    'Price',
    'Shares',
    'Value'
  ];

  lines.push([headers.join()]);

  [].push.apply(lines, transactions.map(function(tran) {
    return [
      tran.account, 
      tran.date.toLocaleDateString('en-US'), 
      tran.description,
      tran.ticker,    
      tran.price,
      tran.quantity,
      tran.amount
    ].join()
  }));

  return lines.join('\n');
};

// For mocha testing
var module = module || {};
if(module && module.exports) {
  module.exports = TransactionsToCsv;
}

module.exports = TransactionsToCsv;
