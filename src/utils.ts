import crypto from "crypto";

export function cookieParser(cookie: string) {
    const cookies = {};
    const splited = cookie.split(";");
    for (let i = 0; i < splited.length; i++) {
        const keinahnung = splited[i].split("=");
        cookies[keinahnung[0].trim()] = keinahnung[1];
    }
    return cookies;
}

export function sanitize(text: string) {
    return String(text)
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

export function hash(text: string, salt: string) {
    const hash = crypto.createHmac("sha512", salt);
    return hash.update(text).digest("hex");
}

export function randStr(size: number) {
    return crypto.randomBytes(size).toString("hex").slice(0, size);
}
