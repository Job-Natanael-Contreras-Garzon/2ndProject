const { Op } = require("sequelize");
const { buildPostWhere } = require("../src/rules/postFilters");

describe("buildPostWhere con otro operador de búsqueda", () => {
    it("usa Op.like por defecto", () => {
        expect(buildPostWhere({ q: "libro" }).title).toEqual({ [Op.like]: "%libro%" });
    });

    it("usa el operador indicado (en Postgres se usa iLike para no distinguir mayúsculas)", () => {
        expect(buildPostWhere({ q: "libro" }, Op.iLike).title).toEqual({ [Op.iLike]: "%libro%" });
    });
});
