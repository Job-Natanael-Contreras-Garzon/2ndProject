const { Sequelize } = require("sequelize");
const path = require("path");

// En la nube se define DATABASE_URL (Postgres, por ejemplo Neon).
// Sin esa variable se usa SQLite en un archivo local, como hasta ahora.
const databaseUrl = process.env.DATABASE_URL;
// Neon y otros servicios en la nube exigen conexión cifrada. Solo para un Postgres local sin SSL: DATABASE_SSL=false
const usarSsl = process.env.DATABASE_SSL !== "false";

const sequelize = databaseUrl
    ? new Sequelize(databaseUrl, {
          dialect: "postgres",
          logging: false,
          dialectOptions: usarSsl ? { ssl: { require: true, rejectUnauthorized: false } } : {},
      })
    : new Sequelize({
          dialect: "sqlite",
          storage: path.join(__dirname, "../../database.sqlite"),
          logging: false,
      });

module.exports = sequelize;
