var TransactionsToCsv = function(transactions) {
	var headers = [
		'Account',
		'Transaction Date',
		'Symbol',
		'Description',
		'Quantity',
		'Price',
		'Amount'
	];

  var tranRows = [headers.join()];
	tranRows = tranRows.concat(transactions.map(function(tran) {
		return [
			tran.account, 
			tran.date.toLocaleDateString('en-US'), 
			tran.ticker, 
			tran.description, 
			tran.quantity,
			tran.price,
			tran.amount
		].join()
  }));

  var tranCsv = tranRows.join('\n');

	return new Blob([tranCsv], {type: 'text/csv', endings: 'native'});	
};