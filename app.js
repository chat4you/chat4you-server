const http = require("http");
const createError = require("http-errors");
const formData = require("express-form-data");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const session = require("express-session");
const cfg = require("./config");

// Server setup
const app = express();
app.set("port", cfg.port);
const server = http.createServer(app).listen(cfg.port);

// form data configuration
const formOpts = {
    uploadDir: path.join(__dirname, "/uploads"),
    autoClean: true,
};
app.use(formData.parse(formOpts));
app.use(formData.stream());
app.use(formData.format());
app.use(formData.union());

// setup socket.io
const io = require("socket.io")(server);

const apiRouter = require("./routes/api")(io);

const sessionConfig = {
    name: "chat.sid",
    secret: cfg.session_secret,
    resave: true,
    store: new session.MemoryStore(),
    saveUninitialized: true,
};
// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(session(sessionConfig));

app.use("/api", apiRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = process.env.DEBUG === "true" ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render("error");
});

process.on("SIGTERM", () => {
    server.close(() => {
        "Server shutdown";
    });
});
