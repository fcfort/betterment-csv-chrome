var assert = require('assert');
var should = require('should');
var TransactionsToCsv = require('../app/src/transactions-to-csv');

describe('Betterment Transaction to CSV converter', function() {
  it('should convert a transaction to csv', function() {
    var transactions = [{
      account: "A",
      date: new Date(2016, 1, 3),
      description: "foo",
      ticker: "BAR",
      price: "1.00",
      quantity: "2.45",
      amount: "43.03",
    }];

    var csv = TransactionsToCsv.convert(transactions);

    csv.should.eql(
      'Account,Date,Transaction,Portfolio/Fund,Price,Shares,Value\n' + 
      'A,2/3/2016,foo,BAR,1.00,2.45,43.03'
    );
  });
});
