function addContact(contactInfo) {
    var container = document.createElement("div");
    var title = document.createElement("h3");
    title.contactId = contactInfo.id;
    if (contactInfo.type == 'chat') {
        // TBD
    }
}

window.onload = () => {
    fetch("/api/contact").then((data) => {
        console.log(data.json());
    });
};
