import { Sequelize } from "sequelize/types";
import { DataTypes } from "sequelize";

export default function (sequelize: Sequelize) {
    return sequelize.define("users", {
        id: {
            type: DataTypes.INTEGER,
        },
        name: {
            type: DataTypes.TEXT,
        },
        fullname: {
            type: DataTypes.TEXT,
        },
        password_hash: {
            type: DataTypes.TEXT,
        },
        created: {
            type: DataTypes.DATE,
        },
        email: {
            type: DataTypes.TEXT,
        },
        verified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        profile_image: {
            type: DataTypes.TEXT,
        },
        status: {
            type: DataTypes.TEXT,
            defaultValue: "offline",
        },
        type: {
            type: DataTypes.TEXT,
            defaultValue: "user",
        },
    });
}
