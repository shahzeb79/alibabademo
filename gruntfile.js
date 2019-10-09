module.exports = function (grunt) {
    "use strict";

    var proxyMiddleware = require("proxy-middleware");
    var rewriteMiddleware = require("http-rewrite-middleware");
    var url = require("url");

    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks("grunt-contrib-connect");
    grunt.loadNpmTasks("grunt-contrib-less");
    grunt.loadNpmTasks("grunt-contrib-qunit");
    grunt.loadNpmTasks("grunt-concurrent");
    grunt.loadNpmTasks("grunt-eslint");
    grunt.loadNpmTasks("grunt-openui5");
    grunt.loadNpmTasks("grunt-contrib-watch");

    grunt.loadNpmTasks("ps_mockserver");

    // forward requests to ui resources (app and SAPUI5)
    var aURLRewrites = [
        {
            from: "^/sap/ui5/1/(.*)$",
            to: "/bower_components/sapui5/$1"
        }, {
            from: "^/ps/app/ui(?:/|(?:/index.html))?(?:\\?.*|$)",
            to: "/demo/index.html"
        }, {
            from: "^/ps/app/ui/(.*)$",
            to: "/src/$1"
        }, {
            from: "^/ps/specs/unit/(.*)$",
            to: "/specs/unit/$1"
        }, {
            from: "^/ps/specs/integration/(.*)$",
            to: "/specs/integration/$1"
        }, {
            from: "^/ps/demo/(.*)$",
            to: "/demo/$1"
        }
    ];

    grunt.initConfig({
        eslint: {
            target: ["./src/**/*.js", "./specs/**/*.js", "gruntfile.js"]
        },
        clean: {
            css: {
                src: [
                    "src/**/*.css"
                ],
                expand: true
            }
        },
        openui5_theme: {
            library_prod: {
                options: {
                    compiler: {
                        compress: true
                    }
                },
                files: [
                    {
                        expand: true,
                        src: [
                            "src/**/themes/**/library.source.less"
                        ]
                    }
                ]
            },
            library: {
                files: [
                    {
                        expand: true,
                        src: [
                            "src/**/themes/**/library.source.less"
                        ]
                    }
                ]
            }
        },
        less: {
            style_prod: {
                options: {
                    compress: true
                },
                files: [{
                    expand: true,
                    src: [
                        "src/**/css/style.less"
                    ],
                    ext: ".css"
                }]
            },
            style: {
                files: [{
                    expand: true,
                    src: [
                        "src/**/css/style.less"
                    ],
                    ext: ".css"
                }]
            }
        },
        watch: {
            options: {
                atBegin: true,
                interrupt: true
            },
            styles: {
                files: [
                    "src/**/themes/**/*.less",
                    "src/**/css/*.less"
                ],
                tasks: ["styles"]
            }
        },
        mockserver: {
            appAPIServiceKeepalive: {
                options: {
                    keepalive: true,
                    basePath: "/ps/app/api/v1/",
                    port: 8765,
                    api: "https://github.wdf.sap.corp/raw/HCN/ps-app-svc/master/api/swagger.yml"
                },
                src: ["./mocks/"]
            },
            appAPIService: {
                options: {
                    keepalive: false,
                    basePath: "/ps/app/api/v1/",
                    port: 8765,
                    api: "https://github.wdf.sap.corp/raw/HCN/ps-app-svc/master/api/swagger.yml"
                },
                src: ["./mocks/"]
            },
            opa5TestDataKeepalive: {
                options: {
                    keepalive: true,
                    basePath: "/ps/app/api/v1/",
                    port: 8766,
                    api: "https://github.wdf.sap.corp/raw/HCN/ps-app-svc/master/api/swagger.yml"
                },
                src: ["./specs/integration/mocks/"]
            },
            opa5TestData: {
                options: {
                    keepalive: false,
                    basePath: "/ps/app/api/v1/",
                    port: 8766,
                    api: "https://github.wdf.sap.corp/raw/HCN/ps-app-svc/master/api/swagger.yml"
                },
                src: ["./specs/integration/mocks/"]
            }
        },
        connect: {
            hostedApp: {
                options: {
                    port: 8000,
                    middleware: function (connect, options, middlewares) {
                        middlewares.unshift(rewriteMiddleware.getMiddleware(aURLRewrites));

                        // forward backend requests to the mock server
                        var configProxyOptions = url.parse("http://localhost:3000/ps/app/api/");
                        configProxyOptions.route = "/ps/app/api/";
                        middlewares.unshift(proxyMiddleware(configProxyOptions));

                        return middlewares;
                    }
                }
            },
            mockedApp: {
                options: {
                    port: 8000,
                    middleware: function (connect, options, middlewares) {
                        middlewares.unshift(rewriteMiddleware.getMiddleware(aURLRewrites));

                        // forward backend requests to the mock server
                        var configProxyOptions = url.parse("http://localhost:8765/ps/app/api/");
                        configProxyOptions.route = "/ps/app/api/";
                        middlewares.unshift(proxyMiddleware(configProxyOptions));

                        return middlewares;
                    }
                }
            },
            mockedTestApp: {
                options: {
                    port: 8001,
                    middleware: function (connect, options, middlewares) {
                        middlewares.unshift(rewriteMiddleware.getMiddleware(aURLRewrites));

                        // forward backend requests to the mock server
                        var configProxyOptions = url.parse("http://localhost:8766/ps/app/api/");
                        configProxyOptions.route = "/ps/app/api/";
                        middlewares.unshift(proxyMiddleware(configProxyOptions));

                        return middlewares;
                    }
                }
            },
            qunit: {
                options: {
                    port: 8001,
                    middleware: function (connect, options, middlewares) {
                        // forward requests to ui resources (app and SAPUI5)
                        middlewares.unshift(rewriteMiddleware.getMiddleware(aURLRewrites));

                        return middlewares;
                    }
                }
            }
        },
        qunit: {
            unit: {
                options: {
                    urls: [
                        "http://localhost:8001/ps/specs/unit/unitTests.qunit.html"
                    ]
                }
            },
            integration: {
                options: {
                    page: {
                        viewportSize: {
                            width: 1920,
                            height: 1080
                        }
                    },
                    urls: [
                        "http://localhost:8001/ps/specs/integration/opaTests.qunit.html"
                    ]
                }
            }
        },
        concurrent: {
            options: {
                logConcurrentOutput: true
            },
            mockedApp: {
                tasks: [
                    "mockserver:appAPIServiceKeepalive",
                    "connect:mockedApp:keepalive",
                    "mockserver:opa5TestDataKeepalive",
                    "connect:mockedTestApp:keepalive",
                    "watch:styles"
                ]
            }
        }
    });

    grunt.registerTask("hostAppInfo", function() {
        grunt.log.writeln("The application is available on http://localhost:8000/ps/app/ui/?pid=201");
        grunt.log.writeln("The following services are expected to be available:");
        grunt.log.writeln(" - PS application service on http://localhost:3000/");
    });
    grunt.registerTask("localDevInfo", function() {
        grunt.log.writeln("The application is available on http://localhost:8000. Two patients are mocked:");
        grunt.log.writeln(" - http://localhost:8000/ps/app/ui/?pid=7");
        grunt.log.writeln(" - http://localhost:8000/ps/app/ui/?pid=8");
        grunt.log.writeln("Integration test setup is available on http://localhost:8001. Two patients are mocked:");
        grunt.log.writeln(" - http://localhost:8001/ps/app/ui/?pid=1");
        grunt.log.writeln(" - http://localhost:8001/ps/app/ui/?pid=2");
        grunt.log.writeln("Integration test runner is available on http://localhost:8001/ps/specs/integration/opaTests.qunit.html");
        grunt.log.writeln("The following services are mocked:");
        grunt.log.writeln(" - PS application service (demo/dev) on http://localhost:8765/");
        grunt.log.writeln(" - PS application service (integration test) on http://localhost:8766/");
    });

    grunt.registerTask("hostApp", [
        "hostAppInfo",
        "connect:hostedApp",
        "watch:styles"
    ]);

    grunt.registerTask("localDev", [
        "localDevInfo",
        "concurrent:mockedApp"
    ]);

    grunt.registerTask("styles", [
        "clean:css",
        "openui5_theme:library",
        "less:style"
    ]);

    grunt.registerTask("styles_prod", [
        "clean:css",
        "openui5_theme:library_prod",
        "less:style_prod"
    ]);

    grunt.registerTask("unit_test", [
        "connect:mockedTestApp",
        "qunit:unit"
    ]);

    grunt.registerTask("integration_test", [
        "mockserver:opa5TestData",
        "connect:mockedTestApp",
        "qunit:integration"
    ]);
};
