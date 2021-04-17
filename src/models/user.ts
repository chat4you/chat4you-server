import { DB } from "./";
import { DataTypes, Model } from "sequelize";
import * as utils from "../utils";
import config from "../../config.json";
import { Socket } from "socket.io";
import { Status } from "../types";

const SESSION_COOKIE_LENGTH = 100;

interface UserAttributes {
    id: number;
    name: string;
    fullname: string;
    password_hash: string;
    created: Date;
    email: string;
    verified: boolean;
    status: string;
    type: "user" | "admin";
}

class User extends Model<UserAttributes> implements UserAttributes {
    public static sockets: Record<string, Socket[]> = {};
    private static loginsBySession: Record<string, User> = {};
    private static sessionsById: Record<number, string[]> = {};
    public id!: number;
    public name!: string;
    public fullname!: string;
    public password_hash!: string;
    public created!: Date;
    public email!: string;
    public verified!: boolean;
    public status!: string;
    public type!: "user" | "admin";
    public static async login(
        name: string,
        password: string
    ): Promise<
        Status<"unverified" | "notfound"> & {
            userData?: User;
            sessionString?: string;
        }
    > {
        const hashedPass = utils.hash(password, config.secret);
        const user = await User.findOne({
            where: {
                name: name,
                password_hash: hashedPass,
            },
        });
        if (user) {
            const sessionString = utils.randomString(SESSION_COOKIE_LENGTH);
            User.loginsBySession[sessionString] = user;
            !User.sessionsById[user.id] && (User.sessionsById[name] = []);
            User.sessionsById[user.id].push(sessionString);
            !User.sockets[user.id] && (User.sockets[user.id] = []);
            if (!user.verified) {
                return {
                    status: "succes",
                    message: "unverified",
                };
            } else {
                return {
                    status: "succes",
                    userData: user,
                    sessionString: sessionString,
                };
            }
        } else {
            return {
                status: "error",
                message: "notfound",
            };
        }
    }
    public logout(sessionString: string): Status<'nosession'> {
        if (User.sessionsById[this.id].indexOf(sessionString) != -1) {
            delete User.loginsBySession[sessionString];
            User.sessionsById[this.id].splice(
                User.sessionsById[this.id].indexOf(sessionString),
                1
            );
            return { status: "succes" };
        } else {
            return {status: 'succes', message: 'nosession'}
        }
    }
}

User.init(
    {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            allowNull: false,
            autoIncrement: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        fullname: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        password_hash: {
            type: DataTypes.STRING,
            allowNull: false,
            get: () => {
                return undefined;
            },
        },
        created: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        verified: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        status: {
            type: DataTypes.STRING,
            defaultValue: "offline",
        },
        type: {
            type: DataTypes.STRING,
            defaultValue: "user",
            allowNull: false,
        },
    },
    {
        sequelize: DB,
        modelName: "users",
        timestamps: false,
    }
);

export default User;
