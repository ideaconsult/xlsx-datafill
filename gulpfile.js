"use strict";

const _ = require('lodash');
const path = require('path');
const gulp = require('gulp');
const browserify = require('browserify');
const browserifyShim = require('browserify-shim');
const babelify = require('babelify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const rename = require('gulp-rename');
const replace = require('gulp-replace');
const uglifyjs = require('gulp-uglify-es').default;
const sourcemaps = require('gulp-sourcemaps');
const eslint = require("gulp-eslint");
const jasmine = require('gulp-jasmine');
const jsdoc2md = require("jsdoc-to-markdown");
const Promise = require("bluebird");
const fs = Promise.promisifyAll(require("fs"));

const pkg = require('./package.json');

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
        shimConfig: { global: true }
    },
    PATHS: {
        src: `${path.dirname(pkg.main)}/**/*.js`,
        testsPath: "./test/*.spec.js",
        examplesPaths: ["./examples/*-template.xsls", "./examples/*.json"],
        docAPIPath: "./API.md"
    },
    NAMES: {
        docAPITitle: "# xlsx-datafill API reference\n\r"
    }
};

gulp.task("browserify", () =>
    browserify({
        entries: pkg.main,
        debug: true,
        standalone: CONFIG.BROWSERIFY.global
    })
        .transform(browserifyShim, CONFIG.BROWSERIFY.shimConfig)
        .transform(babelify, CONFIG.BABEL)
        .bundle()
        .pipe(source(CONFIG.BROWSERIFY.bundle))
        .pipe(replace('{{VERSION}}', pkg.version))
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

gulp.task("docs", () => 
    jsdoc2md.render({ files: CONFIG.PATHS.src })
        .then(output => {
            return fs.writeFileAsync(CONFIG.PATHS.docAPIPath, CONFIG.NAMES.docAPITitle + output);
        })
);

gulp.task("watch", () => {
    // Only watch src, unit, and docs for changes. Everything else is too slow or noisy.
    gulp.watch([CONFIG.PATHS.src], gulp.series(["test"]));
    gulp.watch([CONFIG.PATHS.testsPath].concat(CONFIG.PATHS.examplesPaths), gulp.series(["unit"]));
});

gulp.task("build", gulp.parallel("docs", "browserify", "lint"));

gulp.task("test", gulp.series("build", "unit"));

// Watch just the quick stuff to aid development.
gulp.task("default", gulp.series("test", "watch"));
