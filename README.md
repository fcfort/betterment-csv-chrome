# Betterment CSV/QIF Exporter

**_This extension is not affiliated with Betterment in any way._**

Betterment is a wonderful brokerage service, but doesn't provide ticker-level
transaction data for easy export. But, this data is available via the PDFs on
the Activity page.

This extension parses those PDFs and creates ticker-level transaction download
links on the Activity Page entirely in the browser using PDF.js and Web Workers.

This extension can output in both CSV and QIF formats.

# Features

-   CSV/QIF output formats
-   Download transactions from all the PDFs on the page as one combined file.
-   All done entirely client-side. *No data leaves your computer*.

## Dev Setup

-   Run `sudo apt install npm node-grunt-cli`
-   Run `grunt install`

## Building

To access development releases, you'll need npm installed. Start by cloning the
project locally.

Source Code:
[github.com/fcfort/betterment-csv-chrome](https://github.com/fcfort/betterment-csv-chrome)

-   Run `grunt build`
-   Open `chrome://extensions/` or select the menu `Window > Extensions`.
-   Enable the developer mode at top right.
-   Click `Load unpacked extension...` and select the `dist/app/` folder.

## Testing

### Unit & Integration tests

`grunt test --testPdfDir=../relative/path/to/test/pdfs/and/csvs`

## Packaging

`grunt package --testPdfDir=../relative/path/to/test/pdfs/and/csvs`

## Uploading

`grunt upload --secretsFile=../relative/path/to/secrets.json
--testPdfDir=../relative/path/to/test/pdfs/and/csvs`

Accept the OAuth2 prompt that opens in your browser.

## Preparing a new release

1.  Make code changes
1.  Bump version number in `package.json`
1.  Run `grunt upload`, which will build, test, upload, *and publish* the new
    version to the Chrome Web Store.
1.  Create a new release on GitHub and upload the zip file as a build artifact.

## Libraries

-   [PDF.js](https://github.com/mozilla/pdf.js) - Client-side PDF parsing.
-   [patch-worker.js](https://github.com/Rob--W/chrome-api/tree/master/patch-worker) -
    A workaround to allow the use of Web Workers in Chrome content scripts.
-   [Mutation Summary](https://github.com/rafaelw/mutation-summary) - Observe
    changes to the DOM.
-   [jQuery](https://github.com/jquery/jquery)
-   [Mocha](https://github.com/mochajs/mocha) - A Javascript test framework.

## Related projects

I wrote a command-line version that parses PDF files and outputs CSV. See
[github.com/fcfort/betterment-pdf-to-csv](https://github.com/fcfort/betterment-pdf-to-csv).
This project is similar but done entirely client-side as a Chrome extension.

## License

[Apache 2.0](https://opensource.org/licenses/Apache-2.0)
