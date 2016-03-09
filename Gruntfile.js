'use strict';

module.exports = function(grunt) {
  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    browserify: {
      dist: {
        src: 'app/src/pdf_to_csv.js',
        dest: 'app/dist/main.js'
      },
    },
    uglify: {
      dist: {
        files: {
          'app/dist/libs.js': ['app/libs/*.js', '!app/libs/pdf.worker.js'],
          'app/dist/main.js': ['app/dist/main.js'],
          'app/dist/icon.js': ['app/src/show_page_icon.js'],
        }
      }
    },
    crx: {
      extension: {
        "src": [
          "app/images/*.png",
          "app/libs/pdf.worker.js",
          "app/dist/*.js",
          "app/manifest.json",
        ],
        "dest": "dist/builds", // This is required or it will error.
        "zipDest": "dist/builds",
        "options": {
          "privateKey": grunt.option("privateKey"),
          "maxBuffer": 10000 * 1024 //build extension with a weight up to 3MB  
        },
      }
    },
  });

  grunt.loadNpmTasks('grunt-crx');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  grunt.registerTask('builddev', ['browserify']);
  grunt.registerTask('build', ['browserify', 'uglify']);
  grunt.registerTask('package', ['browserify', 'uglify', 'crx']);
};
