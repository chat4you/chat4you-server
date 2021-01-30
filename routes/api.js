var express = require("express");
var router = express.Router();
const crypto = require("crypto");
const config = require("../config");
const { Client } = require("pg");
const { query } = require("express");

const db = new Client(config.db);
db.connect();

router.use((req, res, next) => {
    if (req.session.login) {
        next();
    } else if (req.url == "/login") {
        console.log(`allowing no lofin for ${req.url}`);
        next();
    } else {
        console.log(req.url)
        res.json({ status: "error", error: "not logged in" });
    }
});

// Login api
router.post("/login", (req, res) => {
    var hash = crypto.createHmac("md5", config.secret);
    hash = hash.update(req.body.password).digest("hex");
    var query = `SELECT * FROM users WHERE password_hash='${hash}' AND name='${req.body.username}'`;
    db.query(query, (err, resp) => {
        if (err) {
            console.error(err);
        }else if (resp.rows[0] && resp.rows[0].verified) {
            req.session.login = true;
            req.session.name = req.body.username;
            req.session.fullname = resp.rows[0].fullname;
            console.log(`User ${req.body.username} logged in succesfully.`);
            res.json({ login: true });
        } else {
            console.log(
                `User ${req.body.username} tried to login with password ${req.body.password}.`
            );
            res.json({ login: false });
        }
    });
});

router.post("/contact", (req, res) => {
    var exists_query = `SELECT * FROM conversations WHERE '${req.session.name}' = ANY (members) AND
        '${req.body.newname}' = ANY (members) AND NOT type = 'group'`;
    db.query(exists_query, (err, resp) => {
        if (err) {
            console.error(err);
        } else if (resp.rows[0]) {
            res.json({ status: "error", error: "Contact exists" });
        } else {
            var create_query = `INSERT INTO conversations VALUES ((select count(*) from conversations), 'chat', '', '{${req.session.name}, ${req.body.newcontact}}', '{true, false}')`;
            db.query(create_query, (err2, resp2) => {
                if (err2) {
                    console.error(err2);
                } else {
                    res.json({ status: "sucess" });
                }
            });
        }
    });
});

router.get("/contact", (req, res) => {
    var get_contacts = `SELECT * FROM conversations WHERE '${req.session.name}' = ANY (members)`;
    db.query(get_contacts, (err, resp) =>{
        if (err) {
            console.error(err);
        } else {
            res.json(resp.rows);
        }
    })
});

module.exports = router;
