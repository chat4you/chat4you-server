function cookieParser(cookie) {
    var cookies = {};
    var splited = cookie.split(";");
    for (var i = 0; i < splited.length; i++) {
        var keinahnung = splited[i].split("=");
        cookies[keinahnung[0].trim()] = keinahnung[1];
    }
    return cookies;
}

function sanitize(text) {
    return String(text)
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

module.exports.cookieParser = cookieParser;
module.exports.sanitize = sanitize;
