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
        prof_img: {
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
    },
    { sequelize: db, modelName: "users", timestamps: false }
);
module.exports = Users;
