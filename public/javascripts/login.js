const username = document.querySelector('#username');
const password = document.querySelector('#password');
const submit = document.querySelector('.submit');

submit.onclick = (e) => {
    var usrOk, passOk;
    if (/\S/i.test(password.value)) {
        passOk = true;
        if (password.classList.contains('invalid')) password.classList.remove('invalid');
    } else {
        passOk = false;
        password.classList.add('invalid')
    } if (/\S/i.test(username.value)) {
        usrOk = true;
        if (username.classList.contains('invalid')) username.classList.remove('invalid');
    } else {
        usrOk = false;
        username.classList.add('invalid')
    }
    if (usrOk && passOk) {
        var authContent = {
            password: password.value,
            username: username.value
        }
        var server = new XMLHttpRequest();
        server.onreadystatechange = () => {
            if (server.readyState == 4 && server.status == 200) {
                var decoded = JSON.parse(server.responseText);
                if (decoded.login == true) {
                    document.location.href = '/';
                } else {
                    password.classList.add('invalid');
                    username.classList.add('invalid');
                }
            }
        };
        server.open('POST', '/login', true);
        server.setRequestHeader("Content-Type", "application/json");
        server.send(JSON.stringify(authContent));
    }
};

password.addEventListener('keydown', (e) => {
    if (e.key == 'Enter') {
        submit.click()
    }
})