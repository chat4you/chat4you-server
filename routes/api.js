var express = require("express");
var router = express.Router();
const crypto = require('crypto');
const config = require('../config');
const { Client } = require('pg');

const db = new Client(config.db);
db.connect()
// Login api
router.post("/login", (req, res, next) => {
    var hash = crypto.createHmac('md5', config.secret);
    hash = hash.update(req.body.password).digest('hex');
    var query = `SELECT *
    FROM users
    WHERE password_hash='${hash}' AND name='${req.body.username}'
    `;
    db.query(query, (err, response) => {
        if (err) {
            console.error(err);
        }
        if (response.rows[0] && response.rows[0].verified) {
            req.session.login = true;
            req.session.name = req.body.name;
            req.session.fullname = response.rows[0].fullname;
            console.log(`User ${req.body.username} logged in succesfully.`)
            res.json({login: true})
        } else {
            console.log(`User ${req.body.username} tried to login with password ${req.body.password}.`)
            res.json({login: false})
        }
    })
});

module.exports = router;
