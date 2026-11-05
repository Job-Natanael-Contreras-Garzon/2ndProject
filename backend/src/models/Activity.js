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
                        "contraoferta_enviada",
                        "contraoferta_recibida",
                        "entrega_confirmada",
                        "intercambio_cancelado",
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
        // Quién realizó la acción (para saber si fue el propio usuario o la otra parte)
        actorId: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        // Oferta relacionada (si la hay), para abrir su negociación desde el historial
        offerId: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        // Motivo de una cancelación
        reason: {
            type: DataTypes.STRING,
            allowNull: true,
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
