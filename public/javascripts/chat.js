var cssQuery = (query) => {
    return document.querySelector(query);
};
class Notify {
    constructor() {
        this.activeMessages = [];
        this.notifications = document.createElement("div");
        this.notifications.classList.add("notification-parrent");
        document.body.appendChild(this.notifications);
    }

    close(notification) {
        notification.classList.add("closing");
        this.activeMessages.slice(this.activeMessages.indexOf(notification), 1);
        setTimeout(() => {
            notification.remove();
        }, 200);
    }

    addNotification(title, message, timeout, type = "success") {
        let notification = document.createElement("div");
        notification.classList.add("notification");
        type == "success"
            ? notification.classList.add("success")
            : notification.classList.add("error");
        let head = document.createElement("div");
        head.classList.add("notification-head");
        let titleDiv = document.createElement("h3");
        let close = document.createElement("span");
        titleDiv.innerHTML = title;
        close.innerHTML = "X";
        head.appendChild(titleDiv);
        head.appendChild(close);
        let content = document.createElement("p");
        content.classList.add("notification-message");
        content.innerHTML = message;
        notification.appendChild(head);
        notification.appendChild(content);
        this.activeMessages.push(notification);
        this.notifications.appendChild(notification);

        close.addEventListener("click", () => {
            this.close(notification);
        });
        setTimeout(() => {
            this.close(notification);
        }, timeout);
        return notification;
    }
}

class Conversation {
    constructor(contact, me, hidden = false) {
        this.messages = [];
        this.contact = contact;
        this.me = me;
        this.chatContent = document.createElement("div");
        this.chatContent.classList.add("chat");
        cssQuery("#chat-name").innerHTML = this.contact.name;
        document
            .querySelector(".message-container")
            .appendChild(this.chatContent); // show the chat
        if (!hidden) {
            this.show();
        }
    }

    show() {
        var previousChat = cssQuery(".open-chat");
        if (previousChat) {
            previousChat.classList.remove("open-chat");
            previousChat.classList.add("closed-chat");
        }
        this.chatContent.classList.remove("closed-chat");
        this.chatContent.classList.add("open-chat");
    }

    async addMessage(msg) {
        var messageLine = document.createElement("div");
        var messageContent,
            messageContiner = document.createElement("div");
        switch (msg.type) {
            case "text": {
                messageContent = document.createElement("p");
                messageContent.innerHTML = msg.content;
                break;
            }
            default: {
                console.log(`${msg.type} not supported`);
                break;
            }
        }
        messageLine.appendChild(messageContiner);
        messageLine.classList.add("message-line");
        if (msg.sent_by == this.me.id) {
            messageLine.classList.add("me");
        } else {
            messageLine.classList.add("other");
        }
        messageContiner.classList.add("message");
        messageContiner.appendChild(messageContent);
        this.chatContent.chatContent;
        this.chatContent.appendChild(messageLine);
        this.chatContent.scrollTop = this.chatContent.scrollHeight;
    }
}

class ContactManager {
    constructor(me, socket) {
        this.me = me;
        this.contacts = {}; // object where every key is the contactId
        this.contactContainers = cssQuery(".contact-list");
        this.socket = socket;
        this.notificator = new Notify();
        this.initSocket();
    }

    async initSocket() {
        await new Promise((done) => {
            this.socket.on("contacts", (contacts) => {
                if (contacts.status == "succes") {
                    contacts.result.forEach((contact) => {
                        this.addContact(contact);
                        done();
                    });
                } else {
                    this.notificator.addNotification(
                        "Error!",
                        "Error getting contacts",
                        9e3,
                        "error"
                    );
                }
            });
            this.socket.emit("contacts");
        });
        this.socket.on("getMessages", (data) => {
            if (data.status == "succes") {
                if (!this.contacts[data.id].gotMessages) {
                    data.rows.forEach((message) => {
                        this.contacts[data.id].messages.addMessage(message);
                    });
                    this.contacts[data.id].gotMessages = true; // Don't get messages multiple times
                }
            }
        });

        this.socket.on("message", (message) => {
            let conversation = this.contacts[message.conversation];
            if (conversation.messages) {
                conversation.messages.addMessage(message);
            }
        });

        this.socket.on("acceptReject", (data) => {
            this.notificator.addNotification(
                "Accept - Reject",
                data.error ? data.error : "Success!",
                10e3,
                data.status
            );
        });

        this.socket.on("requestContacts", (data) => {
            this.notificator.addNotification(
                "Request contact",
                data.error ? data.error : "Success!",
                10e3,
                data.status
            );
        });
        this.socket.on("disconnect", () => {
            this.notificator.addNotification(
                "Socket error",
                "Socket disconnected!",
                10e3,
                "error"
            );
        });
    }

    // Function to fech full name of user from the server
    async getFullName(name) {
        return await new Promise((resolve) => {
            var socket = this.socket;
            this.socket.on("fullnameOf", function (data) {
                if (data.status == "succes" && data.name == name) {
                    resolve(data.fullname);
                }
                socket.off(this);
            });
            this.socket.emit("fullnameOf", { name: name });
        });
    }

    // Function to add contact to contact list
    async addContact(contact) {
        this.contacts[contact.id] = contact;
        var container = document.createElement("div");
        var info = document.createElement("div");
        var title = document.createElement("h3");
        var subTitle = document.createElement("h6");
        var profile = document.createElement("div");
        var profileImage = document.createElement("img");
        var other;
        if (contact.type == "chat") {
            other =
                contact.members[0] == this.me.name
                    ? contact.members[1]
                    : contact.members[0];
            var fname = await this.getFullName(other);
            title.innerHTML = fname;
            subTitle.innerHTML = other;
            this.contacts[contact.id].name = title.innerHTML;
        } else {
            title.innerHTML = contact.name;
        }
        profile.classList.add("contact-profile");
        container.appendChild(profile);
        info.appendChild(title);
        info.appendChild(subTitle);
        info.classList.add("contact-info");
        // Add accept/reject if unaccepted contact
        let meIdx = contact.members.indexOf(this.me.name);
        container.appendChild(info);
        if (!contact.accepted[meIdx]) {
            let acceptReject = document.createElement("div");
            acceptReject.classList.add("accept-reject");
            let accept = document.createElement("button");
            let reject = document.createElement("button");
            accept.innerHTML = "Accept";
            reject.innerHTML = "Reject";
            accept.classList.add("accept");
            reject.classList.add("reject");
            acceptReject.appendChild(accept);
            acceptReject.appendChild(reject);
            accept.addEventListener("click", () => {
                // Accept the contact
                this.socket.emit("acceptReject", {
                    id: contact.id,
                    action: "accept",
                });
                acceptReject.remove();
            });

            reject.addEventListener("click", (e) => {
                e.stopImmediatePropagation();
                // Reject contact
                this.socket.emit("acceptReject", {
                    id: contact.id,
                    action: "reject",
                });
                container.remove();
            });
            container.appendChild(acceptReject);
        }
        container.classList.add("contact");
        this.contactContainers.appendChild(container);
        container.addEventListener("click", () => {
            if (this.contacts[contact.id].messages) {
                this.contacts[contact.id].messages.show();
            } else {
                cssQuery("#send").disabled
                    ? ((cssQuery("#send").disabled = false),
                      (cssQuery("#input-message").disabled = false))
                    : NaN;
                this.contacts[contact.id].messages = new Conversation(
                    contact,
                    this.me,
                    false
                );
                this.socket.emit("getMessages", { id: contact.id }); // Load the messages
            }
            this.currentChatId = contact.id;
        });
    }

    async requestContact(name) {
        this.socket.emit("requestContacts", { type: "chat", other: name }); // TBD: allow groups
    }
}

async function Chat() {
    // Setup the socket
    let socket = io();
    let me = await new Promise((resolve) => {
        socket.on("auth", (res) => {
            if (res.status == "succes") {
                resolve(res.data);
            } else {
                socketReady = false;
                alert("Cookie verification failed!");
                document.cookie = "";
                document.location.href = "/";
            }
        });
        socket.emit("auth", document.cookie);
    });
    let contacts = new ContactManager(me, socket);
    let messageInput = cssQuery("#input-message");
    let addContactButton = cssQuery(".add-contact-button");
    let requestContactDiv = cssQuery(".add-contact");
    let requestContactButton = cssQuery("#add-contact-enter");
    let requestContactInput = cssQuery("#add-contact-input");
    let sendBtn = cssQuery("#send");
    let hideBackground = cssQuery(".hide-background");
    let currentDialog;
    sendBtn.addEventListener("click", () => {
        if (/\S/i.test(messageInput.value)) {
            let message = {
                conversation: contacts.currentChatId,
                content: messageInput.value,
                type: "text",
                sent_by: me.id,
            };
            socket.emit("message", message);
            messageInput.value = "";
        }
    });
    messageInput.addEventListener("keydown", (e) => {
        if (e.key == "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendBtn.click();
        }
    });

    addContactButton.addEventListener("click", () => {
        if (requestContactDiv.classList.contains("visible")) {
            requestContactDiv.classList.remove("visible");
        } else {
            requestContactDiv.classList.add("visible");
            requestContactInput.value = "";
            currentDialog = requestContactDiv;
            hideBackground.classList.add("visible");
            requestContactInput.click();
        }
    });

    hideBackground.addEventListener("click", () => {
        currentDialog.classList.remove("visible");
        hideBackground.classList.remove("visible");
    });

    requestContactButton.addEventListener("click", () => {
        // Request the user
        if (/\S/i.test(requestContactInput.value)) {
            contacts.requestContact(requestContactInput.value).then(() => {
                hideBackground.click();
            });
        }
        // Close
    });

    cssQuery("#logout").addEventListener("click", async () => {
        await fetch("/api/logout");
        document.location.reload();
    });

    cssQuery("#profile-name").addEventListener("click", () => {
        cssQuery(".edit-profile").classList.add("visible");
        cssQuery(".hide-background").classList.add("visible");
        currentDialog = cssQuery(".edit-profile");
    });
}
Chat();
