var TransactionsToCsv = function(transactions) {
  var headers = [
    'Account',
    'Date',
    'Transaction',
    'Portfolio/Fund',
    'Price',
    'Shares',
    'Value'
  ];

  var tranRows = [headers.join()];
  tranRows = tranRows.concat(transactions.map(function(tran) {
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

  var tranCsv = tranRows.join('\n');

  return new Blob([tranCsv], {type: 'text/csv', endings: 'native'});  
};

// For mocha testing
var module = module || {};
if(module && module.exports) {
  module.exports.TransactionsToCsv = TransactionsToCsv;
}
