var express = require("express");
var router = express.Router();

/* GET users listing. */
router.get("/", (req, res, next) => {
    if (!req.session.login) {
        res.redirect("/login");
    } else {
        var message = `Welcome ${req.session.login}!`;
        res.render("chat", { message: message });
    }
});

router.get("/logout", (req, res) => {
    delete req.session.login;
    res.redirect('/')
});

module.exports = router;
