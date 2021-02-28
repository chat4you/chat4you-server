class ContactManager {
    constructor() {
        this.contacts = {}; // object where every key is the contactId
        this.contactContainers = document.querySelector(".contact-list");
        this.notificator = new Notify();
        this.gotContacts = false;
        this.socket = io();
        this.initSocket();
    }

    async initSocket() {
        this.socket.on("auth", (res) => {
            if (res.status == "succes") {
                this.me = res.data;
                fetch(`/api/me/contacts`)
                    .then((data) => data.json())
                    .then((data) => {
                        if (!this.gotContacts) {
                            data.forEach((contact) => {
                                this.addContact(contact);
                            });
                            this.gotContacts = true;
                        }
                    });
                document
                    .querySelector("#connection-status")
                    .classList.add("online");
            } else {
                alert("Cookie verification failed!");
                document.cookie = "";
                document.location.href = "/";
            }
        });
        this.socket.io.on("reconnect", () => {
            this.socket = io();
            this.initSocket();
            document
                .querySelector("#connection-status")
                .classList.add("online");
        });

        this.socket.on("getMessages", (data) => {
            if (data.status == "succes") {
                if (!this.contacts[data.id].gotMessages) {
                    data.result.forEach((message) => {
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
            if (
                document
                    .querySelector("#connection-status")
                    .classList.contains("online")
            ) {
                document
                    .querySelector("#connection-status")
                    .classList.remove("online");
            }
        });
        this.socket.emit("auth", document.cookie);
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
            profile.style.backgroundImage = `url('/api/profile-image/name/${other}')`;
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
        this.socket.emit("requestContacts", { type: "chat", other: name }); // TBD: allow groups
    }
}
