class Conversation {
    constructor(contact, me, hidden = false) {
        this.messages = [];
        this.contact = contact;
        this.me = me;
        this.chatContent = document.createElement("div");
        this.chatContent.classList.add("chat");
        document.querySelector("#chat-name").innerHTML = this.contact.name;
        document
            .querySelector(".message-container")
            .appendChild(this.chatContent); // show the chat
        if (!hidden) {
            this.show();
        }
    }

    show() {
        var previousChat = document.querySelector(".open-chat");
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
        this.contactContainers = document.querySelector(".contact-list");
        this.socket = socket;
        this.initSocket();
    }

    async initSocket() {
        await new Promise((done) => {
            this.socket.on("contacts", (contacts) => {
                if (contacts.status == "sucess") {
                    contacts.result.forEach((contact) => {
                        this.addContact(contact);
                        done();
                    });
                } else {
                    console.error("Error getting contacts");
                }
            });
            this.socket.emit("contacts");
        });
        this.socket.on("getMessages", (data) => {
            if (data.status == "sucess") {
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
    }

    // Function to fech full name of user from the server
    async getFullName(name) {
        return await new Promise((resolve) => {
            this.socket.on("fullnameOf", function (data) {
                if (data.status == "sucess" && data.name == name) {
                    resolve(data.fullname);
                } else {
                    resolve();
                }
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
            title.innerHTML = await this.getFullName(other);
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
                acceptReject.remove();
            });

            reject.addEventListener("click", () => {
                // Reject contact
                container.remove();
            });
        }
        container.appendChild(info);
        container.classList.add("contact");
        this.contactContainers.appendChild(container);
        container.addEventListener("click", () => {
            if (this.contacts[contact.id].messages) {
                this.contacts[contact.id].messages.show();
            } else {
                document.querySelector("#send").disabled
                    ? ((document.querySelector("#send").disabled = false),
                      (document.querySelector(
                          "#input-message"
                      ).disabled = false))
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
        return await new Promise((resolve) => {
            this.socket.on("requestContacts", (data) => {
                resolve(data);
            });
            this.socket.emit("requestContacts", { type: "chat", other: name }); // TBD: allow groups
        });
    }
}

async function Chat() {
    // Setup the socket
    let socket = io();
    let me = await new Promise((resolve) => {
        socket.on("auth", (res) => {
            if (res.status == "sucess") {
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

    let messageInput = document.querySelector("#input-message");
    let addContactButton = document.querySelector(".add-contact-button");
    let requestContactDiv = document.querySelector(".add-contact");
    let requestContactButton = document.querySelector("#add-contact-enter");
    let requestContactInput = document.querySelector("#add-contact-input");
    let sendBtn = document.querySelector("#send");
    let hideBackground = document.querySelector(".hide-background");
    sendBtn.addEventListener("click", () => {
        let message = {
            conversation: contacts.currentChatId,
            content: messageInput.value,
            type: "text",
            sent_by: me.id,
        };
        messageInput.value = "";
        socket.emit("message", message);
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
        }
    });

    hideBackground.addEventListener("click", () => {
        addContactButton.click();
    });
    requestContactButton.addEventListener("click", () => {
        // Request the user
        if (/\S/i.test(requestContactInput.value)) {
            contacts.requestContact(requestContactInput.value).then((data) => {
                if (data.status == "error") {
                    console.error(data.error);
                }
            });
            requestContactInput.value = "";
        }
        // Close
        addContactButton.click();
    });
}
Chat();
