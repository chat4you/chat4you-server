var contacts,
    socketReady,
    socket,
    loadMessages,
    me,
    currentChatId,
    messageInput,
    sendBtn;
contacts = {};
async function openChat(id, hidden = false) {
    var contact = contacts[id];
    document.querySelector("#chat-name").innerHTML = contact.name;
    if (!contact.open) {
        var previousChat = document.querySelector(".open-chat");
        if (previousChat && !hidden) {
            previousChat.classList.remove("open-chat");
            previousChat.classList.add("closed-chat");
        }
        var chatContent;
        if (!contact.opendBefore) {
            chatContent = document.createElement("div");
            chatContent.classList.add("chat");
            document
                .querySelector(".message-container")
                .appendChild(chatContent);
            contact.opendBefore = true;
            contact.msgDiv = chatContent;
            loadMessages(contact.id);
        } else {
            chatContent = contact.msgDiv;
            chatContent.classList.remove("closed-chat");
        }
        if (!hidden) {
            currentChatId = id;
            chatContent.classList.add("open-chat");
        }
    }
    return;
}

async function getFullName(name) {
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

async function addContact(contactInfo) {
    var container = document.createElement("div");
    var info = document.createElement("div");
    var title = document.createElement("h3");
    var subTitle = document.createElement("h6");
    var profile = document.createElement("div");
    var profileImage = document.createElement("img");
    var other;
    if (contactInfo.type == "chat") {
        other =
            contactInfo.members[0] == me.name
                ? contactInfo.members[1]
                : contactInfo.members[0];
        title.innerHTML = await getFullName(other);
        subTitle.innerHTML = other;
        contacts[contactInfo.id].name = title.innerHTML;
    } else {
        title.innerHTML = contactInfo.name;
    }
    profile.classList.add("contact-profile");
    container.appendChild(profile);
    info.appendChild(title);
    info.appendChild(subTitle);
    info.classList.add("contact-info");
    container.appendChild(info);
    container.classList.add("contact");
    document.querySelector(".contact-list").appendChild(container);
    container.addEventListener("click", () => {
        openChat(contactInfo.id);
    });
}

async function addMessage(msg) {
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
    messageLine.classList.add("message-line");
    msg.sent_by == me.id
        ? messageLine.classList.add("me")
        : messageLine.classList.add("other");
    messageContiner.classList.add("message");
    messageContiner.appendChild(messageContent);
    messageLine.appendChild(messageContiner);
    if (!contacts[msg.conversation].msgDiv) {
        await openChat(msg.conversation, (hidden = true));
    }
    let messageDiv = contacts[msg.conversation].msgDiv;
    messageDiv.appendChild(messageLine);
    messageDiv.scrollTop = messageDiv.scrollHeight;
}
// Setup the socket
socket = io();
socket.on("auth", (res) => {
    if (res.status == "sucess") {
        socketReady = true;
        me = res.data;
        fetch("/api/contact")
            .then((data) => data.json())
            .then((dt) => {
                for (var contact in dt) {
                    addContact(dt[contact]);
                    contacts[dt[contact].id] = dt[contact];
                }
            });
    } else {
        socketReady = false;
        alert("Cookie verification failed!");
        document.cookie = "";
        document.location.href = "/";
    }
});
socket.on("message", (message) => {
    addMessage(message);
});
socket.emit("auth", document.cookie);
loadMessages = async (id) => {
    var messages = await new Promise((done) => {
        socket.on("getMessages", (data) => {
            if (data.status == "sucess") {
                done(data.rows);
            } else {
                alert("Error getting messages");
            }
        });
        socket.emit("getMessages", { id: id });
    });
    messages.forEach((msg, idx) => {
        addMessage(msg, id);
    });
};

messageInput = document.querySelector("#input-message");
sendBtn = document.querySelector("#send");
sendBtn.addEventListener("click", () => {
    let message = {
        conversation: currentChatId,
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
