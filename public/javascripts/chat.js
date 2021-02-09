class Conversation {
    constructor(contact, socket, me, hidden = false) {
        this.messages = [];
        this.socket = socket;
        this.contact = contact;
        this.me = me;
        this.chatContent = document.createElement("div");
        this.chatContent.classList.add("chat");
        var previousChat = document.querySelector(".open-chat");
        if (previousChat && !hidden) {
            previousChat.classList.remove("open-chat");
            previousChat.classList.add("closed-chat");
            this.chatContent.classList.add("open-chat");
        }
        document.querySelector("#chat-name").innerHTML = this.contact.name;
        document
            .querySelector(".message-container")
            .appendChild(this.chatContent); // show the chat
        this.loadMessages();
    }

    show() {
        var previousChat = document.querySelector(".open-chat");
        previousChat.classList.remove("open-chat");
        previousChat.classList.add("closed-chat");
        this.chatContent.classList.remove("closed-chat");
        this.chatContent.classList.add("open-chat");
    }

    async loadMessages() {
        var messages = await new Promise((done) => {
            this.socket.on("getMessages", (data) => {
                if (data.status == "sucess" && data.id == this.contact.id) {
                    done(data.rows);
                } else {
                    alert("Error getting messages");
                }
            });
            this.socket.emit("getMessages", { id: this.contact.id });
        });

        messages.forEach((message) => {
            this.addMessage(message);
        });
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
        this.chatContent.scrollTop = messageDiv.scrollHeight;
    }
}

class ContactManager {
    constructor(me, socket) {
        this.me = me;
        this.contacts = {}; // object where every key is the contactId
        this.contactContainers = document.querySelector(".contact-list");
        this.socket = socket;
    }

    // Function to fech full name of user from the server
    async getFullName(name) {
        var response = await await fetch("/api/fullname-by-name", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ name: name }),
        }).then((data) => data.json());
        if (response.status != "error") {
            return response[0].fullname;
        } else {
            console.error(response.error);
        }
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
        container.appendChild(info);
        container.classList.add("contact");
        this.contactContainers.appendChild(container);
        container.addEventListener("click", () => {
            if (this.contacts[contact.id].messageDiv) {
                this.contacts[contact.id].messageDiv.show();
            } else {
                this.contacts[contact.id].messageDiv = new Conversation(
                    contact,
                    this.socket,
                    this.me,
                    false
                );
            }
            this.currentChatId = contact.id;
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
    fetch("/api/contact")
        .then((data) => data.json())
        .then((dt) => {
            for (var contact in dt) {
                contacts.addContact(dt[contact]);
            }
        });
    socket.on("message", (message) => {
        contacts.contacts[message.conversation].messageDiv.addMessage(message);
    });

    let messageInput = document.querySelector("#input-message");
    let addContactButton = document.querySelector(".add-contact-button");
    let requestContactDiv = document.querySelector(".add-contact");
    let sendBtn = document.querySelector("#send");
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
}
Chat();
