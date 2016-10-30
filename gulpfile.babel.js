const gulp = require('gulp');
const pug = require('gulp-pug');
const reveal = require('gulp-revealjs');
const webserver = require('gulp-webserver');
const minimist = require('minimist');
const rename = require("gulp-rename");

gulp.task('default',()=>{
  console.log("test");
});

gulp.task('copy',()=>{
  gulp.src(['plugin/menu.js'])
  .pipe(gulp.dest('dist'));
});

gulp.task('slides', () => gulp.src('sources/*.pug')
    .pipe(pug({}))
    .pipe(reveal())
    .pipe(gulp.dest('slides/'))
);

gulp.task('serve', ()=> {
  gulp.src('reveal') //Webサーバーで表示するサイトのルートディレクトリを指定
    .pipe(webserver({
      livereload: true, //ライブリロードを有効に
      //directoryListing: true //ディレクトリ一覧を表示するか。オプションもあり
    }));
});

var argv = minimist(process.argv.slice(2));
var file_name = argv['f'];


gulp.task('rename',()=>{
  gulp.src(file_name)
  .pipe(rename('tmp.pug'))
  .pipe(gulp.dest('pug'))
});

gulp.task('pug', ()=> {
  gulp.src('pug/index.pug')
  .pipe(pug({pretty: true}))
  .pipe(gulp.dest('reveal'))
});
gulp.task('watch', ()=>{
  gulp.watch('pug/*.pug',['rename','pug'])
})

gulp.task('dev',['rename','pug','serve','watch'])



