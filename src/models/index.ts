import { Sequelize } from "sequelize";
import config from "../../config.json"; 
import Conversation from "./conversation";
import Message from "./message";
import User from "./user";

export const DB: Sequelize = new Sequelize({
    host: config.db.host,
    database: config.db.database,
    password: config.db.password,
    port: config.db.port,
    username: config.db.user,
    dialect: "postgres",
    logging: null,
})

export {
    Conversation,
    Message,
    User
}