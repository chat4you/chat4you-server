const crypto = require("crypto");
const { sanitize, radnStr, hash } = require("./utils");
const cfg = require("./config");
// Setup database
const { Op } = require("sequelize");
const sequelize = require("./models/db");

const Conversations = require("./models/conversations");
const Messages = require("./models/messages");
const Users = require("./models/users");
Conversations.sync();
Messages.sync();
Users.sync();

class Authmanager {
    constructor() {
        this.sockets = {};
        this.loginsByCookie = {};
        this.cookiesByName = {};
    }

    async login(username, password) {
        // some anti xss
        username = sanitize(username);
        // Create socket list if it dosent exists
        var passhash = hash(password, cfg.secret);
        let user = await Users.findOne({
            where: {
                name: username,
                password_hash: passhash,
            },
        });
        if (user) {
            var randomString = radnStr(50);
            var hashOfString = hash(randomString, cfg.secret);
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
                    userData: user,
                };
            }
            if (!this.sockets[username]) {
                this.sockets[username] = [];
            }
            return {
                status: "succes",
                cookieAuth: randomString,
                cookieVerify: hashOfString,
                userData: user,
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
        if (
            hash(cookieAuth, cfg.secret) == cookieVerify &&
            this.loginsByCookie[cookieAuth]
        ) {
            return true;
        } else {
            return false;
        }
    }

    async userInConversation(name, convId) {
        let result = await Conversations.findOne({
            where: {
                [Op.and]: [
                    { id: parseInt(convId) },
                    {
                        members: {
                            [Op.contains]: [sanitize(name)],
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
                await Conversations.destroy({
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
            console.log("accepting conversation..");
            let conv = await this.getConversation(convId);
            if (conv.type == "chat" || conv.type == "group") {
                console.log(conv);
                let accepted = conv.accepted; // Workaround since sequelize dosnet detect changes in array
                accepted[conv.members.indexOf(user)] = true;
                conv.accepted = null;
                conv.accepted = accepted;
                console.log(conv);
                await conv.save();
                return { status: "success" };
            } else {
                return { status: "error", error: "Not Implemented" };
            }
        } else {
            console.log("User in conversation");
            return { status: "error", error: "User not in conversation" };
        }
    }

    async getFullName(name) {
        let user = await this.getUser(name);
        return user.fullname;
    }

    async getContacts(name) {
        return await Conversations.findAll({
            where: { members: { [Op.contains]: [sanitize(name)] } },
        });
    }

    async getMessages(convId, startTime) {
        return await Messages.findAll({
            where: { conversation: parseInt(convId) },
            order: [["sent", "ASC"]],
        });
    }

    async setStatus(name, status) {
        let user = await this.getUser(name);
        user.status = status;
    }

    async getStatus(name) {
        return (
            await Users.findOne({
                where: { name: sanitize(name) },
                attributes: ["status"],
            })
        ).status;
    }

    async addMessage(msg) {
        return await Messages.create({
            conversation: parseInt(msg.conversation),
            sent: sequelize.fn("NOW"),
            type: msg.type,
            content: msg.content,
            sent_by: sanitize(msg.sent_by),
        });
    }

    async hasContact(user1, user2) {
        let response = await Conversations.findOne({
            where: {
                [Op.and]: [
                    { members: { [Op.contains]: [user1, user2] } },
                    { type: "chat" },
                ],
            },
        });
        if (response) {
            return true;
        } else {
            return false;
        }
    }

    async getUser(name) {
        return await Users.findOne({ where: { name: name } });
    }

    async createConverssation(conversation) {
        return await Conversations.create({
            id: (await Conversations.count()) + 1,
            name: conversation.name,
            members: conversation.members,
            accepted: conversation.accepted,
            type: conversation.type,
        });
    }
}

module.exports = Authmanager;
