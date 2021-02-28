class Notify {
    constructor() {
        this.activeMessages = [];
        this.notifications = document.createElement("div");
        this.notifications.classList.add("notification-parrent");
        document.body.appendChild(this.notifications);
    }

    close(notification) {
        notification.classList.add("closing");
        this.activeMessages.slice(this.activeMessages.indexOf(notification), 1);
        setTimeout(() => {
            notification.remove();
        }, 200);
    }

    addNotification(title, message, timeout, type = "success") {
        let notification = document.createElement("div");
        notification.classList.add("notification");
        type == "success"
            ? notification.classList.add("success")
            : notification.classList.add("error");
        let head = document.createElement("div");
        head.classList.add("notification-head");
        let titleDiv = document.createElement("h3");
        let close = document.createElement("span");
        titleDiv.innerHTML = title;
        close.innerHTML = "X";
        head.appendChild(titleDiv);
        head.appendChild(close);
        let content = document.createElement("p");
        content.classList.add("notification-message");
        content.innerHTML = message;
        notification.appendChild(head);
        notification.appendChild(content);
        this.activeMessages.push(notification);
        this.notifications.appendChild(notification);

        close.addEventListener("click", () => {
            this.close(notification);
        });
        setTimeout(() => {
            this.close(notification);
        }, timeout);
        return notification;
    }
}
