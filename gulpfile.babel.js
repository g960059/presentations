const gulp = require('gulp');
const pug = require('gulp-pug');
const reveal = require('gulp-revealjs');
const webserver = require('gulp-webserver');
const minimist = require('minimist');
const rename = require("gulp-rename");
const replace = require("gulp-replace");
const markdown = require('gulp-markdown');
const html2jade = require('gulp-html2jade');
const jade = require('gulp-jade');
var gulpSequence = require('gulp-sequence')


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
  .pipe(pug({pretty: true, basedir:"./"}))
  .pipe(gulp.dest('reveal'))
});

gulp.task('pug_md', ()=> {
  gulp.src('pug/index.pug')
  .pipe(pug({pretty: true, basedir:"./"}))
  .pipe(html2jade())
  .pipe(replace("  hr"," section"))
  .pipe(gulp.dest('reveal'))
});
gulp.task('jade',()=>{
  gulp.src('reveal/index.jade')
  .pipe(jade({
      pretty: true
    }))
  .pipe(gulp.dest('reveal'))
})

gulp.task('watch', ()=>{
  gulp.watch('pug/*.pug',['rename','pug'])
})

gulp.task('dev',gulpSequence(['rename','pug','serve','watch']))
gulp.task('dev_md',gulpSequence(['rename','pug_md','jade', 'serve']))



