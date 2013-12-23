module.exports = function(grunt) {

    require('load-grunt-tasks')(grunt);

    grunt.initConfig({
        concurrent: {
            dev: {
                tasks: ['jshint', 'mochaTest', 'watch'],
                options: {
                    logConcurrentOutput: true
                }
            }
        },
        nodemon: {
            dev: {
                options: {
                    env: {
                        NODE_ENV: 'development'
                    },
                    file: './server/server.js',
                    watchedExtensions: ['js', 'json', 'css', 'jade', ''],
                    nodeArgs: ['--debug']                }
            }
        },
        foreverMulti: {
            production: {
                file: './server/server.js',
                options: 'NODE_ENV=production'
            }
        },
        jshint: {
            options: grunt.file.readJSON('./.jshintrc'),
            client: {
                src: ['./public/js/client.js',
                    './public/js/views/*.js',
                    './public/js/controllers/*.js',
                    './public/js/utils/*.js'
                ],
                options: {
                    browser: true,
                    jquery: true,
                    devel: true,
                    globals: {
                        // socket.io object
                        io: true,
                        requirejs: true,
                        define: true,
                        Backbone: true
                    }
                }
            },
            server: {
                src: ['./server/*.js', './server/*.json', './server/models/*.js'],
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
    grunt.registerTask('monitor', ['concurrent:dev']);
    grunt.registerTask('dev', ['nodemon']);
    grunt.registerTask('prod', ['foreverMulti:production']);
    grunt.registerTask('test', ['mochaTest']);
};