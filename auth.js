const crypto = require("crypto");
const { sanitize, radnStr, hash } = require("./utils");
const cfg = require("./config");
// Setup database
const { Sequelize, Op } = require("sequelize");
const sequelize = new Sequelize(cfg.db.database, cfg.db.user, cfg.db.password, {
    host: cfg.db.host,
    dialect: "postgres",
});
const Conversations = require("./models/conversations")(sequelize);
const Messages = require("./models/messages")(sequelize);
const Users = require("./models/users")(sequelize);

class Authmanager {
    constructor() {
        this.salt = cfg.secret;
        this.sockets = {};
        this.loginsByCookie = {};
        this.cookiesByName = {};
    }

    async login(username, password) {
        // some anti xss
        username = sanitize(username);
        // Create socket list if it dosent exists
        var passhash = hash(password, this.salt);
        let user = await Users.findone({
            where: {
                name: username,
                password_hash: passhash,
            },
        });
        if (user) {
            var randomString = radnStr(50);
            var hashOfString = hash(randomString, this.salt);
            delete user.password_hash; // Hide sensitive information
            this.loginsByCookie[randomString] = {
                username: username,
                userData: user,
            };
            if (!this.cookiesByName[username]) {
                this.cookiesByName[username] = []; // User might have multiple sessions
            }
            this.cookiesByName[username].push(randomString);
            if (!user.verified) {
                return {
                    status: "unverified",
                    cookieAuth: randomString,
                    cookieVerify: hashOfString,
                    userData: res.rows[0],
                };
            }
            if (!this.sockets[username]) {
                this.sockets[username] = [];
            }
            return {
                status: "succes",
                cookieAuth: randomString,
                cookieVerify: hashOfString,
                userData: res.rows[0],
            };
        } else {
            return { status: "wrongpass" };
        }
    }

    logout(cookieAuth, cookieVerify) {
        if (this.verify(cookieAuth, cookieVerify)) {
            delete this.loginsByCookie[cookieAuth];
            return { status: "succes" };
        } else {
            return { status: "error", error: "Verify failed" };
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
        let result = Conversations.findOne({
            where: {
                [Op.and]: [
                    { id: parseInt(convId) },
                    {
                        members: {
                            [Op.contains]: sanitize(name),
                        },
                    },
                ],
            },
        });
        if (result) {
            return true;
        } else {
            return false;
        }
    }

    async getConversation(id) {
        return await Conversations.findOne({ where: { id: id } });
    }

    async removeUserFromConversation(user, convId) {
        if (await this.userInConversation(user, convId)) {
            let conv = await this.getConversation(convId);
            if (conv.type == "chat") {
                let destroyed = await Conversations.destroy({
                    where: { id: paresInt(convId) },
                });
                return { status: "succes" };
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
            let conv = await this.getConversation(convId);
            if (conv.type == "chat" || conv.type == "group") {
                // Continue here
                let query =
                    "UPDATE conversations SET accepted[$1] = 'true' WHERE id = $2";
                let resp = await this.db.query(query, [
                    conv.members.indexOf(user) + 1, // SQL ist not zreo-indexed
                    convId,
                ]);
                if (!resp.err) {
                    return { status: "succes" };
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
        if (response.status == "succes" && response.result[0]) {
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
        if (response.status == "succes" && response.result.length == 1) {
            return true;
        } else {
            return false;
        }
    }

    async getUser(user) {
        var query = `SELECT * FROM users WHERE name = '${user}'`;
        var response = await this.query(query);
        if (response.status == "succes" && response.result[0]) {
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
