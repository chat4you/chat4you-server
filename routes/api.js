var express = require("express");
var router = express.Router();
const utils = require("../utils");
const fs = require("fs");
const sharp = require("sharp");
const { sanitize } = require("../utils");
const createError = require("http-errors");
const cfg = require("../config");

const auths = new (require("../auth"))();

const Conversations = require("../models/conversations");
const Messages = require("../models/messages");
const Users = require("../models/users");
const { Op } = require("sequelize");

var ignore = /^\/?(login|check-login)/; // RegEx for urls without authentication

var usersBySession = {};

module.exports = (io) => {
    router.use((req, res, next) => {
        if (
            (req.session.login || ignore.test(req.url)) &&
            (req.session.admin || !/^\/admin/.test(req.url))
        ) {
            next();
        } else {
            res.json({ status: "error", error: "not logged in" });
        }
    });

    // Login
    router.post("/login", async (req, res) => {
        let result = await auths.login(req.body.username, req.body.password);
        if (result.status != "succes") {
            res.json({ login: false });
            return;
        }
        req.session.login = true;
        req.session.admin = false;
        req.session.name = req.body.username;
        req.session.userData = result.userData;
        usersBySession[req.session.id] = result.userData;
        res.cookie("Auth", result.cookieAuth);
        res.cookie("Verify", result.cookieVerify);
        console.log(`User ${req.body.username} logged in succesfully.`);
        res.json({ login: true });
        if (result.userData.type == "admin") {
            req.session.admin = true;
        }
    });

    // Logout
    router.get("/logout", (req, res) => {
        try {
            delete usersBySession[req.session.id];
        } catch {}
        req.session.destroy();
        auths.logout(req.cookies.Auth, req.cookies.Verify);
        res.send("bye");
    });

    router.get("/check-login", (req, res) => {
        res.json({ login: req.session.login ? true : false });
    });

    router.get("/me", (req, res) => {
        res.json({
            status: usersBySession[req.session.id] ? "succes" : "error",
            data: usersBySession[req.session.id],
        });
    });

    // User profile update
    router.post("/me/profile-update", async (req, res) => {
        // verifiy data
        if (req.body.fullname.length <= 3 || /\s/i.test(req.body.fullname)) {
            res.render("error", {
                message: "Invalid input",
                error: {
                    status:
                        "Bad full name (length < 4 or/and contains only whitespaces)",
                    stack: "",
                },
            });
        } else if (!/^\S{3,}@\S{1,}\.\S{2,}$/i.test(req.body.email)) {
            res.render("error", {
                message: "Invalid input",
                error: {
                    status: "Bad email",
                    stack: "",
                },
            });
        } else {
            let fileBuffer = fs.readFileSync(req.body.profileImage.path);
            if (fileBuffer.length != 0) {
                try {
                    await sharp(fileBuffer)
                        .resize(300, 300)
                        .toFile(
                            `data/images/${
                                usersBySession[req.session.id].id
                            }.png`
                        );
                } catch {
                    console.log(
                        `${
                            usersBySession[req.session.id].name
                        } uploaded some crap`
                    );
                }
            }
            let user = usersBySession[req.session.id];
            user.fullname = req.body.fullname;
            user.email = req.body.email;
            req.session.userData = user;
            await user.save();
            res.redirect("/");
        }
    });

    // Profile images
    router.get("/users/:user/profile-image/", async (req, res) => {
        let id = parseInt(req.params.user);
        let fpath = `data/images/${id}.png`;
        if (!fs.existsSync(fpath)) {
            fpath = "data/images/default.png";
        }
        let readStream = fs.createReadStream(fpath);
        readStream.pipe(res);
    });

    router.get("/users/:user/fullname", async (req, res) => {
        let user = await Users.findByPk(parseInt(req.params.user));
        if (user) {
            res.send(user.fullname);
        } else {
            res.sendStatus(404);
        }
    });

    // User contacts
    router.get("/me/contacts", async (req, res) => {
        let contacts = await Conversations.findAll({
            where: {
                members: { [Op.contains]: [usersBySession[req.session.id].id] },
            },
        });
        res.json({ status: "succes", data: contacts });
    });

    // Admin user update
    router.post("/update-admin/:id", async (req, res, next) => {
        if (req.session.admin) {
            let user = await Users.findByPk(parseInt(req.params.id));
            if (user) {
                if (/\S/.test(req.body.password)) {
                    req.body.password_hash = utils.hash(
                        req.body.password,
                        cfg.secret
                    );
                }
                delete req.body.password; // Passord column does not exist in database
                try {
                    await user.update(req.body);
                    res.json({ status: "succes" });
                    return;
                } catch (error) {} //  do not return since the default response is error
            }
            res.json({ status: "error" });
        } else {
            next(createError(404));
        }
    });

    io.on("connection", async (socket) => {
        await new Promise((resolve) => {
            socket.on("auth", async (data) => {
                var cookie = utils.cookieParser(data);
                if (auths.verify(cookie.Auth, cookie.Verify)) {
                    socket.cookieAuth = cookie.Auth; // Save cookie for later
                    let userData = auths.loginsByCookie[cookie.Auth].userData;
                    socket.user = userData;
                    socket.authenticated = true;
                    socket.emit("auth", {
                        status: "succes",
                        data: userData,
                    });
                    (await Users.findOne({ where: { name: socket.user.name } }))
                        .status == "offline";
                    auths.sockets[userData.id].push(socket);
                    resolve(); // Continue to next step
                } else {
                    socket.emit("auth", { status: "verifyFail" });
                }
            });
        });
        console.log("Socket authenticated");
        // If authentication is not succesfull this will never be run
        socket.on("getMessages", async (data) => {
            if (await auths.userInConversation(socket.user.id, data.id)) {
                var messages = await auths.getMessages(parseInt(data.id));
                socket.emit("getMessages", {
                    status: "succes",
                    id: data.id,
                    result: messages,
                });
            } else {
                socket.emit("getMessages", { status: "authFailed" });
                console.log("Socket auth failed");
            }
        });

        socket.on("message", async (userMessage) => {
            try {
                if (
                    !(await auths.userInConversation(
                        socket.user.id,
                        userMessage.conversation
                    ))
                ) {
                    socket.emit("message", {
                        status: "error",
                        message: "User not in conversation",
                        id: userMessage.conversation,
                    });
                    return;
                }
                userMessage.sent_by = socket.user.id;
                userMessage.type = utils.sanitize(userMessage.type);
                switch (userMessage.type) {
                    case "text":
                        if (!/\S/i.test(userMessage.content)) {
                            return; // empty message was sent
                        }
                        userMessage.content = utils.sanitize(
                            userMessage.content
                        );
                        break;
                    default:
                        socket.emit("message", {
                            status: "error",
                            message: "Unknown message type",
                            id: userMessage.conversation,
                        });
                }
                await auths.addMessage(userMessage);
                var conversation = await Conversations.findByPk(
                    userMessage.conversation
                );
                for (var i in conversation.members) {
                    if (conversation.accepted[i]) {
                        auths.sockets[conversation.members[i]]?.forEach(
                            (otherSocket) => {
                                otherSocket.emit("message", {
                                    status: "succes",
                                    data: userMessage,
                                    id: userMessage.conversation,
                                });
                            }
                        );
                    }
                }
            } catch (err) {
                console.error(err);
                socket.emit("message", {
                    status: "error",
                    message: "Server error",
                    id: userMessage?.conversation,
                });
            }
        });

        socket.on("requestContacts", async (data) => {
            try {
                data.other = utils.sanitize(data.other);
                switch (data.type) {
                    case "chat":
                        if (
                            await auths.hasContact(socket.user.id, data.other)
                        ) {
                            socket.emit("requestContacts", {
                                status: "error",
                                message: "Already in conversation",
                            });
                            return;
                        }
                        if (await auths.getUser(data.other)) {
                            // Lets create the conversation
                            let conversation = {
                                type: "chat",
                                name: "", // Name will be dynamic for each user
                                members: [socket.user.id, data.other],
                                accepted: [true, false],
                            };
                            let response = await auths.createConverssation(
                                conversation
                            );
                            socket.emit("requestContacts", {
                                status: "succes",
                            });
                        } else {
                            socket.emit("requestContacts", {
                                status: "error",
                                message: "Other user dosen't exist",
                            });
                        }
                        break;

                    default:
                        break;
                }
            } catch {
                socket.emit("requestContacts", {
                    status: "error",
                    message: "Internal error",
                });
            }
        });

        socket.on("acceptReject", async (data) => {
            if (typeof data.id != "number") {
                socket.emit("acceptReject", {
                    status: "error",
                    error: "Id is not a number",
                });
                return;
            }
            var res;
            if (data.action == "reject") {
                res = await auths.removeUserFromConversation(
                    socket.user.id,
                    data.id
                );
            } else if (data.action == "accept") {
                res = await auths.acceptConversation(socket.user.id, data.id);
            }
            socket.emit("acceptReject", res);
        });

        socket.on("disconnect", async () => {
            let socketArray = auths.sockets[socket.user.id];
            socketArray.splice(socketArray.indexOf(socket), 1);
            if (socketArray.length == 0) {
                socket.user.status == "offline";
            }
            console.log("Socket disconnected");
        });
    });

    return router;
};
