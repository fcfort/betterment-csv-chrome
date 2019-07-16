/**
 * @fileoverview Dumps raw PDF transform data for provided PDF.
 */

// PDFJS = {
//   workerSrc: 'base/dist/app/pdf.worker.js'
// };

var PDFJS = require('pdfjs-dist/build/pdf.js');
var fs = require('fs');

/**
 * Returns an array of arrays of PDF text elements, where each page is an
 * element in the first array and each text element is an element in the second
 * array, in stream order.
 */
function getTextContents(pdfFile) {
  const buffer = fs.readFileSync(pdfFile);
  const source = {data: buffer};
  return PDFJS.getDocument(source)
      .promise
      .then(function(pdf) {
        const transforms = [];

        const pages = [];
        for (var i = 0; i < pdf.numPages; i++) {
          pages.push(i);
        }

        return Promise
            .all(pages.map(function(pageNumber) {
              return pdf.getPage(pageNumber + 1).then(function(page) {
                return page.getTextContent().then(function(textContent) {
                  transforms[pageNumber] = textContent.items;
                });
              });
            }))
            .then(function(pages) {
              return transforms;
            });
      })
      .catch(function(e) {
        console.log('PDF promise rejected: ' + e);
      });
}

function printTextContent(textContents) {
  let i = 0;
  textContents.forEach((page) => {
    console.log('Page ' + i);
    i++;
    page.forEach((textContent) => {
      console.log(
          textContent.str + '\n\t' + textContent.width + ' * ' +
          textContent.height + '\n\t' + textContent.transform);
    });
  });
}

/*
 * Each text content element has the following structure:
 *
 * TextContent {
 *   str,
 *   dir,
 *   width,
 *   height,
 *   transform: [
 *      angleVectorX, angleVectorY, fontHeight1, fontHeight2, leftOffset,
 *      topOffset
 *   ]
 *   fontName
 * }
 *
 * The angle of the text in radians is defined as Math.atan2(angleVectorX,
 * angleVectorY).
 *
 * Font height is defined as Math.sqrt(fontHeight1**2 + fontHeight2**2) (for non
 * ascended/descended fonts).
 *
 * Left position is defined as leftOffset (for non-angled text).
 *
 * Top position is defined as topOffset (for non-angled text).
 *
 */

const pdfPromise = getTextContents(process.argv[2]);

pdfPromise.then((textContents) => {
  printTextContent(textContents);
});
