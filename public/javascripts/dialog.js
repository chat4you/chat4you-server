class Dialog {
    constructor(dialogQuery) {
        this.parrent = document.querySelector(".dialogs");
        this.dialog = document.querySelector(dialogQuery);
        this.visible = false;
        if (!this.parrent.hasChildNodes(this.dialog)) {
            throw new Error(`Dialog ${dialogQuery} is not a child of .dialogs`);
        }
        this.parrent.addEventListener("click", (e) => {
            if (e.target == this.parrent) {
                this.hide();
            }
        });
    }

    show() {
        this.parrent.querySelector(".active")?.classList.remove("active");
        if (!this.parrent.classList.contains("active")) {
            this.parrent.classList.add("active");
        }
        this.dialog.classList.add("active");
        this.visible = true;
    }

    hide() {
        this.dialog.classList.remove("active");
        this.parrent.classList.remove("active");
        this.visible = false;
    }

    toogle() {
        this.visible ? this.hide() : this.show();
    }
}
