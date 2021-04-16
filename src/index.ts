import { createServer } from "http";
import createError, { HttpError } from "http-errors";
import formData from "express-form-data";
import express, { Response, NextFunction, Request } from "express";
import path from "path";
import cookieParser from "cookie-parser";
import httpLogger from "morgan";
import session from "express-session";
import { Server } from "socket.io";

import config from "../config.json";
import logger from "./logger";

// Http and app setup
const app = express();
app.set("port", config.port);
const server = createServer(app).listen(config.port);

// form data plugin
app.use(
    formData.parse({
        uploadDir: "./data/images",
        autoClean: true,
    })
);

app.use(formData.stream());
app.use(formData.format());
app.use(formData.union());

// Socket.io setup
const io = new Server(server);

// view engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Http request logger
app.use(httpLogger("dev"));

// Some other express stuff
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Express session setup
const sessionConfig = {
    name: "chat.session",
    secret: config.session_secret,
    resave: true,
    store: new session.MemoryStore(),
    saveUninitialized: true,
};
app.use(session(sessionConfig));

// Error handlers

app.use((req, res, next) => {
    next(createError(404));
});

app.use((err: HttpError, req: Request, res: Response, next: NextFunction) => {
    // render the error page
    res.status(err.status || 500);
    res.send({
        status: "error",
        code: err.status || 500,
        message: err.message,
    });
});

process.on("SIGTERM", () => {
    server.close(() => {
        console.log('Someone want\'s me to stop working, Bye!');
    });
});
