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

      //Concatenar JS
      concat = require('gulp-concat'),
      rename = require('gulp-rename'),

      //comprimir JS
      uglifyjs = require('uglify-js'),
      minifier = require('gulp-uglify/minifier'),
      pump = require('pump'),
      //limpieza de directorios
      clean = require('gulp-clean')
      //Condicionales dentro de gulp
      gulpif = require('gulp-if');





/* * * * *

Tarea: Sincronizar Navegador

* * * * */
var useServer = false;
//Directorios a observar
var dirList = [
    './site/assets/css/*.css',
    './site/assets/js/**/*',
    './src/pug/*.pug',
    './site/assets/images/**/*',
    './site/*.html',
    './site/**/*.html',
    '!./site/bloques' 
];

gulp.task('browser-sync', () =>
  browserSync({
          server: {
              baseDir: "./site"
          }
        })
      );
 
      gulp.task('bs-reload',() =>
        browserSync.reload()
);



gulp.task('server', ['browser-sync'] , function() {
  gulp.watch(dirList, ['bs-reload']);
});
// Fin Sincronizar Navegador





/* * * * *

Tarea: Compilar / Minificar Sass

* * * * */

//---> compilando archivos scss
gulp.task('sass',() =>
  gulp.src('./src/sass/**/*.scss')
      .pipe(plumber({
        errorHandler: function(error) {
            console.log(error.message);
            this.emit('end');
        }
      }))
      .pipe(sass())
      .pipe(gulp.dest('./src/dev/css/'))
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
 
gulp.task('postcss',() =>
  gulp.src('./src/dev/css/*.css')
      .pipe(postcss(plugPostcss))
      .pipe(gulp.dest('./site/assets/css/'))
);
//---> Fin PostCss

gulp.task('styles', function() {
    gulp.watch('./src/sass/**/*.scss', ['sass']);
    gulp.watch('./src/dev/css/**/*.css', ['postcss']);
});

// Fin Compilar / Minificar Sass




/* * * * *

Tarea: Compilar / Minificar Sass

* * * * */

//---> compilando archivos pug
var pugFiles = [
    './src/pug/**/*.pug',

];
gulp.task('pugCompile',() =>
  gulp.src(pugFiles)
  .pipe(pug({
    pretty:true
  }))
  .pipe(gulp.dest('./site'))  
);



gulp.task('pug', function() {
    gulp.watch(pugFiles, ['pugCompile','clean']);
});

// Fin Compilar archivos pug





/* * * * *

Tarea: Optimizar imagenes

* * * * */
gulp.task('images', function() {
    gulp.src('src/images/**/*')
        .pipe(cache(imagemin({
          optimizationLevel: 7,
          progressive: true,
          interlaced: true })))
        .pipe(gulp.dest('./site/assets/images/'));
});
//Fin Optimizar imagenes




/* * * * *

Tarea: Optimizar Scripts

* * * * */

var jsFiles = [
  //Librerias
  'src/js/lib/jquery-2.1.4.min.js', 
  'src/js/lib/modernizr.js', 
  'src/js/lib/prefixfree.min.js', 
  'src/js/lib/analytics.js', 
  //Codigo del sitio
  'src/js/app.js'
  ],  
    jsDest = './src/dev/js';

gulp.task('concat-js', function() {  
    return gulp.src(jsFiles)
        .pipe(concat('scripts.js'))
        .pipe(gulp.dest(jsDest));
});

//Comprimir JS
gulp.task('compress-js', function (cb) {
  // the same options as described above 
  var options = {
    preserveComments: 'license'
  };
 
  pump([
      gulp.src('./src/dev/js/*.js'),
      //gulp.src('src/js/**/*'),//Comprimir todos los JS
      minifier(options, uglifyjs),
      gulp.dest('./site/assets/js/')
    ],
    cb
  );
});

gulp.task('scripts', function() {
    gulp.watch(jsFiles, ['concat-js']);
    gulp.watch('./src/dev/js/*.js', ['compress-js']);
});
//Fin Optimizar scripts





/* * * * *

Tarea: Conexion FTP

* * * * */
//Configuración de conexion



var user = process.env.FTP_USER='';
var password = process.env.FTP_PWD='';
var host = '';
var port = 21;
var dirLocales = [
  './site/assets/*/**' ,
  './site/assets/*/*/**' ,
  './site/assets/*/**/*' ,
  './site/*',
  //omitir carpetas y archivos (anteponer simbolo !)
  '!./src' ,
  '!./site/bloques' ,
  '!./node_modules' ,
  '!./gulpfile.js' ,
  '!./package.json' ,
  '!./yarn.lock'
  ];
var dirRemoto = '/public_html'
 
//función auxiliar para construir una conexión FTP
//basada en nuestra configuración
function getFtpConnection() {
    return ftp.create({
        host: host,
        port: port,
        user: user,
        password: password,
        parallel: 50,
        maxConnections:100,
        log: gutil.log
    });
}
 
/**
 * Implementando la tarea
 * Copia los archivos al servidor
 *
 */
 gulp.task('upload', function() {
     var conn = getFtpConnection();
     return gulp.src(dirLocales, { base: './site', buffer: false })
         .pipe(conn.newer(dirRemoto)) // Sube todo
         .pipe(conn.dest(dirRemoto));
 });
 /**
   * Observa la copia local para los cambios y
   copia los nuevos archivos al servidor cada vez
   que se detecta un cambio
 **/
 gulp.task('ftp-changes', function() {
     var conn = getFtpConnection();
     gulp.watch(dirLocales)
         .on('change', function(event) {
             console.log('Cambios detectados! Subiendo Archivo "' + event.path + '", ' + event.type);
             return gulp.src([event.path], { base: './site', buffer: false })
                 .pipe(conn.newer(dirRemoto)) // Solo sube archivos más recientes
                 .pipe(conn.dest(dirRemoto));
                 
         });
 });

 gulp.task('ftp', ['ftp-changes'], function() {
    
});
//---> Fin FTP
 





/* * * * *

Tarea: Limpieza de directorios

* * * * */

var deleteDir = [
    './site/bloques'
];

gulp.task('clean', function() {
   return gulp.src(deleteDir, {read: false})
        .pipe(clean());
});
//Ffin limpeza de directorios




gulp.task('sync', ['pug', 'styles', 'images', 'scripts', 'ftp'] , function() {

});
/* * * * *

Tarea: default

* * * * */
gulp.task('default', ['browser-sync', 'styles', 'pug', 'images', 'scripts'] , function() {
  gulp.watch(dirList, ['bs-reload', 'clean']);
});
