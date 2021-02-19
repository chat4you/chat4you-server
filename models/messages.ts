import { Sequelize } from "sequelize/types";
import { DataTypes } from "sequelize";

export default function (sequelize: Sequelize) {
    return sequelize.define("messages", {
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
    });
}
