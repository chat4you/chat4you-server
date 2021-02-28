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
        if (window.matchMedia("only screen and (max-width: 720px)").matches) {
            document.querySelector(".messages").classList.add("show");
        }
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
