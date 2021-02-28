async function Chat() {
    let contacts = new ContactManager();
    let messageInput = document.querySelector("#input-message");
    let addContactButton = document.querySelector(".add-contact-button");
    let editProfileDialog = new Dialog(".edit-profile");
    let requestContactDialog = new Dialog(".add-contact");
    requestContactDialog.button = document.querySelector("#add-contact-enter");
    requestContactDialog.input = document.querySelector("#add-contact-input");
    let sendBtn = document.querySelector("#send");
    let hideBackground = document.querySelector(".hide-background");
    sendBtn.addEventListener("click", () => {
        if (/\S/i.test(messageInput.value)) {
            let message = {
                conversation: contacts.currentChatId,
                content: messageInput.value,
                type: "text",
                sent_by: contacts.me.id,
            };
            contacts.socket.emit("message", message);
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
        requestContactDialog.toogle();
        requestContactDialog.input.value = "";
        requestContactDialog.input.focus();
    });

    requestContactDialog.button.addEventListener("click", () => {
        // Request the user
        if (/\S/i.test(requestContactDialog.input.value)) {
            contacts
                .requestContact(requestContactDialog.input.value)
                .then(() => {
                    requestContactDialog.hide();
                });
        }
        // Close
    });

    document.querySelector("#logout").addEventListener("click", async () => {
        await fetch("/api/logout");
        document.location.reload();
    });

    document.querySelector("#profile-name").addEventListener("click", () => {
        editProfileDialog.show();
    });
    document.querySelector("#back2menu").addEventListener("click", () => {
        document.querySelector(".messages").classList.remove("show");
    });
}

function validateProfile() {
    let form = document.forms.editProfile;
    console.log("validating form");
    if (form.fullname.value.length <= 3 || /\s/i.test(form.fullname.value)) {
        console.log(false);
        return false;
    } else if (!/^\S{3,}@\S{1,}\.\S{2,}$/i.test(form.email.value)) {
        console.log(false);

        return false;
    }
    return true;
}

Chat();
