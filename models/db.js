const { Sequelize } = require("sequelize");
const cfg = require("../config");

const sequelize = new Sequelize(cfg.db.database, cfg.db.user, cfg.db.password, {
    host: cfg.db.host,
    dialect: "postgres",
    logging: null,
});

module.exports = sequelize;
