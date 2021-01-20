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
};