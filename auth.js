const { sanitize, randStr, hash } = require("./utils");
const cfg = require("./config");
// Setup database
const { Op } = require("sequelize");
const sequelize = require("./models/db");

const Conversations = require("./models/conversations");
const Messages = require("./models/messages");
const Users = require("./models/users");
Conversations.sync({ alter: true });
Messages.sync({ alter: true });
Users.sync({ alter: true });

class Authmanager {
    constructor () {
        this.sockets = {};
        this.loginsByCookie = {};
        this.cookiesByName = {};
    }

    async login (username, password) {
        // some anti xss
        username = sanitize(username);
        // Create socket list if it dosent exists
        const passhash = hash(password, cfg.secret);
        const user = await Users.findOne({
            where: {
                name: username,
                password_hash: passhash,
            },
        });
        if (user) {
            const randomString = randStr(50);
            const hashOfString = hash(randomString, cfg.secret);
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
            if (!this.sockets[user.id]) {
                this.sockets[user.id] = [];
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

    logout (cookieAuth, cookieVerify) {
        if (this.verify(cookieAuth, cookieVerify)) {
            delete this.loginsByCookie[cookieAuth];
            return { status: "succes" };
        } else {
            return { status: "error", error: "Verify failed" };
        }
    }

    verify (cookieAuth, cookieVerify) {
        if (
            hash(cookieAuth, cfg.secret) === cookieVerify &&
            this.loginsByCookie[cookieAuth]
        ) {
            return true;
        } else {
            return false;
        }
    }

    async userInConversation (name, convId) {
        const result = await Conversations.findOne({
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

    async removeUserFromConversation (user, convId) {
        if (await this.userInConversation(user, convId)) {
            const conv = await Conversations.findOne({ where: { id: convId } });
            if (conv.type === "chat") {
                await Conversations.destroy({
                    // eslint-disable-next-line no-undef
                    where: { id: paresInt(convId) },
                });
                return { status: "succes" };
            } else if (conv.type === "group") {
                console.warn("Groups not implemented");
                return { status: "error", error: "Not Implemnted yet" };
            }
        } else {
            return { status: "error", error: "User not in conversation" };
        }
    }

    async acceptConversation (user, convId) {
        if (await this.userInConversation(user, convId)) {
            const conv = await Conversations.findOne({ where: { id: convId } });
            if (conv.type === "chat" || conv.type === "group") {
                const accepted = conv.accepted; // Workaround since sequelize dosent detect changes in array
                accepted[conv.members.indexOf(user)] = true;
                conv.accepted = null;
                conv.accepted = accepted;
                await conv.save();
                return { status: "succes" };
            } else {
                return { status: "error", error: "Not Implemented" };
            }
        } else {
            console.log("User in conversation");
            return { status: "error", error: "User not in conversation" };
        }
    }

    async getMessages (convId, startTime) {
        return await Messages.findAll({
            where: { conversation: parseInt(convId) },
            order: [["sent", "ASC"]],
        });
    }

    async setStatus (name, status) {
        const user = await this.getUser(name);
        user.status = status;
    }

    async getStatus (name) {
        return (
            await Users.findOne({
                where: { name: sanitize(name) },
                attributes: ["status"],
            })
        ).status;
    }

    async addMessage (msg) {
        return await Messages.create({
            conversation: parseInt(msg.conversation),
            sent: sequelize.fn("NOW"),
            type: msg.type,
            content: msg.content,
            sent_by: sanitize(msg.sent_by),
        });
    }

    async hasContact (user1, user2) {
        const response = await Conversations.findOne({
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

    async createConverssation (conversation) {
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
