const cuentaController = require("../src/controllers/cuenta.controller");
const { verifyToken } = require("../src/middleware/auth");
const { sequelize, User, Post, Offer, OfferMessage, Activity, Calificacion } = require("../src/models");
const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../src/database/config");

jest.mock("../src/database/db", () => {
    const { Sequelize } = require("sequelize");
    return new Sequelize({ dialect: "sqlite", storage: ":memory:", logging: false });
});

describe("Mis datos y eliminar cuenta", () => {
    let ana;
    let luis;
    let postAna;
    let postLuis;

    function buildRes() {
        return { json: jest.fn(), status: jest.fn().mockReturnThis() };
    }

    async function call(action, user) {
        const res = buildRes();
        await cuentaController[action]({ user: { id: user.id }, params: {}, body: {}, query: {} }, res);
        return res.json.mock.calls[0][0];
    }

    beforeAll(async () => {
        await sequelize.sync({ force: true });
    });

    // Ana y Luis, cada uno con una publicación disponible
    beforeEach(async () => {
        await Calificacion.destroy({ where: {} });
        await Activity.destroy({ where: {} });
        await OfferMessage.destroy({ where: {} });
        await Offer.destroy({ where: {} });
        await Post.destroy({ where: {} });
        await User.destroy({ where: {} });

        ana = await User.create({ name: "Ana Torres", email: "ana@test.com", password: "secreta" });
        luis = await User.create({ name: "Luis Rojas", email: "luis@test.com", password: "secreta" });
        postAna = await Post.create({ title: "Calculadora", category: "electronica", condition: "usado", state: "disponible", userId: ana.id });
        postLuis = await Post.create({ title: "Libro de física", category: "libros", condition: "usado", state: "disponible", userId: luis.id });
    });

    afterAll(async () => {
        await sequelize.close();
    });

    test("1. Mis datos devuelve lo de la persona y nunca la contraseña", async () => {
        await Offer.create({ message: "Te cambio mi libro", targetPostId: postLuis.id, proposerId: ana.id });
        await Activity.create({ userId: ana.id, type: "oferta_enviada", postId: postLuis.id, postTitle: "Libro de física", otherUserName: "Luis Rojas" });
        await Calificacion.create({ postId: postLuis.id, calificadorId: luis.id, calificadoId: ana.id, puntaje: 5, comentario: "Puntual" });
        await Calificacion.create({ postId: postLuis.id, calificadorId: ana.id, calificadoId: luis.id, puntaje: 4 });

        const datos = await call("misDatos", ana);

        expect(datos.usuario).toMatchObject({ nombre: "Ana Torres", correo: "ana@test.com" });
        expect(datos.publicaciones.map((p) => p.titulo)).toEqual(["Calculadora"]);
        expect(datos.ofertas).toHaveLength(1);
        expect(datos.ofertas[0].publicacion).toBe("Libro de física");
        expect(datos.actividad).toHaveLength(1);
        expect(datos.calificaciones.recibidas).toHaveLength(1);
        expect(datos.calificaciones.dadas).toHaveLength(1);
        expect(JSON.stringify(datos)).not.toContain("secreta");
    });

    test("2. se bloquea eliminar la cuenta con un intercambio en curso (dueño o receptor)", async () => {
        await postLuis.update({ state: "reservado", reservedById: ana.id });

        // Ana es quien reservó
        await expect(call("eliminar", ana)).rejects.toThrow("tienes un intercambio en curso: «Libro de física»");
        // Luis es el dueño
        await expect(call("eliminar", luis)).rejects.toThrow("Complétalo o cancélalo");

        expect(await User.count()).toBe(2);
        expect(await Post.count()).toBe(2);
    });

    test("3. eliminar borra la cuenta y todo lo suyo, sin tocar lo de otras personas", async () => {
        const oferta = await Offer.create({ message: "Mi oferta", targetPostId: postLuis.id, proposerId: ana.id });
        await OfferMessage.create({ offerId: oferta.id, senderId: ana.id, kind: "oferta", text: "Hola" });
        const ofertaDeLuis = await Offer.create({ message: "Te doy mi libro", targetPostId: postAna.id, proposerId: luis.id, offeredPostId: postLuis.id });
        await Activity.create({ userId: ana.id, type: "oferta_enviada", postTitle: "Libro de física", otherUserName: "Luis Rojas" });
        await Activity.create({ userId: luis.id, type: "oferta_enviada", postTitle: "Calculadora", otherUserName: "Ana Torres" });
        await Calificacion.create({ postId: postLuis.id, calificadorId: luis.id, calificadoId: ana.id, puntaje: 5 });
        // Un intercambio ya completado donde Ana recibió un objeto de Luis
        const postCompletado = await Post.create({ title: "Mochila", category: "otros", condition: "usado", state: "intercambiado", userId: luis.id, reservedById: ana.id });

        const respuesta = await call("eliminar", ana);
        expect(respuesta.message).toBe("Tu cuenta y tus datos fueron eliminados.");

        // Lo de Ana ya no existe
        expect(await User.findByPk(ana.id)).toBeNull();
        expect(await Post.findByPk(postAna.id)).toBeNull();
        expect(await Offer.findByPk(oferta.id)).toBeNull();
        expect(await Offer.findByPk(ofertaDeLuis.id)).toBeNull();
        expect(await OfferMessage.count()).toBe(0);
        expect(await Calificacion.count()).toBe(0);
        expect(await Activity.count({ where: { userId: ana.id } })).toBe(0);

        // Lo de Luis sigue, y el intercambio completado ya no apunta a Ana
        expect(await User.findByPk(luis.id)).not.toBeNull();
        expect(await Post.findByPk(postLuis.id)).not.toBeNull();
        expect(await Activity.count({ where: { userId: luis.id } })).toBe(1);
        expect((await Post.findByPk(postCompletado.id)).reservedById).toBeNull();
    });

    test("4. el token de una cuenta eliminada deja de servir", async () => {
        const token = jwt.sign({ id: ana.id, name: ana.name, email: ana.email }, jwtSecret);
        const req = { headers: { authorization: `Bearer ${token}` } };

        const next = jest.fn();
        await verifyToken(req, {}, next);
        expect(next).toHaveBeenCalledTimes(1);

        await call("eliminar", ana);

        await expect(verifyToken(req, {}, jest.fn())).rejects.toThrow("Tu cuenta ya no existe.");
    });
});
