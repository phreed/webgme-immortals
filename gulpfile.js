
var gulp = require('gulp');

gulp.task('dist', function () {
    gulp.src(['src/ts/**/metadata.json'], 
            {base: 'src/ts'})
        .pipe(gulp.dest('gen'))
})