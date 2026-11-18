const { Op } = require("sequelize");

// likeOp: en Postgres se usa Op.iLike para que la búsqueda no distinga mayúsculas (SQLite ya no las distingue)
function buildPostWhere({ q, category, condition, state }, likeOp = Op.like) {
    const where = {};

    if (q) {
        where.title = { [likeOp]: `%${q}%` };
    }
    if (category) {
        where.category = category;
    }
    if (condition) {
        where.condition = condition;
    }
    if (state) {
        where.state = state;
    } else {
        where.state = { [Op.ne]: "intercambiado" };
    }

    return where;
}

module.exports = { buildPostWhere };
