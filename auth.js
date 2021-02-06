const crypto = require("crypto");

function hash(text, salt) {
    var hash = crypto.createHmac("md5", salt);
    return hash.update(text).digest("hex");
}

function radnStr(size) {
    return crypto.randomBytes(size).toString("hex").slice(0, size);
}

class Authmanager {
    constructor(salt, db) {
        this.salt = salt;
        this.db = db;
        this.loginsByCookie = {};
    }

    login(username, password, callback) {
        var passhash = hash(password, this.salt);
        var query = `SELECT * FROM users WHERE password_hash='${passhash}' AND name='${username}'`;
        this.db.query(query, (err, res) => {
            if (err) {
                callback({ status: "error", error: err });
                return;
            } else if (res.rows[0]) {
                var randomString = radnStr(50);
                var hashOfString = hash(randomString, this.salt);
                var user = res.rows[0];
                delete user.password_hash; // Delte sensitive information
                this.loginsByCookie[randomString] = {
                    username: username,
                    userData: user,
                };
                if (res.rows[0].verified) {
                    callback({
                        status: "sucess",
                        cookieAuth: randomString,
                        cookieVerify: hashOfString,
                        userData: res.rows[0],
                    });
                    return;
                }
                callback({
                    status: "unverified",
                    cookieAuth: randomString,
                    cookieVerify: hashOfString,
                    userData: res.rows[0],
                });
                return;
            } else {
                callback({ status: "wrongpass" });
                return;
            }
        });
    }

    logout(cookieAuth, cookieVerify, callback) {
        if (this.verify(cookieAuth, cookieVerify)) {
            delete this.loginsByCookie[cookieAuth];
            callback({ status: "sucess" });
        } else {
            callback({ status: "error", error: "Verify failed" });
        }
    }

    verify(cookieAuth, cookieVerify) {
        if (hash(cookieAuth, this.salt) == cookieVerify) {
            return true;
        } else {
            return false;
        }
    }

    async userInConversation(name, convId) {
        var query = `SELECT * FROM conversations WHERE id = '${convId}' AND '${name}' = ANY(members)`;
        return await new Promise((done) => {
            this.db.query(query, (err, res) => {
                if (err) {
                    console.error(err);
                    done(false)
                } else if (res.rows[0]) {
                    done(true)
                } else {
                    done(false);
                }
            });
        });
    }

    async getMessages(convId, startTime) {
        var query = `SELECT * FROM messages WHERE conversation = '${convId}' AND sent <= '${startTime}'`;
        return await new Promise((done) => {
            this.db.query(query, (err, res) => {
                if (err) {
                    console.error(err);
                    done({ status: "error" });
                } else {
                    done({ status: "sucess", rows: res.rows });
                }
            });
        });
    }
}

module.exports = Authmanager;
