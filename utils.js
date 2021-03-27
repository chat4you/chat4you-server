const crypto = require("crypto");

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

function hash(text, salt) {
    var hash = crypto.createHmac("sha512", salt);
    return hash.update(text).digest("hex");
}

function randStr(size) {
    return crypto.randomBytes(size).toString("hex").slice(0, size);
}

module.exports = {
    cookieParser: cookieParser,
    sanitize: sanitize,
    hash: hash,
    randStr: randStr,
};
