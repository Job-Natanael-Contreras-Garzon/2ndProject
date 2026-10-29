const { Model, DataTypes } = require("sequelize");
const sequelize = require("../database/db");

class Activity extends Model {}

Activity.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        type: {
            type: DataTypes.TEXT,
            allowNull: false,
            validate: {
                isIn: [
                    [
                        "reservado",
                        "reserva_liberada",
                        "intercambio_completado",
                        "oferta_enviada",
                        "oferta_aceptada",
                        "oferta_rechazada",
                    ],
                ],
            },
        },
        role: {
            type: DataTypes.TEXT,
            allowNull: true,
            validate: { isIn: [["receptor", "entregador"]] },
        },
        postId: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        postTitle: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        otherUserName: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    },
    {
        sequelize,
        modelName: "Activity",
        tableName: "activities",
        timestamps: true,
        updatedAt: false,
    },
);

module.exports = Activity;
