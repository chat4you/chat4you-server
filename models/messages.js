const DataTypes = require("sequelize").DataTypes;
const db = require("./db");
const { Model } = require("sequelize");

class Messages extends Model {}
Messages.init(
    {
        conversation: {
            type: DataTypes.INTEGER,
        },
        type: {
            type: DataTypes.TEXT,
        },
        sent: {
            type: DataTypes.TEXT,
        },
        content: {
            type: DataTypes.TEXT,
        },
        sent_by: {
            type: DataTypes.INTEGER,
        },
    },
    {
        sequelize: db,
        modelName: "messages",
        timestamps: false,
    }
);
module.exports = Messages;
