const { Model, DataTypes } = require("sequelize");
const sequelize = require("../database/db");

// Oferta que un usuario envía por la publicación de otro.
// Las claves foráneas (targetPostId, offeredPostId, proposerId) se definen en models/index.js
class Offer extends Model {}

Offer.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        message: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        status: {
            type: DataTypes.TEXT,
            allowNull: false,
            defaultValue: "pendiente",
            validate: { isIn: [["pendiente", "aceptada", "rechazada"]] },
        },
    },
    {
        sequelize,
        modelName: "Offer",
        tableName: "offers",
        timestamps: true,
    },
);

module.exports = Offer;
