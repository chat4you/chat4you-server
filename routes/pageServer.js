var express = require("express");
var router = express.Router();

router.get("/", (req, res) => {
    res.render("home");
});

router.get("/login", function (req, res) {
    res.render("login", { title: "Login to continue" });
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

module.exports = router;
