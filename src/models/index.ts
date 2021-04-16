import { Sequelize } from "sequelize";
import config from "../../config.json";

export default new Sequelize({
    host: config.db.host,
    database: config.db.database,
    password: config.db.password,
    port: config.db.port,
    username: config.db.user,
    dialect: "postgres",
    logging: null,
});
