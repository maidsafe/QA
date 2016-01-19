'use strict';

module.exports = function (grunt) {

    // Load all Grunt tasks
    require('load-grunt-tasks')(grunt);

    grunt.initConfig({
        jshint: {
            options: {
                jshintrc: '.jshintrc',
                reporter: require('jshint-stylish')
            },
            all: [
                'Gruntfile.js',
                './*.js',
                'common/*.js'
            ]
        },
        jscs: {
            src: [
                './*.js',
                'common/*.js',
                '!./Gruntfile.js'
            ],
            options: {
                config: '.jscsrc'
            }
        }
    });

    /**
     * grunt test - to run the test suite for js linters, broken links and  w3c validators
     */
    grunt.registerTask('test', [
        'jshint:all',
        'jscs'
    ]);
};