var express = require("express");
var router = express.Router();

router.get("/", (req, res, next) => {
    if (!req.session.login) {
        res.redirect("/login");
    } else {
        res.render("chat", { fullname: req.session.fullname, me: req.session.name});
    }
});


router.get("/login", function (req, res, next) {
    res.render("login", { title: "Login to continue" });
});


router.get("/logout", (req, res) => {
    delete req.session.login;
    res.redirect('/')
});

module.exports = router;
