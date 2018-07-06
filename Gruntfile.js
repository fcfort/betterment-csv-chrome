'use strict';

module.exports = function(grunt) {
  // Load secrets file if present
  var secrets = {};
  if (grunt.option('secretsFile')) {
    secrets = grunt.file.readJSON(grunt.option('secretsFile'));
  }

  // Set pdf test file dir
  var testPdfDir = {};
  if (grunt.option('testPdfDir')) {
    testPdfDir = grunt.option('testPdfDir');
  }

  // Project configuration.
  grunt.initConfig({
    // TODO: Use pkg data to set version of build
    pkg: grunt.file.readJSON('package.json'),
    jasmine: {
      browserifyTest: {
        options: {
          specs: 'test/**/*-test.js',
        }
      }
    },
    mochaTest: {
      test: {
        options: { reporter: 'spec', quiet: false },
        src: ['test/**/*-test.js']
      }
    },
    karma: {
      unit: {
        configFile: 'karma.conf.js'
      }
    },    
    clean: {
      options: { 'force': true },
      dist: ['dist/app/'],
      karma: ['test/karma/build/'],
      crx: ['dist/builds/*.crx'],
    },
    concat: {
      options: { separator: ';', },
      loadpdf: { src: ['app/src/load-pdf.js'], dest: 'dist/app/load-pdf.js' },
      icon: { src: ['app/src/show-page-icon.js'], dest: 'dist/app/icon.js' },
      libs: {
        src: [
          'app/libs/patch-worker.js',
        ],
        dest: 'dist/app/libs.js'
      },
    },
    copy: {
      dist: {
        files: [
          {
            expand: true,
            flatten: true,
            src: [
              'app/images/*',
              'app/src/options.*',
            ],
            dest: 'dist/app/'
          },
        ],
      },
      karma: {
        files: [
          {
            expand: true,
            flatten: true,
            src: testPdfDir + '/**/*.pdf*',
            dest: 'test/karma/build'
          }, 
        ],
      },
    },
    browserify: {
      options: {
        ignore: [ 'entry?name=[hash]-worker.js!./pdf.worker.js', 'node-ensure', ],
      },
      main: { src: 'app/src/pdf-to-csv.js', dest: 'dist/app/main.js' },
      worker_path: { src: 'app/src/load-pdf.js', dest: 'dist/app/load-pdf.js' },
      worker: { src: 'app/src/pdf.worker.js', dest: 'dist/app/pdf.worker.js' },
      karma: { src: 'test/karma/pdf-to-csv-spec.js', dest: 'test/karma/build/karma-spec.js' },
    },
    uglify: {
      dist: {
        files: {
          'dist/app/libs.js': ['dist/app/libs.js'],
          'dist/app/pdf.worker.js': ['dist/app/pdf.worker.js'],
          'dist/app/main.js': ['dist/app/main.js'],
          'dist/app/icon.js': ['dist/app/icon.js'],
          'dist/app/options.js': ['dist/app/options.js'],
        }
      }
    },
    imagemin: {
      dist: {
        options: { optimizationLevel: 3, },
        files: {
          'dist/app/icon38.png': 'app/images/icon38.png',
          'dist/app/icon128.png': 'app/images/icon128.png',
        }
      }
    },
    crx: {
      extension: {
        'src': [ 'dist/app/*', ],
        'dest': 'dist/builds/<%= pkg.name %>-<%= pkg.version %>.zip',
      }
    },
    dalek: {
      options: {
        browser: ['chrome'],
        // generate an html & an jUnit report
        reporter: ['html', 'junit'],
        // don't load config from an Dalekfile
        dalekfile: false,
      }
    },
    replace: {
      dist: {
        options: {
          patterns: [
            {
              match: 'version', /* -> */ replacement: '<%= pkg.version %>'
            }
          ]
        },
        files: [
          {expand: true, flatten: true, src: ['app/manifest.json'], dest: 'dist/app'}
        ]
      }
    },    
    webstore_upload: {
      accounts: {
        default: { //account under this section will be used by default
          publish: true, //publish item right after uploading. default false
          client_id: secrets.client_id,
          client_secret: secrets.client_secret
        }
      },
      extensions: {
        pdf_to_csv: {
          appID: 'jbneodpofmnammepmnejgkacdbjojcgn', // required
          zip: 'dist/builds/<%= pkg.name %>-<%= pkg.version %>.zip' // required
        }
      }
    },
    trimtrailingspaces: {
      main: {
        src: [
          'app/src/**/*.js',
          'test/**/*.js'
        ],
        options: {
          filter: 'isFile',
          encoding: 'utf8',
        }
      }
    },
  });

  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-imagemin');
  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-crx');
  grunt.loadNpmTasks('grunt-karma');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-newer');
  grunt.loadNpmTasks('grunt-replace');  
  grunt.loadNpmTasks('grunt-trimtrailingspaces');
  grunt.loadNpmTasks('grunt-webstore-upload');

  // The main grunt tasks, each of which nests the previous one.
  // build -> test -> package -> upload
  grunt.registerTask(
    'build', [].concat('trimtrailingspaces', 'clean:dist', 'replace:dist', 'concat', 'browserify', 'copy:dist'));
  grunt.registerTask(
    'test', [].concat('build', 'mochaTest', 'clean:karma', 'copy:karma', 'browserify:karma', 'karma'));
  grunt.registerTask(
    'package', [].concat('test', 'copy:dist', 'crx', 'clean:crx'));
  grunt.registerTask(
    'upload', [].concat('package', 'webstore_upload'));  
};
