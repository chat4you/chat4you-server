var http = require('http');
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require('express-session');
const cfg = require('./config');

// Setup the database
const { Client } = require("pg");

const db = new Client(cfg.db);
db.connect();
const auths = new (require('./auth'))(cfg.secret, db)


// Server setup
const app = express();
app.set('port', cfg.port);
var server = http.createServer(app).listen(cfg.port);

// setup socket.io
const io = require('socket.io')(server);

const apiRouter = require('./routes/api')(db, io, auths);
const chatRouter = require('./routes/chat');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({secret: cfg.session_secret}))

app.use('/api', apiRouter);
app.use('/', chatRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});