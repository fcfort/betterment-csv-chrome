'use strict';

module.exports = function(grunt) {
  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
      options: {
        separator: ';',
      },
      pdf: {
        src: ['app/libs/pdf.worker.js'],
        dest: 'app/dist/pdf.worker.js'
      },
      icon: {
        src: ['app/src/show-page-icon.js'],
        dest: 'app/dist/icon.js'
      },
      libs: {
        src: ['app/libs/*.js', '!app/libs/pdf.worker.js'],
        dest: 'app/dist/libs.js'
      },
    },    
    browserify: {
      dist: {
        src: 'app/src/pdf-to-csv.js',
        dest: 'app/dist/main.js'
      },
    },
    uglify: {
      dist: {
        files: {
          'app/dist/libs.js': ['app/libs/*.js', '!app/libs/pdf.worker.js'],
          'app/dist/pdf.worker.js': ['app/libs/pdf.worker.js'],
          'app/dist/main.js': ['app/dist/main.js'],
          'app/dist/icon.js': ['app/src/show-page-icon.js'],
        }
      }
    },
    crx: {
      extension: {
        "src": [
          "app/images/*.png",
          "app/dist/*.js",
          "app/manifest.json",
        ],
        "dest": "dist/builds", // This is required or it will error.
        "zipDest": "dist/builds",
        "options": {
          "privateKey": grunt.option("privateKey"),
        },
      }
    },
  });

  grunt.loadNpmTasks('grunt-crx');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  grunt.registerTask('builddev', ['concat', 'browserify']);
  grunt.registerTask('build', ['browserify', 'uglify']);
  grunt.registerTask('package', ['browserify', 'uglify', 'crx']);
};
