const { Model, DataTypes } = require("sequelize");
const sequelize = require("../database/db");

// Calificación que una parte le da a la otra al terminar un intercambio completado.
class Calificacion extends Model {}

Calificacion.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        postId: { type: DataTypes.UUID, allowNull: false },
        calificadorId: { type: DataTypes.UUID, allowNull: false },
        calificadoId: { type: DataTypes.UUID, allowNull: false },
        puntaje: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: { min: 1, max: 5 },
        },
        comentario: { type: DataTypes.TEXT, allowNull: true },
    },
    {
        sequelize,
        modelName: "Calificacion",
        tableName: "calificaciones",
        timestamps: true,
        // Una sola calificación por persona en cada intercambio
        indexes: [{ unique: true, fields: ["postId", "calificadorId"] }],
    },
);

module.exports = Calificacion;
