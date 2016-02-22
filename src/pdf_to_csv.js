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
	 var pages = [];
	 for (var i = 0; i < pdf.numPages; i++) {
	     pages.push(i);
	 }

	 var lineOffset = 0;
	 var textArray = [[]];

	 return Promise.all(pages.map(function(pageNumber) {
	     return pdf.getPage(pageNumber + 1).then(function(page) {	     	
	         return page.getTextContent().then(function(textContent) {
	         	 var lastOffset = 0;
	             return textContent.items.map(function(item) {
	             	var text = item.str;
	             	textArray[lineOffset].push(text);
	                var offset = item.transform[5];

	                if(offset != lastOffset) {
	                	lineOffset++;
	                	textArray.push([]);
	                	text = text + "\r\n";
	                }	                 
	                lastOffset = item.transform[5];
	                return text;
	             }).join(' ');
	         });
	     });
	 })).then(function(pages) {
	 	return textArray;
	     // return pages.join("\r\n");
	 });
	});
}
