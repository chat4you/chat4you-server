document.querySelectorAll(".user-container").forEach(function (el) {
    let userId = parseInt(el.getAttribute("data-user-id"));
    let fullname = el.querySelector(".fullname-input");
    let name = el.querySelector(".name-input");
    let email = el.querySelector(".email-input");
    let verified = el.querySelector(".verified-select");
    let password = el.querySelector(".new-password-input");
    el.querySelector(".save-user").addEventListener("click", async () => {
        let data = {
            fullname: fullname.value,
            name: name.value,
            email: email.value,
            verified: !!verified.value,
            password: password.value,
        };
        let res = await await fetch(`/api/update-admin/${userId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        }).then((data) => data.json());
        password.value = "";
    });
    el.querySelector(".delete-user").addEventListener("click", () => {
        let deleteUser = confirm(`Really want to delete ${name.value}?`);
        if (deleteUser) {
            el.remove();
        } else {
            alert("aborted");
        }
        // delete the user
    });
});
