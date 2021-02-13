const crypto = require("crypto");
const { sanitize } = require("./utils");
const cfg = require("./config");

// Setup the database
const { Client } = require("pg");

const db = new Client(cfg.db);
db.connect();

function hash(text, salt) {
    var hash = crypto.createHmac("md5", salt);
    return hash.update(text).digest("hex");
}

function radnStr(size) {
    return crypto.randomBytes(size).toString("hex").slice(0, size);
}

class Authmanager {
    constructor() {
        this.salt = cfg.secret;
        this.db = db;
        this.sockets = {};
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
        // Create socket list if it dosent exists
        if (!this.sockets[username]) {
            this.sockets[username] = [];
        }
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

    async getConversation(id) {
        var query = `SELECT * FROM conversations WHERE id = '${parseInt(id)}'`;
        return await this.query(query);
    }

    async removeUserFromConversation(user, convId) {
        if (await this.userInConversation(user, convId)) {
            let conv = await this.getConversation(convId);
            if (conv.result[0].type == "chat") {
                let query = "DELETE FROM conversations WHERE id = $1";
                let resp = await this.db.query(query, [convId]);
                if (!resp.err) {
                    return { status: "sucess" };
                } else {
                    return { status: "error", error: res.err.message };
                }
            } else if (conv.type == "group") {
                console.warn("Groups not implemented");
                return { status: "error", error: "Not Implemnted yet" };
            }
        } else {
            return { status: "error", error: "User not in conversation" };
        }
    }

    async acceptConversation(user, convId) {
        if (await this.userInConversation(user, convId)) {
            let conv = (await this.getConversation(convId)).result[0];
            if (conv.type == "chat" || conv.type == "group") {
                let query =
                    "UPDATE conversations SET accepted[$1] = 'true' WHERE id = $2";
                let resp = await this.db.query(query, [
                    conv.members.indexOf(user) + 1, // SQL ist not zreo-indexed
                    convId,
                ]);
                if (!resp.err) {
                    return { status: "sucess" };
                } else {
                    return { status: "error", error: res.err.message };
                }
            } else {
                return { status: "error", error: "Not Implemented" };
            }
        } else {
            return { status: "error", error: "User not in conversation" };
        }
    }

    async getFullName(name) {
        var query = `SELECT fullname FROM users WHERE name='${name}'`;
        var response = await this.query(query);
        if (response.status == "sucess" && response.result[0]) {
            return response.result[0].fullname;
        }
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
        var query = `INSERT INTO messages VALUES ('${msg.conversation}', NOW(), '${msg.type}', '${msg.content}', '${msg.sent_by}')`;
        return await this.query(query);
    }

    async hasContact(user1, user2) {
        var query = `SELECT * FROM conversations WHERE type = 'chat' AND '${user1}' = ANY(members) AND '${user2}' = ANY(members)`;
        var response = await this.query(query);
        if (response.status == "sucess" && response.result.length == 1) {
            return true;
        } else {
            return false;
        }
    }

    async getUser(user) {
        var query = `SELECT * FROM users WHERE name = '${user}'`;
        var response = await this.query(query);
        if (response.status == "sucess" && response.result[0]) {
            return response.result[0];
        } else {
            return;
        }
    }

    async createConverssation(conversation) {
        var query =
            "INSERT INTO conversations VALUES ((SELECT COUNT(id) + 1 FROM conversations), $1, $2, $3, $4)";
        var res = await this.db.query(query, [
            conversation.type,
            conversation.name,
            conversation.members,
            conversation.accepted,
        ]);
        return res;
    }
}

module.exports = Authmanager;
