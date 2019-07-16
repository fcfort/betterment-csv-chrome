const isWsl = require('is-wsl');

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
    jasmine: {browserifyTest: {options: {specs: 'test/**/*-test.js'}}},
    mochaTest: {
      test: {
        options: {
          reporter: 'spec',
          quiet: false,
        },
        src: ['test/**/*-test.js']
      }
    },
    karma: {
      options: {configFile: 'karma.conf.js'},
      // WSL-specific hacks
      wsl: {browsers: ['Chrome_for_WSL']},
      linux: {browsers: ['ChromeHeadless']},
    },
    clean: {
      options: {'force': true},
      dist: ['dist/app/'],
      karma: ['test/karma/build/'],
    },
    concat: {
      options: {separator: ';'},
      loadpdf: {
        src: ['app/src/load-pdf.js'],
        dest: 'dist/app/load-pdf.js',
      },
      icon: {
        src: ['app/src/show-page-icon.js'],
        dest: 'dist/app/icon.js',
      },
      libs: {
        src: ['app/libs/patch-worker.js'],
        dest: 'dist/app/libs.js',
      },
    },
    copy: {
      dist: {
        files: [
          {
            expand: true,
            flatten: true,
            src: ['app/images/*', 'app/src/options.*'],
            dest: 'dist/app/',
          },
        ],
      },
      karma: {
        files: [
          {
            expand: true,
            flatten: true,
            src: testPdfDir + '/**/*.pdf*',
            dest: 'test/karma/build',
          },
        ],
      },
    },
    browserify: {
      options: {
        ignore: [
          'entry?name=[hash]-worker.js!./pdf.worker.js',
          'node-ensure',
        ]
      },
      main: {src: 'app/src/pdf-to-csv.js', dest: 'dist/app/main.js'},
      worker_path: {src: 'app/src/load-pdf.js', dest: 'dist/app/load-pdf.js'},
      worker: {src: 'app/src/pdf.worker.js', dest: 'dist/app/pdf.worker.js'},
      karma: {
        src: 'test/karma/pdf-to-csv-spec.js',
        dest: 'test/karma/build/karma-spec.js'
      },
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
    crx: {
      extension: {
        'src': ['dist/app/*'],
        'dest': 'dist/builds/<%= pkg.name %>-<%= pkg.version %>.zip'
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
          patterns:
              [{match: 'version', /* -> */ replacement: '<%= pkg.version %>'}]
        },
        files: [{
          expand: true,
          flatten: true,
          src: ['app/manifest.json'],
          dest: 'dist/app'
        }]
      }
    },
    webstore_upload: {
      accounts: {
        default: {
          // account under this section will be used by default
          publish: true,  // publish item right after uploading. default false
          client_id: secrets.client_id,
          client_secret: secrets.client_secret,
          refresh_token: secrets.refresh_token,
        }
      },
      extensions: {
        pdf_to_csv: {
          appID: 'jbneodpofmnammepmnejgkacdbjojcgn',                 // required
          zip: 'dist/builds/<%= pkg.name %>-<%= pkg.version %>.zip'  // required
        }
      }
    },
    trimtrailingspaces: {
      main: {
        src: ['app/src/**/*.js', 'test/**/*.js'],
        options: {
          filter: 'isFile',
          encoding: 'utf8',
        }
      }
    },
  });

  ['grunt-browserify',
   'grunt-contrib-clean',
   'grunt-contrib-concat',
   'grunt-contrib-copy',
   'grunt-contrib-jasmine',
   'grunt-contrib-uglify',
   'grunt-crx',
   'grunt-karma',
   'grunt-mocha-test',
   'grunt-newer',
   'grunt-replace-regex',
   'grunt-trimtrailingspaces',
   'grunt-webstore-upload',
  ].forEach((npmTask) => {
    grunt.loadNpmTasks(npmTask);
  });

  // Platform specific registrations
  // https://stackoverflow.com/a/32586729/2825055,
  // https://stackoverflow.com/a/23848087/2825055
  grunt.registerTask('unittests', function() {
    if (isWsl) {
      grunt.task.run('karma:wsl');
    } else {
      grunt.task.run('karma:linux');
    }
  });

  // The main grunt tasks, each of which nests the previous one.
  // build -> test -> package -> upload
  grunt.registerTask(
      'build',
      [].concat(
          'trimtrailingspaces', 'clean:dist', 'replace:dist', 'concat',
          'browserify', 'copy:dist'));
  grunt.registerTask(
      'test',
      [].concat(
          'build', 'mochaTest', 'clean:karma', 'copy:karma', 'browserify:karma',
          'unittests'));
  grunt.registerTask('package', [].concat('test', 'copy:dist', 'crx'));
  grunt.registerTask('upload', [].concat('package', 'webstore_upload'));
};
