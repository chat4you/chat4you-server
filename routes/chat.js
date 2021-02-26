var express = require("express");
var router = express.Router();

router.get("/", (req, res, next) => {
    if (!req.session.login) {
        res.redirect("/login");
    } else {
        res.render("chat", {
            data: req.session.userData,
        });
    }
});

router.get("/login", function (req, res, next) {
    res.render("login", { title: "Login to continue" });
});

module.exports = router;
