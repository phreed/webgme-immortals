
var gulp = require('gulp');


gulp.task('dist-metadata', function () {
    gulp.src(['src/ts/**/metadata.json'], 
            {base: 'src/ts'})
        .pipe(gulp.dest('gen'))
})

gulp.task('dist', ['dist-metadata']);

gulp.watch('src/ts/**/metadata.json', ['dist-metadata']);

gulp.task('default', ['dist']);