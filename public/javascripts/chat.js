async function getFullName(name) {
    var response = await await fetch("/api/fullname-by-name?", {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: name }),
    }).then(data => data.json());
    if (response.status != 'error') {
        console.log(response)
        return response[0].fullname;
    } else {
        console.error(response.error)
    }
}

async function addContact(contactInfo) {
    var container = document.createElement("div");
    var title = document.createElement("h3");
    title.contactId = contactInfo.id;
    if (contactInfo.type == "chat") {
        let other =
            contactInfo.members[0] == me
                ? contactInfo.members[1]
                : contactInfo.members[0];
        title.innerHTML = await getFullName(other);
    } else {
        title.innerHTML = contactInfo.name;
    }
    container.appendChild(title);
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
            console.log(dt);
        });
    var socket = io();
};
