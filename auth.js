const crypto = require("crypto");
const { sanitize } = require("./utils");

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
        this.cookiesByName = {};
    }

    query(query) {
        return new Promise((resolve) => {
            this.db.query(query, (err, res) => {
                if (err) {
                    console.error(query);
                    throw err;
                } else {
                    resolve({ status: "sucess", result: res.rows });
                }
            });
        });
    }

    login(username, password, callback) {
        // some anti xss
        username = sanitize(username);
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
                delete user.password_hash; // Hide sensitive information
                this.loginsByCookie[randomString] = {
                    username: username,
                    userData: user,
                };
                if (!this.cookiesByName[username]) {
                    this.cookiesByName[username] = []; // User might have multiple sessions
                }
                this.cookiesByName[username].push(randomString);
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
        var query = `SELECT * FROM conversations WHERE id = '${parseInt(
            convId
        )}' AND '${sanitize(name)}' = ANY(members)`;
        var result = await this.query(query);
        if (result.status == "sucess" && result.result[0]) {
            return true;
        }
        return false;
    }

    async getContacts(name) {
        var query = `SELECT * FROM conversations WHERE '${name}' = ANY (members)`;
        return await this.query(query);
    }

    async getMessages(convId, startTime) {
        var query = `SELECT * FROM messages WHERE conversation = '${parseInt(
            convId
        )}' AND sent <= '${startTime}' ORDER BY sent ASC`;
        return await this.query(query);
    }

    async setStatus(name, status) {
        var query = `UPDATE users SET status='${sanitize(
            status
        )}' WHERE name='${name}'`;
        return await this.query(query);
    }

    async getStatus(name) {
        var query = `SELECT status FROM users WHERE name='${sanitize(name)}'`;
        return (await this.query(query)).result[0].status;
    }

    async addMessage(msg) {
        var query = `INSERT INTO messages VALUES ('${
            msg.conversation
        }', '${new Date().toISOString()}', '${msg.type}', '${msg.content}', '${
            msg.sent_by
        }')`;
        return await this.query(query);
    }

    async getConversation(id) {
        var query = `SELECT * FROM conversations WHERE id = '${parseInt(id)}'`;
        return await this.query(query);
    }
}

module.exports = Authmanager;
