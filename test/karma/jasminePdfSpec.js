var pdfToTextArray = require('../../app/src/pdf-to-text-array');

describe("A suite", function() {
  it("contains spec with an expectation", function(done) {
  	var promise = pdfToTextArray('base/a.pdf');
  	promise.then(function(txns) {
  	  console.log(txns); 
  	  done();
    }, function(e) {
      console.log(e);
    });
    expect(true).toBe(true);
  });
});