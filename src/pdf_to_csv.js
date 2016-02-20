console.log('extension content script loaded ');

function handleHTweetChanges(summaries) {
  var hTweetSummary = summaries[0];

  hTweetSummary.added.forEach(function(newEl) {
    if(newEl.href.includes('.pdf')) {
    	var pdfUrl = newEl.href;
    	console.log('Got pdf url ' + pdfUrl);
    	console.log(this.pdfToText);
    	this.pdfToText(pdfUrl).then(function(result) {
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
  * Extract text from PDFs with PDF.js
  * Uses the demo pdf.js from https://mozilla.github.io/pdf.js/getting_started/
  */
this.pdfToText = function(data) {
	return PDFJS.getDocument(data).then(function(pdf) {
	 var pages = [];
	 for (var i = 0; i < pdf.numPages; i++) {
	     pages.push(i);
	 }
	 return Promise.all(pages.map(function(pageNumber) {
	     return pdf.getPage(pageNumber + 1).then(function(page) {
	         return page.getTextContent().then(function(textContent) {
	         	 console.log('Got textContent at ' + textContent.x);
	             return textContent.items.map(function(item) {
	                 // console.log('Got str ' + item.str + ' at x ' + item.x);
	                 return item.str;
	             }).join(' ');
	         });
	     });
	 })).then(function(pages) {
	     return pages.join("\r\n");
	 });
	});
}
