const { Evento, sequelize } = require("../models");

// Lista de campos prohibidos para garantizar privacidad absoluta (sin PII)
const PII_FIELDS = new Set([
    "email", "mail", "nombre", "name", "user", "usuario", "userid",
    "user_id", "userId", "titulo", "title", "descripcion", "description",
    "password", "token", "telefono", "phone", "celular", "rut", "dni"
]);

// Convención estricta: objeto + accion_en_pasado (minúsculas, snake_case)
const SNAKE_CASE_REGEX = /^[a-z]+(_[a-z0-9]+)+$/;

function sanitizeProps(rawProps) {
    if (!rawProps || typeof rawProps !== "object" || Array.isArray(rawProps)) {
        return {};
    }
    const clean = {};
    for (const [key, value] of Object.entries(rawProps)) {
        if (!PII_FIELDS.has(key.toLowerCase())) {
            clean[key] = value;
        }
    }
    return clean;
}

/**
 * Registra un nuevo evento analítico.
 * Convención: objeto + accion_en_pasado (e.g. publicacion_iniciada, publicacion_guardada)
 * NUNCA debe contener PII.
 */
exports.registrarEvento = async (req, res, next) => {
    try {
        const { evento, props, fecha } = req.body || {};

        if (!evento || typeof evento !== "string" || !evento.trim()) {
            return res.status(400).json({
                message: "El nombre del evento es requerido y debe ser una cadena de texto no vacía.",
            });
        }

        const nombreEvento = evento.trim();
        if (!SNAKE_CASE_REGEX.test(nombreEvento)) {
            return res.status(400).json({
                message: "El nombre del evento debe seguir la convención estricta objeto + accion_en_pasado (minúsculas, snake_case).",
            });
        }

        const cleanProps = sanitizeProps(props);

        let fechaIso = new Date().toISOString();
        if (fecha && typeof fecha === "string" && !isNaN(Date.parse(fecha))) {
            fechaIso = new Date(fecha).toISOString();
        }

        const nuevoEvento = await Evento.create({
            evento: nombreEvento,
            props: cleanProps,
            fecha: fechaIso,
        });

        return res.status(201).json({
            success: true,
            evento: nuevoEvento,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Retorna las métricas agrupadas, tasa de finalización y los últimos 20 eventos.
 */
exports.obtenerResumen = async (req, res, next) => {
    try {
        const agrupados = await Evento.findAll({
            attributes: [
                "evento",
                [sequelize.fn("COUNT", sequelize.col("id")), "count"],
            ],
            group: ["evento"],
            raw: true,
        });

        const conteoPorEvento = {};
        for (const fila of agrupados) {
            conteoPorEvento[fila.evento] = parseInt(fila.count, 10);
        }

        const iniciadas = conteoPorEvento["publicacion_iniciada"] || 0;
        const guardadas = conteoPorEvento["publicacion_guardada"] || 0;
        const tasaFinalizacion = iniciadas > 0
            ? Number(((guardadas / iniciadas) * 100).toFixed(2))
            : 0;

        const total = await Evento.count();

        const ultimosEventos = await Evento.findAll({
            order: [["id", "DESC"]],
            limit: 20,
        });

        return res.json({
            resumen: {
                iniciadas,
                guardadas,
                tasaFinalizacion,
                total,
                conteoPorEvento,
            },
            ultimosEventos,
        });
    } catch (error) {
        next(error);
    }
};
