var socketReady, socket;
var contacts = {};
async function openChat(id, name) {
    var contact = contacts[id];
    document.querySelector("#chat-name").innerHTML = name;
    if (!contact.open) {
        var previousChat = document.querySelector(".open-chat");
        if (previousChat) {
            previousChat.classList.remove("open-chat");
            previousChat.classList.add("closed-chat");
        }
        var chatContent;
        if (!contact.opendBefore) {
            chatContent = document.createElement("div");
            document.querySelector(".messages-parent").appendChild(chatContent);
        } else {
            chatContent = contact.msgDiv;
        }
        chatContent.classList.add("open-chat");
    }
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
    title.contactId = contactInfo.id;
    var other;
    if (contactInfo.type == "chat") {
        other =
            contactInfo.members[0] == me
                ? contactInfo.members[1]
                : contactInfo.members[0];
        title.innerHTML = await getFullName(other);
        subTitle.innerHTML = other;
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
        openChat(contactInfo.id, title.innerHTML);
    });
}

window.onload = () => {
    fetch("/api/contact")
        .then((data) => data.json())
        .then((dt) => {
            for (var contact in dt) {
                addContact(dt[contact]);
                contacts[dt[contact].id] = dt[contact];
            }
        });
    socket = io();
    socket.on("auth", (res) => {
        if (res.status == "sucess") {
            socketReady = true;
        } else {
            socketReady = false;
            alert("Cookie verification failed");
        }
    });
    socket.emit("auth", document.cookie);
};
