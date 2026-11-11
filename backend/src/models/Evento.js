const { Model, DataTypes } = require("sequelize");
const sequelize = require("../database/db");

class Evento extends Model {}

Evento.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        evento: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        props: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: {},
            get() {
                const raw = this.getDataValue("props");
                if (!raw) return {};
                if (typeof raw === "string") {
                    try {
                        const parsed = JSON.parse(raw);
                        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
                    } catch {
                        return {};
                    }
                }
                return typeof raw === "object" && raw !== null && !Array.isArray(raw) ? raw : {};
            },
            set(val) {
                if (typeof val === "string") {
                    try {
                        const parsed = JSON.parse(val);
                        this.setDataValue("props", parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {});
                    } catch {
                        this.setDataValue("props", {});
                    }
                } else if (typeof val === "object" && val !== null && !Array.isArray(val)) {
                    this.setDataValue("props", val);
                } else {
                    this.setDataValue("props", {});
                }
            },
        },
        fecha: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: () => new Date().toISOString(),
        },
    },
    {
        sequelize,
        modelName: "Evento",
        tableName: "eventos",
        timestamps: false,
    },
);

module.exports = Evento;
