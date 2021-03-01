var express = require("express");
var router = express.Router();
const createError = require("http-errors");
const Users = require("../models/users");
const fs = require("fs");
const path = require("path");

router.get("/", (req, res) => {
    res.render("home");
});

router.get("/login", function (req, res) {
    if (req.session.login) {
        req.session.admin
            ? res.redirect("/administration")
            : res.redirect("/chat");
    } else {
        res.render("login", { title: "Login to continue" });
    }
});

router.get("/chat", (req, res) => {
    if (!req.session.login) {
        res.redirect("/login");
    } else {
        res.render("chat", {
            data: req.session.userData,
        });
    }
});

router.get("/administration", async (req, res, next) => {
    if (req.session.admin) {
        res.render("admin", { users: await Users.findAll() });
    } else {
        next(createError(404));
    }
});

router.get("/administration/:file", (req, res, next) => {
    if (req.session.admin) {
        let filePath = path.normalize(
            __dirname + `/../data/admin_data/${req.params.file}`
        );
        if (fs.existsSync(filePath)) {
            res.sendFile(filePath);
        } else {
            next(createError(404));
        }
    } else {
        next(createError(404));
    }
});

module.exports = router;
