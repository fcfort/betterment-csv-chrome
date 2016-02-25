console.log('extension content script loaded ');

function handleNewAnchors(summaries) {
	var anchorSummaries = summaries[0];

	var pdftoArray = new BettermentPdfArrayParser();

	anchorSummaries.added.forEach(function(newEl) {
	if(newEl.href.includes('.pdf')) {
    var pdfUrl = newEl.href;
    this.pdfToTextArray(newEl.href).then(function(result) {
      console.log(JSON.stringify(result));
      var transactions = pdftoArray.parse(result);
      csvBlob = TransactionsToCsv(transactions);
      $(newEl).before(createCsvUrl(csvBlob));
		});
	}});
}

this.createCsvUrl = function(csv) {
  var a = document.createElement('a');
  a.href = window.URL.createObjectURL(csv);
  a.textContent = '.csv';
  a.style = 'font-size: 12px';
  return a;
}

var observer = new MutationSummary({
  callback: handleNewAnchors,
  queries: [{ element: 'a[href]' }]
});


/**
 * Takes a PDF url and returns an array of arrays. Each row in the array is a
 * new line and each element in the row array is a separate piece of text from
 * the document.
 */
this.pdfToTextArray = function(pdfUrl) {
	return PDFJS.getDocument(pdfUrl).then(function(pdf) {
	 var lineOffset = 0;
	 var textArray = [[]];
	 
	 var pages = [];
	 for (var i = 0; i < pdf.numPages; i++) {
	     pages.push(i);
	 }
	/*
	 * This is a bit poorly documented but basically each section of text on the PDF
	 * is represented by a six element transform array that PDF.js uses to overlay
	 * the text content back onto the rendering of the PDF document. 
	 *
	 * I simply use the vertical offset of the text item (transform[5]) to determine
	 * where a new "line" is in the PDF document. It's a bit hacky but it works for
	 * the most part.
	 * 
	 * See the full details here:
	 * https://github.com/mozilla/pdf.js/blob/master/src/display/text_layer.js#L60
	 */
	 return Promise.all(pages.map(function(pageNumber) {
	     return pdf.getPage(pageNumber + 1).then(function(page) {	     	
	         return page.getTextContent().then(function(textContent) {
	         	 var lastOffset = 0;
	             return textContent.items.map(function(item) {	             	
	                var offset = item.transform[5];

	                if(offset != lastOffset) {
	                	lineOffset++;
	                	textArray.push([]);
	                }

                  textArray[lineOffset].push(item.str);

	                lastOffset = item.transform[5];
	             }).join(' ');
	         });
	     });
	 })).then(function(pages) {
	 	return textArray;
	 });
	});
}
