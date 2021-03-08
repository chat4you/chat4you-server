const DataTypes = require("sequelize").DataTypes;
const db = require("./db");
const { Model } = require("sequelize");

class Conversations extends Model {}
Conversations.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
        },
        type: {
            type: DataTypes.TEXT,
        },
        name: {
            type: DataTypes.TEXT,
        },
        members: {
            type: DataTypes.ARRAY(DataTypes.INTEGER),
        },
        accepted: {
            type: DataTypes.ARRAY(DataTypes.BOOLEAN),
        },
    },
    {
        sequelize: db,
        modelName: "conversations",
        timestamps: false,
    }
);
module.exports = Conversations;
