import db from "./";
import { DataTypes, Model } from "sequelize";

interface ConversationAttributes {
    id: number;
    type?: 'chat' | 'group';
    name: string;
    members: number[];
    accepted: boolean[];
}

class Conversation extends Model<ConversationAttributes> implements ConversationAttributes {
    public id!: number;
    public type!: 'chat' | 'group';
    public name!: string | null;
    public members!: number[];
    public accepted!: boolean[];
}

Conversation.init({
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true
    }, 
    type: {
        type: DataTypes.STRING,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    members: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false
    },
    accepted: {
        type: DataTypes.ARRAY(DataTypes.BOOLEAN),
        allowNull: false
    }
}, {
    sequelize: db,
    modelName: 'conversations',
    timestamps: false
})

export default Conversation