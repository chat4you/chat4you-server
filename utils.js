function cookieParser(cookie) {
    var cookies = {};
    var splited = cookie.split(";");
    for (var i = 0; i < splited.length; i++) {
        var keinahnung = splited[i].split('=');
        cookies[keinahnung[0].trim()] = keinahnung[1];
    }
    return cookies;
}

module.exports.cookieParser = cookieParser;