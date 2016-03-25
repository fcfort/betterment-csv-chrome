# Betterment CSV downloader

**_This extension is not affiliated with Betterment in any way._**

Betterment is a wonderful brokerage service, but doesn't provide ticker-level transaction data for easy export. But, this data is available via the PDFs on the Activity page.

This extension parses those PDFs and creates ticker-level transaction .csv download links on the Activity Page entirely in the browser using PDF.js and Web Workers.

## Building

To access development releases, you'll need npm installed. Start by cloning the project locally.

Source Code: [github.com/fcfort/betterment-csv-chrome](https://github.com/fcfort/betterment-csv-chrome)

- Run `grunt builddev`
- Open `chrome://extensions/` or select the menu `Window > Extensions`.
- Enable the developer mode at top right.
- Click `Load unpacked extension...` and select the `dist/app/` folder.

## Packaging

`grunt package --privateKey ../relative/path/to/key.pem`

## Testing

This project uses Mocha for testing. Run tests using `mocha`. Requires node.js to be installed.

## Libraries

- [PDF.js](https://github.com/mozilla/pdf.js) - Client-side PDF parsing.
- [patch-worker.js](https://github.com/Rob--W/chrome-api/tree/master/patch-worker) - A workaround to allow the use of Web Workers in Chrome content scripts.
- [Mutation Summary](https://github.com/rafaelw/mutation-summary) - Observe changes to the DOM.
- [jQuery](https://github.com/jquery/jquery)
- [Mocha](https://github.com/mochajs/mocha) - A Javascript test framework.

## Related projects

I wrote a command-line version that parses PDF files and outputs CSV. See [github.com/fcfort/betterment-pdf-to-csv](https://github.com/fcfort/betterment-pdf-to-csv). This project is similar but done entirely client-side as a Chrome extension.

## License

[Apache 2.0](https://opensource.org/licenses/Apache-2.0)

