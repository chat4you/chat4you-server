var express = require("express");
var router = express.Router();
const utils = require("../utils");
const fs = require("fs");
const sharp = require("sharp");
const { sanitize } = require("../utils");

const auths = new (require("../auth"))();

var ignore = /^\/?(login)/; // RegEx for urls without authentication

var usersBySession = {};

module.exports = (io) => {
    router.use((req, res, next) => {
        if (
            (req.session.login || ignore.test(req.url)) &&
            (req.session.admin || !/^\/admin/.test(req.url))
        ) {
            next();
        } else {
            console.log(req.url);
            res.json({ status: "error", error: "Permission Error" });
        }
    });

    // Login api
    router.post("/login", async (req, res) => {
        let result = await auths.login(req.body.username, req.body.password);
        if (result.status != "succes") {
            res.json({});
        }
        req.session.login = true;
        req.session.admin = false;
        req.session.name = req.body.username;
        req.session.userData = result.userData;
        usersBySession[req.session.id] = result.userData;
        res.cookie("Auth", result.cookieAuth);
        res.cookie("Verify", result.cookieVerify);
        console.log(`User ${req.body.username} logged in succesfully.`);
        if (result.userData.type == "user") {
            res.json({ login: true, nextPage: "/chat" });
        } else if (result.userData.type == "admin") {
            req.session.admin = true;
            res.json({ login: true, nextPage: "/administration" });
        }
    });

    router.get("/logout", (req, res) => {
        delete usersBySession[req.session.id];
        req.session.destroy();
        auths.logout(req.cookies.Auth, req.cookies.Verify, (status) => {});
        res.redirect("/login");
    });

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
            res.redirect("/chat");
        }
    });

    router.get("/profile-image/:type/:id", async (req, res) => {
        let id;
        switch (req.params.type) {
            case "id":
                id = parseInt(req.params.id);
                break;
            case "name":
                let user = await auths.getUser(sanitize(req.params.id));
                id = user.id;
                break;
            default:
                break;
        }
        let fpath = `data/images/${id}.png`;
        if (!fs.existsSync(fpath)) {
            fpath = "data/images/default.png";
        }
        let readStream = fs.createReadStream(fpath);
        readStream.pipe(res);
    });

    router.get("/me/contacts", async (req, res) => {
        let contacts = await auths.getContacts(
            usersBySession[req.session.id].name
        );
        res.json(contacts);
    });

    io.on("connection", async (socket) => {
        var socketType;
        await new Promise((resolve) => {
            socket.on("auth", (data) => {
                var cookie = utils.cookieParser(data);
                if (auths.verify(cookie.Auth, cookie.Verify)) {
                    socket.cookieAuth = cookie.Auth; // Save cookie for later
                    socketType = auths.loginsByCookie[cookie.Auth].accountType;
                    let userData = auths.loginsByCookie[cookie.Auth].userData;
                    socket.name = userData.name;
                    socket.authenticated = true;
                    socket.emit("auth", {
                        status: "succes",
                        data: userData,
                    });
                    auths.setStatus(socket.name, "online");
                    auths.sockets[userData.name].push(socket);
                    resolve(); // Continue to next step
                } else {
                    socket.emit("auth", { status: "verifyFail" });
                }
            });
        });
        console.log("Socket authenticated");
        // If authentication is not succesfull this will never be run
        socket.on("getMessages", async (data) => {
            if (await auths.userInConversation(socket.name, data.id)) {
                var messages = await auths.getMessages(data.id);
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

        socket.on("message", async (data) => {
            if (
                await auths.userInConversation(socket.name, data.conversation)
            ) {
                data.type = utils.sanitize(data.type);
                if (data.type == "text") {
                    // dont want to sanitize image, audio, etc.
                    data.content = utils.sanitize(data.content);
                    if (!/\S/i.test(data.content)) {
                        return;
                    }
                }
                await auths.addMessage(data);
                var conversation = await auths.getConversation(
                    data.conversation
                );
                for (var i in conversation.members) {
                    if (
                        conversation.accepted[i] &&
                        auths.sockets[conversation.members[i]] &&
                        auths.sockets[conversation.members[i]].length >= 1
                    ) {
                        for (var ii in auths.sockets[conversation.members[i]]) {
                            let otherSocket =
                                auths.sockets[conversation.members[i]][ii];
                            otherSocket.emit("message", data);
                        }
                    }
                }
            }
        });

        socket.on("requestContacts", async (data) => {
            data.other = utils.sanitize(data.other);
            switch (
                data.type // You might want to create groups
            ) {
                case "chat":
                    if (
                        typeof data.other == "string" &&
                        !(await auths.hasContact(socket.name, data.other))
                    ) {
                        if (await auths.getUser(data.other)) {
                            // Lets create the conversation
                            let conversation = {
                                type: "chat",
                                name: "", // Name will be dynamic for each user
                                members: [socket.name, data.other],
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
                                error: "Other user dosen't exist",
                            });
                        }
                    } else {
                        socket.emit("requestContacts", {
                            status: "error",
                            error: "Already in conversation",
                        });
                    }
                    break;

                default:
                    break;
            }
        });

        socket.on("fullnameOf", async (data) => {
            data.name ? (data.name = utils.sanitize(data.name)) : undefined;
            if (data.name && (await auths.hasContact(data.name, socket.name))) {
                let fullName = await auths.getFullName(data.name);
                if (fullName) {
                    socket.emit("fullnameOf", {
                        status: "succes",
                        name: data.name,
                        fullname: fullName,
                    });
                } else {
                    socket.emit("fullnameOf", { status: "error" });
                }
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
                    socket.name,
                    data.id
                );
            } else if (data.action == "accept") {
                res = await auths.acceptConversation(socket.name, data.id);
            }
            socket.emit("acceptReject", res);
        });

        socket.on("disconnect", () => {
            let socketArray = auths.sockets[socket.name];
            socketArray.splice(socketArray.indexOf(socket), 1);
            if (socketArray.length == 0) {
                auths.setStatus(socket.name, "offline");
            }
            console.log("Socket disconnected");
        });
    });

    return router;
};
