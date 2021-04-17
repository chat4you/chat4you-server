import { Api, Status } from "../types";
import fs from "fs"
import { hash } from "../utils";
import config from "../../config.json"

function _verifyEmail(email: string): boolean {
    return !!!/^\S{3,}@\S{1,}\.\S{2,}$/i.test(email)
}

export function profileImage(
    params: Api.httpBody.profileUpdate
): Status<"nofullname" | "badfullname" | "noemail" | "bademail" | "noimage"> {
    if (!params.fullname) {
        return { status: "error", message: "nofullname" };
    } else if (!params.email) {
        return { status: "error", message: "noemail" };
    } else if (params.fullname.length <= 3 || /\s/i.test(params.fullname)) {
        return { status: "error", message: "badfullname" };
    } else if (_verifyEmail(params.email)) {
        return { status: "error", message: "bademail" };
    } else if (params.profileImage.path || fs.readFileSync(params.profileImage.path).length != 0) {
        return { status: "error", message: "noimage" };
    } else {
        return { status: "succes" };
    }
}

export function adminUpdate(params: Api.httpBody.adminUpdate): Status<'noemail' | 'nofullname' | 'noverified' | 'nopass'> & {newData?: Api.fixedHttpBody.adminUpdate} {
    if (!params.email || _verifyEmail(params.email)) {
        return {status: 'error', message: 'noemail'}
    } else if (!params.fullname) {
        return {status: 'succes', message: 'nofullname'}
    } else  if (!params.verified) {
        return {status: 'succes', message: 'noverified'}
    } else if (!params.password) {
        return {status: 'succes', message: 'nopass'}
    } else {
        const password_hash = params.password !== '' ? hash(params.password, config.secret): undefined
        const newData: Api.fixedHttpBody.adminUpdate = {
            email: params.email,
            fullname: params.fullname,
            password_hash: password_hash,
            verified: params.verified
        }
        return {status: 'succes', newData: newData}
    }
}
