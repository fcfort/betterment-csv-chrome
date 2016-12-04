var assert = require('assert');
var should = require('should');
var TransactionsToQif = require('../app/src/transactions-to-qif');

describe('Betterment Transaction to QIF converter', function() {
  it('should convert a transaction to qif', function() {
    var transactions = [{
      account: "A",
      date: new Date(2016, 1, 3),
      description: "foo",
      ticker: "BAR",
      price: "1.00",
      quantity: "2.45",
      amount: "43.03",
    }];

    var qif = TransactionsToQif.convert(transactions);

    qif.should.eql(
      '!Account\n' +
      'NA\n' +
      'DA\n' +
      'TInvst\n' +
      '^\n' +
      '!Type:Invst\n' +
      'D2/3/2016\n' +
      'NBuy\n' +
      'YBAR\n' +
      'I1.00\n' +
      'Q2.45\n' +
      'T43.03\n' +
      'Pfoo\n' +
      'O0.00\n' +
      '^'
    );
  });
});
