// Karma configuration
// Generated on Fri May 27 2016 22:10:32 GMT-0400 (EDT)

process.env.CHROME_BIN = require('puppeteer').executablePath()

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath : '',

    // frameworks to use
    frameworks : [ 'jasmine' ],

    // list of files / patterns to load in the browser
    files : [
      // Test PDFs and CSVs copied from grunt tasks
      {
        pattern : 'test/karma/build/*.pdf*',
        watched : true,
        served : true,
        included : false
      },
      // We need to serve this file so that it can be loaded by PDFJS.
      {
        pattern : 'dist/app/pdf.worker.js',
        watched : true,
        served : true,
        included : false
      },
      // We need this file to specify the path to the pdf.worker.js file.
      'test/karma/load-pdf-worker.js',
      'test/karma/build/**/*-spec.js',
    ],

    // list of files to exclude
    exclude : [],

    // preprocess matching files before serving them to the browser
    // available preprocessors:
    // https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors : {},

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters : [ 'progress' ],

    // web server port
    port : 9876,

    // enable / disable colors in the output (reporters and logs)
    colors : true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR ||
    // config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel : config.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file
    // changes
    autoWatch : true,

    customLaunchers : {
      Chrome_for_WSL : {
        base : 'ChromeHeadless',
        flags : [
          '--headless',
          '--no-sandbox',
          '--disable-features=NetworkService',
          '--disable-features=VizDisplayCompositor',
        ]
      }
    },

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun : true,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency : Infinity
  })
}
