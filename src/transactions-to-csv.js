var TransactionsToCsv = function(transactions) {
	var tranCsv = transactions.map(function(tran) {
		return [
			tran.account, 
			tran.date.toLocaleDateString('en-US'), 
			tran.ticker, 
			tran.description, 
			tran.quantity,
			tran.price,
			tran.amount
		].join() + "\n";
	}).join("");

	return new Blob([tranCsv], {type: 'text/csv'});	
};