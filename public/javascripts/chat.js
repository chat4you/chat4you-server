var socketReady;
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
    if (contactInfo.type == "chat") {
        let other =
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
}

window.onload = () => {
    fetch("/api/contact")
        .then((data) => data.json())
        .then((dt) => {
            for (var contact in dt) {
                addContact(dt[contact]);
            }
        });
    var socket = io();
    socket.on("auth", (res) => {
        if (res.status == 'sucess') {
            socketReady = true;
        } else {
            socketReady = false;
            alert('Cookie verification failed')
        }
    });
    socket.emit("auth", document.cookie);
};
