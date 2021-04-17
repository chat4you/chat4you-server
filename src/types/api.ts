import { ReadStream } from "node:fs";

export namespace httpBody {
    export interface login {
        username: string;
        password: string;
    }

    export interface profileUpdate {
        fullname: string;
        email: string;
        profileImage: ReadStream
    }

    export interface adminUpdate {
        fullname: string;
        password?: string;
        email: string;
        verified: boolean;
    }
}

export namespace fixedHttpBody {
    export interface adminUpdate extends httpBody.adminUpdate {
        password_hash: string;
    }
}