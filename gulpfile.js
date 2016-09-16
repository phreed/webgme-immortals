
var gulp = require('gulp');
// var ts = require('gulp-typescript');
// var tsProject = ts.createProject('tsconfig.json');

gulp.task('dist-metadata', function () {
    gulp.src(['src/ts/**/metadata.json'], 
            {base: 'src/ts'})
        .pipe(gulp.dest('gen'))
})

gulp.task('dist', ['dist-metadata']);

gulp.watch('src/ts/**/metadata.json', ['dist-metadata']);

/*
gulp.task('typescript-compile', function () {
	return tsProject.src()
		.pipe(ts(tsProject))
		.js.pipe(gulp.dest('gen'));
});
*/

gulp.task('default', ['dist']);
