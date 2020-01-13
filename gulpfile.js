"use strict";

/* eslint global-require: "off" */
/* eslint-disable guard-for-in */

const gulp = require('gulp');
const browserify = require('browserify');
const babelify = require('babelify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const rename = require('gulp-rename');
const uglifyjs = require('gulp-uglify-es').default;
const sourcemaps = require('gulp-sourcemaps');
const eslint = require("gulp-eslint");
const jasmine = require('gulp-jasmine');
const jsdoc2md = require("jsdoc-to-markdown");
const Promise = require("bluebird");
const fs = Promise.promisifyAll(require("fs"));

// const karma = require('karma');

const pkg = require('./package.json');
const _ = require('lodash');
const path = require('path');

const CONFIG = {
    BABEL: {
        presets: [
            ["@babel/preset-env", {
                targets: {
                    browsers: "cover 99.5%, last 2 versions, not dead"
                }
            }]
        ]
    },
    BROWSERIFY: {
        global: _.keys(pkg.browser)[0],
        bundle: path.basename(_.values(pkg.browser)[0]),
        dirname: path.dirname(_.values(pkg.browser)[0]),
        sourceMap: "./",
        exclude: ["lodash"]
    },
    PATHS: {
        src: `${path.dirname(pkg.main)}/**/*.js`,
        testsPath: pkg.config.testsPath,
        docAPIPath: pkg.config.docAPI
        
        // karma: ["./test/helpers/**/*.js", "./test/unit/**/*.spec.js"], // Helpers need to go first
    },
    NAMES: {
        docAPITitle: pkg.config.docTitle
    }
};

// const runKarma = (files, cb) => {
//     process.chdir(__dirname);
//     new karma.Server({
//         files,
//         frameworks: ['browserify', 'jasmine'],
//         browsers: ['Chrome', 'Firefox', 'IE'],
//         preprocessors: {
//             "./test/**/*.js": ['browserify']
//         },
//         plugins: [
//             'karma-browserify',
//             'karma-chrome-launcher',
//             'karma-firefox-launcher',
//             'karma-jasmine'
//         ],
//         browserify: {
//             debug: true,
//             transform: [["babelify", CONFIG.BABEL]],
//             configure(bundle) {
//                 bundle.once('prebundle', () => {
//                     bundle.transform('babelify').plugin('proxyquire-universal');
//                 });
//             }
//         },
//         singleRun: true,
//         autoWatch: false,
//         captureTimeout: 210000,
//         browserDisconnectTolerance: 3,
//         browserDisconnectTimeout: 210000,
//         browserNoActivityTimeout: 210000
//     }, cb).start();
// };

gulp.task("browserify", () =>
    browserify({
        entries: pkg.main,
        debug: true,
        standalone: CONFIG.BROWSERIFY.global
    })
        .exclude(CONFIG.BROWSERIFY.exclude)
        .transform(babelify, CONFIG.BABEL)
        .bundle()
        .pipe(source(CONFIG.BROWSERIFY.bundle))
        .pipe(buffer())
        .pipe(gulp.dest(CONFIG.BROWSERIFY.dirname))
        .pipe(sourcemaps.init({ loadMaps: true }))
        .pipe(uglifyjs())
        .pipe(rename({ extname: '.min.js' }))
        .pipe(sourcemaps.write(CONFIG.BROWSERIFY.sourceMap))
        .pipe(gulp.dest(CONFIG.BROWSERIFY.dirname))
);

gulp.task("lint", () => gulp
    .src([CONFIG.PATHS.src])
    .pipe(eslint())
    .pipe(eslint.format())
);

gulp.task("unit", async () => gulp
    .src(CONFIG.PATHS.testsPath)
    .pipe(jasmine())
);

// gulp.task("e2e-generate", cb => {
//     runJasmine(PATHS.jasmineConfigs.e2eGenerate, cb);
// });

// gulp.task("e2e-parse", cb => {
//     runJasmine(PATHS.jasmineConfigs.e2eParse, cb);
// });

// gulp.task('e2e-browser', cb => {
//     runKarma(["./test/helpers/**/*.js", "./browser/xlsx-populate.js", "./test/e2e-browser/**/*.spec.js"], cb);
// });

// gulp.task('unit-browser', cb => {
//     runKarma(PATHS.karma, cb);
// });

gulp.task("docs", () => 
    jsdoc2md.render({ files: CONFIG.PATHS.src })
        .then(output => {
            return fs.writeFileAsync(CONFIG.PATHS.docAPIPath, CONFIG.NAMES.docAPITitle + output);
        })
);

gulp.task("watch", () => {
    // Only watch src, unit, and docs for changes. Everything else is too slow or noisy.
    gulp.watch([CONFIG.PATHS.src, CONFIG.PATHS.unitTests], ["unit"]);
    gulp.watch([CONFIG.PATHS.src], ["build"]);
});

gulp.task("build", gulp.parallel("docs", "browserify", "lint"));

gulp.task("test", gulp.series("build", "unit"));

// Watch just the quick stuff to aid development.
gulp.task("default", gulp.series("unit", "watch"));
