import { DB } from "./";
import { DataTypes, Model, Op } from "sequelize";
import { Status } from "../types";
import Message, { MessageAttributes } from "./message";

interface ConversationAttributes {
    id?: number;
    type?: "chat" | "group";
    name: string;
    members: number[];
    accepted: boolean[];
}

class Conversation
    extends Model<ConversationAttributes>
    implements ConversationAttributes {
    public id!: number;
    public type?: ConversationAttributes["type"];
    public name!: string | null;
    public members!: number[];
    public accepted!: boolean[];

    public hasMember(userId: number): boolean {
        return this.members.includes(userId);
    }

    public removeMember(userId: number): Status<"nomember" | "notimplemented"> {
        if (this.hasMember(userId)) {
            if (this.type == "chat") {
                this.destroy();
                return { status: "succes" };
            } else {
                return { status: "error", message: "notimplemented" };
            }
        } else {
            return { status: "error", message: "nomember" };
        }
    }

    public async acceptMember(userId: number): Promise<Status<"nomember">> {
        if (this.hasMember(userId)) {
            let accepted = this.accepted;
            accepted[this.members.indexOf[userId]] = true;
            this.accepted = null;
            this.accepted = accepted;
            await this.save();
            return { status: "succes" };
        } else {
            return { status: "error", message: "nomember" };
        }
    }

    public static async userHasContact(user: number, other: number) {
        return !!(await this.findOne({
            where: {
                [Op.and]: [
                    { members: { [Op.contains]: [user, other] } },
                    { type: "chat" },
                ],
            },
        }));
    }

    public static async createConversation(
        conversation: ConversationAttributes
    ) {
        return await this.create({
            name: conversation.name,
            members: conversation.members,
            accepted: conversation.accepted,
            type: conversation.type,
        });
    }

    public async getMessages(): Promise<Message[]> {
        return await Message.findAll({
            where: { conversation: this.id },
            order: [["sent", "ASC"]],
        });
    }

    public async addMessage(message: MessageAttributes): Promise<void> {
        await Message.create({
            conversation: message.conversation,
            type: message.type,
            content: message.content,
            sent_by: message.sent_by,
        });
    }
}

Conversation.init(
    {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            allowNull: false,
            autoIncrement: true,
        },
        type: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        members: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: false,
        },
        accepted: {
            type: DataTypes.ARRAY(DataTypes.BOOLEAN),
            allowNull: false,
        },
    },
    {
        sequelize: DB,
        modelName: "conversations",
        timestamps: false,
    }
);

export default Conversation;
