const gulp = require('gulp'),
      //plugins servidor local y sincronización automática
      browserSync = require('browser-sync')
 
      //Plugins para FTP
      ftp = require('vinyl-ftp'),
      gutil = require('gulp-util'),
 
      //PLugins para compilar scss
      plumber = require('gulp-plumber'),
      sass = require('gulp-sass'),

      //PLugins para compilar pug
      pug = require('gulp-pug'),
 
      //Plugins para optimizar imágenes
      imagemin = require('gulp-imagemin'),
      cache = require('gulp-cache'),
 
      //PLugins Post CSS
      postcss = require('gulp-postcss'),
      cssnano = require('cssnano'),//autoprefixer

      //comprimir JS
      uglifyjs = require('uglify-js'),
      minifier = require('gulp-uglify/minifier'),
      pump = require('pump');
 
 
//---> Sincronizar Navegador
      gulp.task('browser-sync',() =>
        browserSync({
          server: {
              baseDir: "./"
          }
        })
      );
 
      gulp.task('bs-reload',() =>
        browserSync.reload()
      );
//---> Fin Sincronizar Navegador
 
 
//---> scss
gulp.task('compilarscss',() =>
  gulp.src('./src/scss/**/*.scss')
      .pipe(plumber({
        errorHandler: function(error) {
            console.log(error.message);
            this.emit('end');
        }
      }))
      .pipe(sass())
      .pipe(gulp.dest('./src/css/'))
);
//---> Fin scss
 
 
//---> PostCss
plugPostcss = [
  cssnano({
    autoprefixer: {
      add: true,
      browsers: 'last 2 versions'
    },
    core: true,
  })
];
 
gulp.task('tareasPostcss',() =>
  gulp.src('./src/css/**/*.css')
      .pipe(postcss(plugPostcss))
      .pipe(gulp.dest('assets/css/'))
);
//---> Fin PostCss

//---> Pug
gulp.task('compilarPug',() =>
  gulp.src('./src/vistas/*.pug')
  .pipe(pug({
    pretty:true
  }))
  .pipe(gulp.dest('./'))  
);
//---> Fin scss
 
//---> Fin Pug 
 
//optimizar Imagenes
gulp.task('imagenes', function() {
    gulp.src('src/images/**/*')
        .pipe(cache(imagemin({
          optimizationLevel: 7,
          progressive: true,
          interlaced: true })))
        .pipe(gulp.dest('assets/images/'));
});
//Fin optimizar Imagenes

//Comprimir JS
gulp.task('comprimirJs', function (cb) {
  // the same options as described above 
  var options = {
    preserveComments: 'license'
  };
 
  pump([
      gulp.src('src/js/*.js'),
      //gulp.src('src/js/**/*'),//Comprimir todos los JS
      minifier(options, uglifyjs),
      gulp.dest('assets/js/')
    ],
    cb
  );
});
//Fin Comprimir JS
 
//---> FTP
//Configuración de conexion
var user = process.env.FTP_USER='';
var password = process.env.FTP_PWD='';
var host = '';
var port = 21;
var dirLocales = [
  './assets/*/**' ,
  './assets/*/*/**' ,
  './assets/*/**/*' ,
  './*',
  //omitir carpetas y archivos (anteponer simbolo !)
  '!./src' ,
  '!./node_modules' ,
  '!./gulpfile.js' ,
  '!./package.json' ,
  '!./yarn.lock'
  ];
var dirRemoto = '/public_html/'
 
//función auxiliar para construir una conexión FTP
//basada en nuestra configuración
function getFtpConnection() {
    return ftp.create({
        host: host,
        port: port,
        user: user,
        password: password,
        parallel: 5,
        log: gutil.log
    });
}
 
/**
 * Implementando la tarea
 * Copia los archivos al servidor
 *
 */
 gulp.task('ftp-subir', function() {
     var conn = getFtpConnection();
     return gulp.src(dirLocales, { base: '.', buffer: false })
         .pipe(conn.newer(dirRemoto)) // Sube todo
         .pipe(conn.dest(dirRemoto));
 });
 /**
   * Observa la copia local para los cambios y
   copia los nuevos archivos al servidor cada vez
   que se detecta un cambio
 **/
 gulp.task('ftp-observar-cambios', function() {
     var conn = getFtpConnection();
     gulp.watch(dirLocales)
         .on('change', function(event) {
             console.log('Cambios detectados! Subiendo Archivo "' + event.path + '", ' + event.type);
             return gulp.src([event.path], { base: '.', buffer: false })
                 .pipe(conn.newer(dirRemoto)) // Solo sube archivos más recientes
                 .pipe(conn.dest(dirRemoto));
         });
 });
//---> Fin FTP
 

 
//Tarea que "observa" los directorios locales, compila scss, 
//minifica el css y sube a un servidor los cambios de cualquier archivo
gulp.task('ftp', ['ftp-observar-cambios'] , function() {
  gulp.watch('./src/scss/**/*.scss', ['compilarscss']);
  gulp.watch('./src/css/**/*.css', ['tareasPostcss']);
  gulp.watch(dirLocales, ['ftp-observar-cambios']);
});

//Tarea que "observa" y compila los archivos pug
gulp.task('pug' , function() {
  gulp.watch('./src/vistas/**/*', ['compilarPug']);
});

//Levanta un servidor local para supervisar archivos
var dirList = [
    './assets/css/estilos.css',
    './assets/js/**/*',
    './src/vistas/*.pug',
    './assets/images/**/*',
    './*.html'
];
gulp.task('default', ['browser-sync'] , function() {
  gulp.watch('./src/scss/**/*.scss', ['compilarscss']);
  gulp.watch('./src/css/**/*.css', ['tareasPostcss']);
  gulp.watch('./src/js/*.js', ['comprimirJs']);
  gulp.watch('./src/vistas/**/*', ['compilarPug']);
  gulp.watch(dirList, ['bs-reload']);
});
