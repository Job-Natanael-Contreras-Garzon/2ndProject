const { Model, DataTypes } = require("sequelize");
const sequelize = require("../database/db");

// Mensaje del hilo de negociación de una oferta (oferta, contraoferta, respuesta o aviso del sistema).
// Las claves foráneas (offerId, senderId) se definen en models/index.js
class OfferMessage extends Model {}

OfferMessage.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        kind: {
            type: DataTypes.TEXT,
            allowNull: false,
            validate: { isIn: [["oferta", "contraoferta", "respuesta", "sistema"]] },
        },
        text: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    },
    {
        sequelize,
        modelName: "OfferMessage",
        tableName: "offer_messages",
        timestamps: true,
        updatedAt: false,
    },
);

module.exports = OfferMessage;
