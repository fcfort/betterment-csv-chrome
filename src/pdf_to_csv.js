console.log('extension content script loaded ');

function handleHTweetChanges(summaries) {
  var hTweetSummary = summaries[0];

  hTweetSummary.added.forEach(function(newEl) {
    if(newEl.href.includes('.pdf')) {
    	var pdfUrl = newEl.href;
    	console.log('Got pdf url ' + pdfUrl);
    	PDFJS.getDocument(pdfUrl).then(function(pdf) {
    		console.log(pdf);
		}).catch(function(reason) {
   			console.log(reason);
		});

    }
  });
}

var observer = new MutationSummary({
  callback: handleHTweetChanges,
  queries: [{ element: 'a[href]' }]
});

