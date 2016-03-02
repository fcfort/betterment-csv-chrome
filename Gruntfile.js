 module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
	crx: {
		extension: {
		  "src": [
		  	"src/**/*",
		  	"libs/**/*",
		  ],
		  "dest": "dist/crx/",
		}
	}
  });

  grunt.loadNpmTasks('grunt-crx');

  grunt.registerTask('default', ['crx']);
};