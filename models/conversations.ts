import { Sequelize } from "sequelize/types";
import { DataTypes } from "sequelize";

export default function (sequelize: Sequelize) {
    return sequelize.define("conversations", {
        id: {
            type: DataTypes.INTEGER,
        },
        type: {
            type: DataTypes.TEXT,
        },
        name: {
            type: DataTypes.TEXT,
        },
        members: {
            type: DataTypes.ARRAY(DataTypes.TEXT),
        },
        accepted: {
            type: DataTypes.ARRAY(DataTypes.BOOLEAN),
        },
    });
}
