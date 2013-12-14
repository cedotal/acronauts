module.exports = function(grunt) {

    require('load-grunt-tasks')(grunt);

    grunt.initConfig({
        shell: {
            killServers: {
                options: {
                    stdout: true,
                    stdin: true,
                    stderr: true,
                    failOnError:true
                },
                command: 'killall -9 node'
            }
        },
        concurrent: {
            dev: {
                tasks: ['jshint', 'mochaTest', 'watch', 'nodemon'],
                options: {
                    logConcurrentOutput: true
                }
            }
        },
        nodemon: {
            dev: {
                options: {
                    file: './server/server.js',
                    watchedExtensions: ['js', 'json', 'css', 'jade', ''],
                    nodeArgs: ['--debug']
                }
            }
        },
        jshint: {
            options: grunt.file.readJSON('./.jshintrc'),
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
                src: './server/**',
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

    // Default task.
    grunt.registerTask('default', ['shell:killServers', 'concurrent:dev']);
    grunt.registerTask('test', ['mochaTest']);
};