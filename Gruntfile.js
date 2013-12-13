module.exports = function(grunt) {

    grunt.initConfig({
        jshint: {
            src: ['./*.js', './public/client.js', './test/*.js'],
            options: {
                curly: true,
                eqeqeq: true,
                immed: true,
                latedef: true,
                newcap: true,
                noarg: true,
                sub: true,
                undef: true,
                boss: true,
                eqnull: true,
                browser: true,
                globals: {
                    require: true,
                    define: true,
                    requirejs: true,
                    describe: true,
                    expect: true,
                    it: true
                }
            }
        },
        watch: {
            files: '<%= jshint.src %>',
            tasks: ['jshint', 'mochaTest']
        },
        mochaTest: {
            test: {
                src: ['test/*.js']
            }
        }
    });

    // Load tasks
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-mocha-test');


    // Default task.
    grunt.registerTask('default', 'jshint');
    grunt.registerTask('test', 'mochaTest');
};