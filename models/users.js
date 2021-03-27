const DataTypes = require("sequelize").DataTypes;
const db = require("./db");
const { Model } = require("sequelize");

class Users extends Model {}

Users.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
        },
        name: {
            type: DataTypes.TEXT,
        },
        fullname: {
            type: DataTypes.TEXT,
        },
        password_hash: {
            type: DataTypes.TEXT,
            get() {
                return "HIDDEN";
            },
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
        status: {
            type: DataTypes.TEXT,
            defaultValue: "offline",
        },
        type: {
            type: DataTypes.TEXT,
            defaultValue: "user",
        },
    },
    { sequelize: db, modelName: "users", timestamps: false }
);
module.exports = Users;
