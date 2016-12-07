
var gulp = require('gulp');
// var ts = require('gulp-typescript');
// var tsProject = ts.createProject('tsconfig.json');

gulp.task('dist-client-metadata', function () {
    gulp.src(['src/ts/**/metadata.json'],
        { base: 'src/ts' })
        .pipe(gulp.dest('dist-client'))
})

gulp.task('dist-client', ['dist-client-metadata']);

// gulp.watch('src/ts/**/metadata.json', ['dist-client-metadata']);

/*
gulp.task('typescript-compile', function () {
	return tsProject.src()
		.pipe(ts(tsProject))
		.js.pipe(gulp.dest('dist-client'));
});
*/

gulp.task('default', ['dist-client']);
