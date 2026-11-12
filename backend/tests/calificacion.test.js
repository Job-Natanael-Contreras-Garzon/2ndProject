const calificacionController = require("../src/controllers/calificacion.controller");
const authController = require("../src/controllers/auth.controller");
const { sequelize, User, Post, Calificacion } = require("../src/models");

jest.mock("../src/database/db", () => {
    const { Sequelize } = require("sequelize");
    return new Sequelize({ dialect: "sqlite", storage: ":memory:", logging: false });
});

describe("Calificar un intercambio", () => {
    let dueno;
    let ana;
    let post;

    function buildRes() {
        return { json: jest.fn(), status: jest.fn().mockReturnThis() };
    }

    async function call(controller, action, user, params = {}, body = {}) {
        const res = buildRes();
        await controller[action]({ user: { id: user.id }, params, body, query: {} }, res);
        return res.json.mock.calls[0][0];
    }

    const calificar = (user, puntaje, comentario) =>
        call(calificacionController, "crear", user, { id: post.id }, { puntaje, comentario });

    beforeAll(async () => {
        await sequelize.sync({ force: true });
    });

    // Publicación con intercambio completado entre el dueño y Ana
    beforeEach(async () => {
        await Calificacion.destroy({ where: {} });
        await Post.destroy({ where: {} });
        await User.destroy({ where: {} });

        dueno = await User.create({ name: "Dueño Demo", email: "dueno@test.com", password: "x" });
        ana = await User.create({ name: "Ana Torres", email: "ana@test.com", password: "x" });
        post = await Post.create({
            title: "Calculadora Casio",
            category: "electronica",
            condition: "usado",
            state: "intercambiado",
            userId: dueno.id,
            reservedById: ana.id,
        });
    });

    afterAll(async () => {
        await sequelize.close();
    });

    test("1. ambas partes califican y el perfil muestra promedio y cantidad", async () => {
        await calificar(dueno, 5, "Muy puntual");
        await calificar(ana, 4);

        expect(await Calificacion.count()).toBe(2);

        const perfilAna = await call(authController, "profile", ana);
        expect(perfilAna.user.calificaciones).toEqual({ promedio: 5, cantidad: 1 });
        const perfilDueno = await call(authController, "profile", dueno);
        expect(perfilDueno.user.calificaciones).toEqual({ promedio: 4, cantidad: 1 });
    });

    test("2. se rechaza una segunda calificación de la misma persona", async () => {
        await calificar(ana, 5);
        await expect(calificar(ana, 1)).rejects.toThrow("Ya calificaste este intercambio.");
        expect(await Calificacion.count()).toBe(1);
    });

    test("3. se rechaza calificar un intercambio cancelado", async () => {
        // Un intercambio cancelado vuelve a "disponible" y queda sin reserva
        await post.update({ state: "disponible", reservedById: null });
        await expect(calificar(ana, 5)).rejects.toThrow("Solo se puede calificar un intercambio completado.");
        await expect(calificar(dueno, 5)).rejects.toThrow("Solo se puede calificar un intercambio completado.");
        expect(await Calificacion.count()).toBe(0);
    });

    test("4. se rechaza un puntaje fuera de 1 a 5 o una persona ajena al intercambio", async () => {
        await expect(calificar(ana, 6)).rejects.toThrow("El puntaje debe ser un número entero de 1 a 5.");
        await expect(calificar(ana, 0)).rejects.toThrow("El puntaje debe ser un número entero de 1 a 5.");

        const luis = await User.create({ name: "Luis", email: "luis@test.com", password: "x" });
        await expect(calificar(luis, 5)).rejects.toThrow("Solo el dueño o quien recibió el objeto pueden calificar.");
    });
});
