const express = require("express");
const router = express.Router();
const utils = require("../utils");
const fs = require("fs");
const sharp = require("sharp");
const createError = require("http-errors");
const cfg = require("../config");

const auths = new (require("../auth"))();

const Conversations = require("../models/conversations");
const Users = require("../models/users");
const { Op } = require("sequelize");

const ignore = /^\/?(login|check-login)/; // RegEx for urls without authentication

const usersBySession = {};

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
        const result = await auths.login(req.body.username, req.body.password);
        if (result.status !== "succes") {
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
        if (result.userData.type === "admin") {
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
        res.json({ login: !!req.session.login });
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
            const fileBuffer = fs.readFileSync(req.body.profileImage.path);
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
            const user = usersBySession[req.session.id];
            user.fullname = req.body.fullname;
            user.email = req.body.email;
            req.session.userData = user;
            await user.save();
            res.redirect("/");
        }
    });

    // Profile images
    router.get("/users/:user/profile-image/", async (req, res) => {
        const id = parseInt(req.params.user);
        let fpath = `data/images/${id}.png`;
        if (!fs.existsSync(fpath)) {
            fpath = "data/images/default.png";
        }
        const readStream = fs.createReadStream(fpath);
        readStream.pipe(res);
    });

    router.get("/users/:user/fullname", async (req, res) => {
        let id = parseInt(req.params.user);
        if (!id) {
            res.sendStatus(404);
            return;
        }
        let user = await Users.findByPk(id);
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

    io.use(async (socket, next) => {
        try {
            const cookie = utils.cookieParser(socket.handshake.auth.cookies);
            if (auths.verify(cookie.Auth, cookie.Verify)) {
                socket.cookieAuth = cookie.Auth; // Save cookie for later
                const userData = auths.loginsByCookie[cookie.Auth].userData;
                socket.user = userData;
                socket.authenticated = true;
                socket.emit("auth", {
                    status: "succes",
                    data: userData,
                });
                (await Users.findOne({ where: { name: socket.user.name } }))
                    .status = "offline";
                auths.sockets[userData.id].push(socket);
                next();
            } else {
                socket.emit("auth", { status: "verifyFail" });
                next(new Error("Cokkie virication failed"));
            }
        } catch (err) {
            socket.emit("auth", {
                status: "error",
                message: process.env.DEBUG ? err.message : "Fatal error",
            });
        }
    });

    io.on("connection", async (socket) => {
        socket.on("getMessages", async (data) => {
            if (await auths.userInConversation(socket.user.id, data.id)) {
                const messages = await auths.getMessages(parseInt(data.id));
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
                const conversation = await Conversations.findByPk(
                    userMessage.conversation
                );
                for (let i in conversation.members) {
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

        socket.on("requestContact", async (data) => {
            try {
                data.other = parseInt(data.other); // TBD: allow string for suggestions
                if (!data.other) {
                    socket.emit("requestContact", {
                        status: "error",
                        message: "Invalid input",
                    });
                    return;
                }
                switch (data.type) {
                    case "chat":
                        if (
                            await auths.hasContact(socket.user.id, data.other)
                        ) {
                            socket.emit("requestContact", {
                                status: "error",
                                other: data.other,
                                message: "Already in conversation",
                            });
                            return;
                        }
                        if (await Users.findByPk(data.other)) {
                            // create the conversation
                            const conversation = {
                                type: "chat",
                                name: "", // Name will be different for each user
                                members: [socket.user.id, data.other],
                                accepted: [true, false],
                            };
                            await auths.createConverssation(conversation);
                            socket.emit("requestContact", {
                                status: "succes",
                            });
                        } else {
                            socket.emit("requestContact", {
                                status: "error",
                                message: "Other user dosen't exist",
                            });
                        }
                        break;

                    default:
                        socket.emit("requestContact", {
                            status: "error",
                            message: "Unknown type",
                        });
                        break;
                }
            } catch (err) {
                socket.emit("requestContact", {
                    status: "error",
                    message:
                        process.env.DEBUG === "true"
                            ? err.message
                            : "Internal error",
                });
            }
        });

        socket.on("acceptReject", async (data) => {
            try {
                data.id = parseInt(data.id);
                if (!data.id && typeof data.action !== "string") {
                    socket.emit("acceptReject", {
                        status: "error",
                        error: "Invalid input",
                    });
                    return;
                }
                if (data.action === "reject") {
                    await auths.removeUserFromConversation(
                        socket.user.id,
                        data.id,
                    );
                } else if (data.action === "accept") {
                    await auths.acceptConversation(socket.user.id, data.id);
                }
                socket.emit("acceptReject", {
                    status: "succes",
                    action: data.action,
                });
            } catch (err) {
                socket.emit("acceptReject", {
                    status: "error",
                    message:
                        process.env.DEBUG === "true"
                            ? err.message
                            : "Internal error",
                });
            }
        });

        socket.on("disconnect", async () => {
            const socketArray = auths.sockets[socket.user.id];
            socketArray.splice(socketArray.indexOf(socket), 1);
            if (socketArray.length === 0) {
                socket.user.status = "offline";
            }
            console.log("Socket disconnected");
        });
    });

    return router;
};
