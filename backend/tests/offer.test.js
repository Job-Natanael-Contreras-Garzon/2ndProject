const offerController = require("../src/controllers/offer.controller");
const postController = require("../src/controllers/post.controller");
const activityController = require("../src/controllers/activity.controller");
const { sequelize, User, Post, Activity, Offer, OfferMessage } = require("../src/models");

jest.mock("../src/database/db", () => {
    const { Sequelize } = require("sequelize");
    return new Sequelize({ dialect: "sqlite", storage: ":memory:", logging: false });
});

describe("Ofertas de trueque", () => {
    let owner;
    let ana;
    let luis;
    let post;
    let anaPost;

    function buildRes() {
        return {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
        };
    }

    // Envía una oferta como "user" por la publicación "target"
    async function sendOffer(user, target, body = {}) {
        const res = buildRes();
        await offerController.create(
            { user: { id: user.id }, params: { id: target.id }, body },
            res,
        );
        return res.json.mock.calls[0][0].offer;
    }

    async function listOffers(user, target) {
        const res = buildRes();
        await offerController.listByPost(
            { user: { id: user.id }, params: { id: target.id } },
            res,
        );
        return res.json.mock.calls[0][0].offers;
    }

    async function answer(action, user, offer, body = {}) {
        const res = buildRes();
        await offerController[action](
            { user: { id: user.id }, params: { id: offer.id }, body },
            res,
        );
        return res.json.mock.calls[0][0];
    }

    async function historyOf(user) {
        const res = buildRes();
        await activityController.list({ user: { id: user.id }, query: {} }, res);
        return res.json.mock.calls[0][0].activities;
    }

    beforeAll(async () => {
        await sequelize.sync({ force: true });
    });

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
        anaPost = await Post.create({
            title: "Libro de Cálculo",
            category: "libros",
            condition: "usado",
            state: "disponible",
            userId: ana.id,
        });
    });

    afterAll(async () => {
        await sequelize.close();
    });

    test("1. enviar una oferta la guarda como pendiente y queda en el historial", async () => {
        const offer = await sendOffer(ana, post, {
            offeredPostId: anaPost.id,
            message: "Te cambio mi libro",
        });

        expect(offer.status).toBe("pendiente");

        const saved = await Offer.findByPk(offer.id);
        expect(saved.targetPostId).toBe(post.id);
        expect(saved.offeredPostId).toBe(anaPost.id);
        expect(saved.proposerId).toBe(ana.id);

        const history = await historyOf(ana);
        expect(history).toHaveLength(1);
        expect(history[0].type).toBe("oferta_enviada");
        expect(history[0].otherUserName).toBe("Dueño Demo");
    });

    test("2. se puede ofertar solo con un mensaje, sin producto", async () => {
        const offer = await sendOffer(ana, post, { message: "Te pago con un favor" });

        expect(offer.offeredPostId).toBeNull();
    });

    test("3. restricciones al enviar: vacía, propia, repetida y producto ajeno", async () => {
        await expect(sendOffer(ana, post, {})).rejects.toThrow(
            "Escribe un mensaje o elige un producto para ofertar.",
        );

        await expect(sendOffer(owner, post, { message: "hola" })).rejects.toThrow(
            "No puedes ofertar por tu propia publicación.",
        );

        await sendOffer(ana, post, { message: "primera" });
        await expect(sendOffer(ana, post, { message: "segunda" })).rejects.toThrow(
            "Ya tienes una oferta pendiente por esta publicación.",
        );

        await expect(
            sendOffer(luis, post, { offeredPostId: anaPost.id }),
        ).rejects.toThrow("Solo puedes ofrecer un producto tuyo.");
    });

    test("4. solo el dueño ve las ofertas recibidas", async () => {
        await sendOffer(ana, post, { message: "mi oferta" });

        const offers = await listOffers(owner, post);
        expect(offers).toHaveLength(1);
        expect(offers[0].proposer.name).toBe("Ana Torres");

        await expect(listOffers(luis, post)).rejects.toThrow(
            "Solo el dueño puede ver las ofertas de su publicación.",
        );
    });

    test("5. rechazar deja la publicación disponible y avisa al ofertante", async () => {
        const offer = await sendOffer(ana, post, { message: "mi oferta" });

        await answer("reject", owner, offer);

        expect((await Offer.findByPk(offer.id)).status).toBe("rechazada");
        expect((await Post.findByPk(post.id)).state).toBe("disponible");
        expect(await listOffers(owner, post)).toHaveLength(0);

        const history = await historyOf(ana);
        expect(history.map((a) => a.type)).toContain("oferta_rechazada");
    });

    test("6. aceptar reserva la publicación para quien ofertó y rechaza las demás", async () => {
        const anaOffer = await sendOffer(ana, post, { message: "oferta de Ana" });
        const luisOffer = await sendOffer(luis, post, { message: "oferta de Luis" });

        await answer("accept", owner, anaOffer);

        const savedPost = await Post.findByPk(post.id);
        expect(savedPost.state).toBe("reservado");
        expect(savedPost.reservedById).toBe(ana.id);
        expect((await Offer.findByPk(anaOffer.id)).status).toBe("aceptada");
        expect((await Offer.findByPk(luisOffer.id)).status).toBe("rechazada");

        expect((await historyOf(ana)).map((a) => a.type)).toContain("oferta_aceptada");
        expect((await historyOf(luis)).map((a) => a.type)).toContain("oferta_rechazada");
    });

    test("7. restricciones al responder: otra persona y oferta ya respondida", async () => {
        const offer = await sendOffer(ana, post, { message: "mi oferta" });

        await expect(answer("accept", luis, offer)).rejects.toThrow(
            "Solo el dueño de la publicación puede responder ofertas.",
        );
        expect((await Post.findByPk(post.id)).state).toBe("disponible");

        await answer("accept", owner, offer);
        await expect(answer("accept", owner, offer)).rejects.toThrow(
            "Esta oferta ya fue respondida.",
        );
    });

    test("8. después de aceptar, quien ofertó puede completar el intercambio", async () => {
        const offer = await sendOffer(ana, post, { message: "mi oferta" });
        await answer("accept", owner, offer);

        await postController.complete(
            { user: { id: ana.id }, params: { id: post.id } },
            buildRes(),
        );

        expect((await Post.findByPk(post.id)).state).toBe("intercambiado");
    });

    test("9. si se elimina la publicación, sus ofertas se eliminan con ella", async () => {
        const offer = await sendOffer(ana, post, { message: "mi oferta" });

        await postController.delete(
            { user: { id: owner.id }, params: { id: post.id } },
            buildRes(),
        );

        expect(await Offer.findByPk(offer.id)).toBeNull();
    });

    test("10. contraofertar actualiza la oferta y registra la actividad en el historial de ambos", async () => {
        const offer = await sendOffer(ana, post, { message: "Te doy mis apuntes" });

        await answer("counter", owner, offer, {
            message: "Te acepto si agregas un cuaderno",
        });

        const updatedOffer = await Offer.findByPk(offer.id);
        expect(updatedOffer.status).toBe("contraoferta");
        expect(updatedOffer.message).toBe("Te acepto si agregas un cuaderno");

        const ownerHistory = await historyOf(owner);
        expect(ownerHistory.map((a) => a.type)).toContain("contraoferta_enviada");
        expect(ownerHistory[0].otherUserName).toBe("Ana Torres");

        const anaHistory = await historyOf(ana);
        expect(anaHistory.map((a) => a.type)).toContain("contraoferta_recibida");
    });

    // Hilo de negociación de una oferta como "user"
    async function getThread(user, offer) {
        const res = buildRes();
        await offerController.thread({ user: { id: user.id }, params: { id: offer.id } }, res);
        return res.json.mock.calls[0][0];
    }

    test("11. el hilo conserva la oferta y la contraoferta y lo ven ambas partes", async () => {
        const offer = await sendOffer(ana, post, { message: "Te doy mis apuntes" });
        await answer("counter", owner, offer, { message: "Agrega un cuaderno" });

        for (const user of [ana, owner]) {
            const { messages } = await getThread(user, offer);
            expect(messages.map((m) => [m.kind, m.text])).toEqual([
                ["oferta", "Te doy mis apuntes"],
                ["contraoferta", "Agrega un cuaderno"],
            ]);
        }
    });

    test("12. un tercero no puede ver el hilo de la negociación", async () => {
        const offer = await sendOffer(ana, post, { message: "mi oferta" });

        await expect(getThread(luis, offer)).rejects.toMatchObject({ status: 403 });
    });

    test("13. quien ofertó responde a la contraoferta y la oferta vuelve a pendiente", async () => {
        const offer = await sendOffer(ana, post, { message: "mi oferta" });
        await answer("counter", owner, offer, { message: "Agrega un cuaderno" });

        await answer("reply", ana, offer, { message: "Listo, agrego el cuaderno" });

        expect((await Offer.findByPk(offer.id)).status).toBe("pendiente");
        const { messages } = await getThread(owner, offer);
        expect(messages.map((m) => m.kind)).toEqual(["oferta", "contraoferta", "respuesta"]);
        expect(messages[2].text).toBe("Listo, agrego el cuaderno");
    });

    test("14. solo se puede responder a una contraoferta y solo quien ofertó", async () => {
        const offer = await sendOffer(ana, post, { message: "mi oferta" });

        // Aún no hay contraoferta
        await expect(answer("reply", ana, offer, { message: "hola" })).rejects.toMatchObject({ status: 400 });

        await answer("counter", owner, offer, { message: "Agrega un cuaderno" });

        // El dueño no puede responder su propia contraoferta
        await expect(answer("reply", owner, offer, { message: "hola" })).rejects.toMatchObject({ status: 403 });
        // Mensaje vacío
        await expect(answer("reply", ana, offer, { message: "  " })).rejects.toMatchObject({ status: 400 });
    });

    test("15. quien ofertó ve sus ofertas con la publicación y su estado", async () => {
        const offer = await sendOffer(ana, post, { message: "mi oferta" });
        await answer("counter", owner, offer, { message: "Agrega un cuaderno" });

        const res = buildRes();
        await offerController.mine({ user: { id: ana.id } }, res);
        const { offers } = res.json.mock.calls[0][0];

        expect(offers).toHaveLength(1);
        expect(offers[0].status).toBe("contraoferta");
        expect(offers[0].targetPost.title).toBe("Calculadora Casio");
        expect(offers[0].targetPost.owner.name).toBe("Dueño Demo");
    });
});