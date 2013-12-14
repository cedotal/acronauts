module.exports = function(grunt) {

    grunt.initConfig({
        shell: {
            runServer: {
                options: {
                    stdout: true
                },
                command: [
                    'killall -9 node',
                    'nodemon -e js,json,html,jade,css ./server/server.js'
                ].join('&&')
            }
        },
        jshint: {
            options: grunt.file.readJSON('./.jshintrc'),
            // TODO: add specific options for each sub-task relfecting the expectations for each
            // environment (i.e., node: true)
            client: {
                src: './public/client.js',
                options: {
                    browser: true,
                    jquery: true,
                    devel: true,
                    globals: {
                        // socket.io object
                        io: true
                    }
                }
            },
            server: {
                src: './server/*',
                options: {
                    devel: true,
                    node: true
                }
            },
            test: {
                src: './test/*.js',
                options: {
                    expr: true,
                    node: true,
                    globals: {
                        // should.js objects
                        it: true,
                        should: true,
                        describe: true
                    }
                }
            },
            tools: {
                src: ['./*.js', './*.json', './.jshintrc'],
                options: {
                    node: true
                }
            }
        },
        watch: {
            files: [
                '<%= jshint.client.src %>',
                '<%= jshint.server.src %>',
                '<%= jshint.test.src %>',
                '<%= jshint.tools.src %>'
            ],
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
    grunt.loadNpmTasks('grunt-shell');

    // Default task.
    grunt.registerTask('default', ['shell:runServer']);
    grunt.registerTask('test', ['mochaTest']);
};