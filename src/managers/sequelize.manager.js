const Sequelize = require("sequelize");
const config = require("../config/index");

const sequelize = new Sequelize(
  config.MYSQL_DB_NAME,
  config.MYSQL_USERNAME,
  config.MYSQL_PASSWORD,
  {
    host: config.MYSQL_HOST,
    port: config.MYSQL_PORT,
    dialect: "mysql",
    logging: false,
    dialectOptions: {
      charset: "utf8mb4",
    },
    define: {
      underscored: false,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      paranoid: true,
    },
  }
);

module.exports = {
  sequelize,
  Sequelize,
};
