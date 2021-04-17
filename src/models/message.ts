import { DB } from "./";
import { DataTypes, Model, Sequelize } from "sequelize";

export interface MessageAttributes {
    conversation: number;
    type: "text" | "image" | "video" | "audio";
    sent?: Date;
    content: string;
    sent_by: number;
}

class Message extends Model<MessageAttributes> implements MessageAttributes {
    public conversation!: number;
    public type!: MessageAttributes["type"];
    public sent!: Date;
    public content!: string;
    public sent_by!: number;
}

Message.init(
    {
        conversation: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            allowNull: false,
        },
        type: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        sent: {
            type: DataTypes.DATE,
            defaultValue: Sequelize.fn('NOW')
        },
        content: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        sent_by: {
            type: DataTypes.NUMBER,
            allowNull: false,
        },
    },
    {
        sequelize: DB,
        modelName: "conversations",
        timestamps: false,
    }
);

export default Message;
