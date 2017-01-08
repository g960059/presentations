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
const runSequence = require('run-sequence');
const fileSync = require('gulp-file-sync');

var s3 = require('gulp-s3-upload')({
    accessKeyId: "AKIAIOIJOCJNUTSYCRXQ",
    secretAccessKey: "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",
    region:"ap-northeast-1"
});
var splitExt = (filename) =>{
    return filename.split(/\.(?=[^.]+$)/);
}


var argv = minimist(process.argv.slice(2));
var file_name = argv['f'];
var file = file_name.split('/')[1];

gulp.task('serve', ()=> {
  gulp.src('docs') //Webサーバーで表示するサイトのルートディレクトリを指定
    .pipe(webserver({
      livereload: true, //ライブリロードを有効に
      //directoryListing: true //ディレクトリ一覧を表示するか。オプションもあり
    }));
});

gulp.task('sync', function() {
  gulp.watch(['src/*.*'], function() {
    fileSync('src', 'docs/src', {recursive: false});
  });
});

gulp.task('sync_',  function() {
    fileSync('src', 'docs/src', {recursive: false});
});

gulp.task('rename',()=>{
  return gulp.src(file_name)
  .pipe(rename('tmp.pug'))
  .pipe(gulp.dest('pug'))
});

gulp.task('pug', ()=> {
  return gulp.src('pug/index.pug')
  .pipe(pug({
    pretty: true, 
    basedir:"./",
    locals: {
        src: '../src',
      }
  }))
  .pipe(gulp.dest('docs'))
});

gulp.task('pug_md', ()=> {
  return gulp.src('pug/index.pug')
  .pipe(pug({pretty: true, basedir:"./"}))
  .pipe(html2jade())
  .pipe(replace("  hr"," section"))
  .pipe(gulp.dest('docs'))
});
gulp.task('jade',()=>{
  return gulp.src('docs/index.jade')
  .pipe(jade({
      pretty: true
    }))
  .pipe(gulp.dest('docs'))
});
gulp.task('pug_s3', ()=> {
  return gulp.src('pug/index.pug')
  .pipe(pug({
    pretty: true, 
    basedir:"./",
    locals: {
        src: 'https://s3-ap-northeast-1.amazonaws.com/presentation-src',
      }
  }))
  .pipe(rename(splitExt(file)[0]+".html"))
  .pipe(gulp.dest('docs'))
});

gulp.task('watch', ()=>{
  return gulp.watch('pug/*.pug',['rename','pug'])
});
gulp.task('watch_s3', ()=>{
  return gulp.watch('pug/*.pug',['rename','pug_s3'])
});
gulp.task('watch-src', function(){
  gulp.watch('src/**',['upload']);
});

gulp.task('dev',(cb) => {
  return runSequence('sync_','rename','pug','serve','watch','sync', cb);
});
gulp.task('publish',(cb) => {
  return runSequence('sync_','rename','upload','pug_s3','serve','watch_s3','sync', cb);
});

//upload to S3
gulp.task("upload", () => {
  return  gulp.src("src/**")
        .pipe(s3({
            Bucket: 'presentation-src', //  Required 
            ACL:    'public-read'       //  Needs to be user-defined 
        }, {
            // S3 Constructor Options, ie: 
            maxRetries: 5
        }))
});

