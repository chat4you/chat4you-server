var express = require("express");
var router = express.Router();
const crypto = require('crypto');
const config = require('../config')
const { Client } = require('pg')

const db = new Client(config.db);
db.connect()


/* GET home page. */
router.get("/", function (req, res, next) {
    res.render("login", { title: "Login to continue" });
});

//
router.post("/", (req, res, next) => {
    var hash = crypto.createHmac('md5', config.secret);
    hash = hash.update(req.body.password).digest('hex');
    console.log(hash)
    var query = `SELECT *
    FROM users
    WHERE password_hash='${hash}' AND name='${req.body.username}'
    `;
    db.query(query, (err, response) => {
        if (err) {
            console.error(err);
        }
        console.log(response);
        if (response) {
            req.session.login = req.body.username;
            res.json({login: true})
        } else {
            res.json({login: false})
        }
    })
});

module.exports = router;
