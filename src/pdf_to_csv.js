console.log('extension content script loaded ');

function handleHTweetChanges(summaries) {
  var hTweetSummary = summaries[0];

  hTweetSummary.added.forEach(function(newEl) {
    if(newEl.href.includes('.pdf')) {
    	var pdfUrl = newEl.href;

    	this.pdfToTextArray(newEl.href).then(function(result) {
			console.log("PDF done!", result);
 		});		

    }
  });
}

var observer = new MutationSummary({
  callback: handleHTweetChanges,
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

// https://github.com/fcfort/betterment-pdf-to-csv/blob/master/betterment-pdf-to-csv.py
this.textToTransactions = function(pdfArray) {

}