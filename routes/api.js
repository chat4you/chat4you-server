var express = require("express");
var router = express.Router();
const utils = require("../utils");
const cfg = require("../config");

const auths = new (require("../auth"))();

module.exports = (io) => {
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
        auths.logout(req.cookies.Auth, req.cookies.Verify, (status) => {});
        res.redirect("/");
    });

    io.on("connection", async (socket) => {
        await new Promise((resolve) => {
            socket.on("auth", (data) => {
                var cookie = utils.cookieParser(data);
                if (auths.verify(cookie.Auth, cookie.Verify)) {
                    socket.cookieAuth = cookie.Auth; // Save cookie for later
                    let userData = auths.loginsByCookie[cookie.Auth].userData;
                    socket.name = userData.name;
                    socket.authenticated = true;
                    socket.emit("auth", {
                        status: "sucess",
                        data: userData,
                    });
                    auths.setStatus(socket.name, "online"); // Chatter is now online
                    auths.sockets[userData.name].push(socket);
                    resolve(); // Continue to nex step
                } else {
                    socket.emit("auth", { status: "verifyFail" });
                }
            });
        });
        console.log("Socket authenticated");
        // If authentication is not succesfull this will never be run
        socket.on("getMessages", async (data) => {
            if (await auths.userInConversation(socket.name, data.id)) {
                var messages = await auths.getMessages(
                    data.id,
                    new Date().toDateString()
                );
                socket.emit("getMessages", {
                    status: "sucess",
                    id: data.id,
                    rows: messages.result,
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
                    // dont want to sanitize image path, etc.
                    data.content = utils.sanitize(data.content);
                }
                await auths.addMessage(data);
                var result = (await auths.getConversation(data.conversation))
                    .result[0];
                for (var i in result.members) {
                    if (
                        result.accepted[i] &&
                        auths.sockets[result.members[i]].length >= 1
                    ) {
                        for (var ii in auths.sockets[result.members[i]]) {
                            let otherSocket =
                                auths.sockets[result.members[i]][ii];
                            otherSocket.emit("message", data);
                        }
                    }
                }
            }
        });

        socket.on("contacts", async () => {
            let contacts = await auths.getContacts(socket.name);
            socket.emit("contacts", contacts);
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
                            if (!response.err) {
                                socket.emit("requestContacts", {
                                    status: "sucess",
                                });
                            } else {
                                socket.emit("requestContacts", {
                                    status: "error",
                                    error: "Database error",
                                });
                            }
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
            if (data.name && auths.hasContact(data.name, socket.name)) {
                let fullName = await auths.getFullName(data.name);
                if (fullName) {
                    socket.emit("fullnameOf", {
                        status: "sucess",
                        name: data.name,
                        fullname: fullName,
                    });
                } else {
                    socket.emit("fullnameOf", { status: "error" });
                }
            }
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
