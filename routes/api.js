var express = require("express");
var router = express.Router();
const utils = require("../utils");

module.exports = (db, io, auths) => {
    router.use((req, res, next) => {
        if (req.session.login) {
            next();
        } else if (req.url == "/login") {
            console.log(`allowing no login for ${req.url}`);
            next();
        } else {
            console.log(req.url);
            res.json({ status: "error", error: "not logged in" });
        }
    });

    // Login api
    router.post("/login", (req, res) => {
        auths.login(req.body.username, req.body.password, (result) => {
            if (result.status == "wrongpass") {
                console.log(
                    `User ${req.body.username} tried to login with password ${req.body.password}.`
                );
            } else {
                req.session.login = true;
                req.session.name = req.body.username;
                req.session.fullname = result.userData.fullname;
                res.cookie("Auth", result.cookieAuth);
                res.cookie("Verify", result.cookieVerify);
                console.log(`User ${req.body.username} logged in succesfully.`);
                res.json({ login: true });
            }
        });
    });

    router.get("/logout", (req, res) => {
        delete req.session.login;
        console.log(req.cookies.Verify, req.cookies.Auth);
        auths.logout(req.cookies.Auth, req.cookies.Verify, (status) => {});
        res.redirect("/");
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
        db.query(get_contacts, (err, resp) => {
            if (err) {
                console.error(err);
            } else {
                res.json(resp.rows);
            }
        });
    });

    router.post("/fullname-by-name", (req, res) => {
        if (req.body.name) {
            var get_by_name = `SELECT fullname FROM users WHERE name = '${req.body.name}' LIMIT 1`;
            db.query(get_by_name, (err, resp) => {
                if (err) {
                    console.error(err);
                } else if (resp.rows[0]) {
                    res.json(resp.rows);
                } else {
                    res.json({ status: "error", error: "User not found" });
                }
            });
        } else {
            res.json({ status: "error", error: "No name specified" });
        }
    });

    io.on("connection", (socket) => {
        socket.on("auth", (data) => {
            var cookie = utils.cookieParser(data);
            if (auths.verify(cookie.Auth, cookie.Verify)) {
                auths.loginsByCookie[cookie.Auth].socket = socket;
                socket.name = auths.loginsByCookie[cookie.Auth].userData.name;
                socket.authenticated = true;
                socket.emit("auth", { status: "sucess" });
                console.log('Socket Authenticated')
            } else {
                socket.emit("auth", { status: "verifyFail" });
            }
        });
        socket.on("disconnect", () => {
            console.log("Socket disconnected");
        });
        console.log("New unauthenticated socket");
    });

    return router;
};
