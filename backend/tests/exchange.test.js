const offerController = require("../src/controllers/offer.controller");
const postController = require("../src/controllers/post.controller");
const activityController = require("../src/controllers/activity.controller");
const { sequelize, User, Post, Activity, Offer, OfferMessage } = require("../src/models");

jest.mock("../src/database/db", () => {
    const { Sequelize } = require("sequelize");
    return new Sequelize({ dialect: "sqlite", storage: ":memory:", logging: false });
});

describe("Confirmar entrega y cancelar un intercambio acordado", () => {
    let owner;
    let ana;
    let luis;
    let post;
    let anaOffer;
    let luisOffer;

    function buildRes() {
        return {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
        };
    }

    async function call(controller, action, user, params = {}, body = {}) {
        const res = buildRes();
        await controller[action]({ user: { id: user.id }, params, body, query: {} }, res);
        return res.json.mock.calls[0][0];
    }

    const confirm = (user) => call(postController, "confirm", user, { id: post.id });
    const cancel = (user, reason) => call(postController, "cancel", user, { id: post.id }, { reason });
    const history = async (user, type) =>
        (await call(activityController, "list", user)).activities.filter((a) => !type || a.type === type);

    beforeAll(async () => {
        await sequelize.sync({ force: true });
    });

    // Ana y Luis ofertan por la publicación; el dueño acepta la de Ana (Luis queda rechazado)
    beforeEach(async () => {
        await OfferMessage.destroy({ where: {} });
        await Offer.destroy({ where: {} });
        await Activity.destroy({ where: {} });
        await Post.destroy({ where: {} });
        await User.destroy({ where: {} });

        owner = await User.create({ name: "Dueño Demo", email: "owner@test.com", password: "x" });
        ana = await User.create({ name: "Ana Torres", email: "ana@test.com", password: "x" });
        luis = await User.create({ name: "Luis Pérez", email: "luis@test.com", password: "x" });
        post = await Post.create({
            title: "Calculadora Casio",
            category: "electronica",
            condition: "usado",
            state: "disponible",
            userId: owner.id,
        });

        anaOffer = (await call(offerController, "create", ana, { id: post.id }, { message: "Mis apuntes" })).offer;
        luisOffer = (await call(offerController, "create", luis, { id: post.id }, { message: "Mi libro" })).offer;
        await call(offerController, "accept", owner, { id: anaOffer.id });
    });

    afterAll(async () => {
        await sequelize.close();
    });

    test("1. aceptar una oferta rechaza las demás y reserva la publicación", async () => {
        expect((await Post.findByPk(post.id)).state).toBe("reservado");
        expect((await Offer.findByPk(anaOffer.id)).status).toBe("aceptada");
        expect((await Offer.findByPk(luisOffer.id)).status).toBe("rechazada");
    });

    test("2. la primera confirmación no completa el intercambio y la segunda sí", async () => {
        const first = await confirm(owner);
        expect(first.completed).toBe(false);

        let saved = await Post.findByPk(post.id);
        expect(saved.state).toBe("reservado");
        expect(saved.ownerConfirmed).toBe(true);
        expect(saved.receiverConfirmed).toBe(false);
        expect(await history(owner, "intercambio_completado")).toHaveLength(0);

        const second = await confirm(ana);
        expect(second.completed).toBe(true);

        saved = await Post.findByPk(post.id);
        expect(saved.state).toBe("intercambiado");
        expect(await history(owner, "intercambio_completado")).toHaveLength(1);
        expect(await history(ana, "intercambio_completado")).toHaveLength(1);
    });

    test("3. cada confirmación queda en el historial de ambas partes con quién la hizo", async () => {
        await confirm(ana);

        const anaEvents = await history(ana, "entrega_confirmada");
        const ownerEvents = await history(owner, "entrega_confirmada");

        expect(anaEvents).toHaveLength(1);
        expect(anaEvents[0].actorId).toBe(ana.id);
        expect(anaEvents[0].otherUserName).toBe("Dueño Demo");
        expect(ownerEvents).toHaveLength(1);
        expect(ownerEvents[0].actorId).toBe(ana.id);
        expect(ownerEvents[0].otherUserName).toBe("Ana Torres");
    });

    test("4. la misma parte no puede confirmar dos veces", async () => {
        await confirm(owner);

        await expect(confirm(owner)).rejects.toMatchObject({ status: 400 });
        expect((await Post.findByPk(post.id)).state).toBe("reservado");
    });

    test("5. un tercero no puede confirmar ni cancelar el intercambio", async () => {
        await expect(confirm(luis)).rejects.toMatchObject({ status: 403 });
        await expect(cancel(luis, "No me corresponde esto")).rejects.toMatchObject({ status: 403 });
        expect((await Post.findByPk(post.id)).state).toBe("reservado");
    });

    test("6. cancelar sin motivo o con un motivo muy corto se rechaza", async () => {
        await expect(cancel(ana, "")).rejects.toMatchObject({ status: 400 });
        await expect(cancel(ana, "no")).rejects.toMatchObject({ status: 400 });
        expect((await Post.findByPk(post.id)).state).toBe("reservado");
    });

    test("7. cancelar con motivo devuelve la publicación a disponible y reinicia las confirmaciones", async () => {
        await confirm(owner);

        await cancel(ana, "No pudimos coincidir en horario");

        const saved = await Post.findByPk(post.id);
        expect(saved.state).toBe("disponible");
        expect(saved.reservedById).toBeNull();
        expect(saved.ownerConfirmed).toBe(false);
        expect(saved.receiverConfirmed).toBe(false);
    });

    test("8. el motivo queda en el historial de ambas partes", async () => {
        await cancel(owner, "El objeto ya no está en buen estado");

        const ownerEvent = (await history(owner, "intercambio_cancelado"))[0];
        const anaEvent = (await history(ana, "intercambio_cancelado"))[0];

        expect(ownerEvent.reason).toBe("El objeto ya no está en buen estado");
        expect(ownerEvent.actorId).toBe(owner.id);
        expect(ownerEvent.otherUserName).toBe("Ana Torres");
        expect(anaEvent.reason).toBe("El objeto ya no está en buen estado");
        expect(anaEvent.actorId).toBe(owner.id);
        expect(anaEvent.otherUserName).toBe("Dueño Demo");
    });

    test("9. cancelar conserva el historial y no reactiva las ofertas anteriores", async () => {
        await cancel(ana, "Ya no necesito el objeto");

        // La oferta aceptada queda cancelada y la otra sigue rechazada
        expect((await Offer.findByPk(anaOffer.id)).status).toBe("cancelada");
        expect((await Offer.findByPk(luisOffer.id)).status).toBe("rechazada");

        // El dueño no tiene ofertas pendientes que revisar
        const { offers } = await call(offerController, "listByPost", owner, { id: post.id });
        expect(offers).toHaveLength(0);

        // El motivo se conserva en el hilo de la oferta cancelada
        const { messages } = await call(offerController, "thread", ana, { id: anaOffer.id });
        expect(messages.map((m) => m.kind)).toEqual(["oferta", "sistema"]);
        expect(messages[1].text).toContain("Ya no necesito el objeto");

        // El historial anterior sigue ahí
        expect((await history(ana, "oferta_aceptada")).length).toBe(1);
    });

    test("10. después de cancelar, la publicación acepta nuevas ofertas", async () => {
        await cancel(ana, "No pudimos coincidir en horario");

        const { offer } = await call(offerController, "create", luis, { id: post.id }, { message: "Otra vez" });

        expect(offer.status).toBe("pendiente");
    });

    test("11. no se puede cancelar un intercambio ya completado", async () => {
        await confirm(owner);
        await confirm(ana);

        await expect(cancel(ana, "Me arrepentí del trato")).rejects.toMatchObject({ status: 400 });
        expect((await Post.findByPk(post.id)).state).toBe("intercambiado");
    });

    test("12. el historial se puede filtrar por ofertas y cancelaciones", async () => {
        await cancel(ana, "No pudimos coincidir en horario");

        const cancelaciones = (await call(activityController, "list", ana, {}, {})).activities;
        expect(cancelaciones.map((a) => a.type)).toContain("intercambio_cancelado");

        const res = buildRes();
        await activityController.list({ user: { id: ana.id }, query: { type: "cancelaciones" } }, res);
        expect(res.json.mock.calls[0][0].activities.map((a) => a.type)).toEqual(["intercambio_cancelado"]);

        const res2 = buildRes();
        await activityController.list({ user: { id: ana.id }, query: { type: "ofertas" } }, res2);
        expect(res2.json.mock.calls[0][0].activities.map((a) => a.type)).toEqual(
            expect.arrayContaining(["oferta_enviada", "oferta_aceptada"]),
        );
    });
});
