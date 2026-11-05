const postController = require("../src/controllers/post.controller");
const activityController = require("../src/controllers/activity.controller");
const { sequelize, User, Post, Activity } = require("../src/models");

jest.mock("../src/database/db", () => {
    const { Sequelize } = require("sequelize");
    return new Sequelize({ dialect: "sqlite", storage: ":memory:", logging: false });
});

describe("Historial de actividad", () => {
    let owner;
    let student;
    let other;
    let post;

    function buildRes() {
        return {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
        };
    }

    async function listActivity(user, query = {}) {
        const res = buildRes();
        await activityController.list({ user: { id: user.id }, query }, res);
        return res.json.mock.calls[0][0].activities;
    }

    async function reserve(user) {
        await postController.toggleReservation(
            { user: { id: user.id }, params: { id: post.id } },
            buildRes(),
        );
    }

    beforeAll(async () => {
        await sequelize.sync({ force: true });
    });

    beforeEach(async () => {
        await Activity.destroy({ where: {} });
        await Post.destroy({ where: {} });
        await User.destroy({ where: {} });

        owner = await User.create({ name: "Dueño Demo", email: "owner@test.com", password: "x" });
        student = await User.create({ name: "Ana Torres", email: "ana@test.com", password: "x" });
        other = await User.create({ name: "Luis Pérez", email: "luis@test.com", password: "x" });
        post = await Post.create({
            title: "Calculadora Casio",
            category: "electronica",
            condition: "usado",
            state: "disponible",
            userId: owner.id,
        });
    });

    afterAll(async () => {
        await sequelize.close();
    });

    test("1. reservar una publicacion crea un evento visible en el historial", async () => {
        await reserve(student);

        const activities = await listActivity(student);

        expect(activities).toHaveLength(1);
        expect(activities[0].type).toBe("reservado");
        expect(activities[0].postTitle).toBe("Calculadora Casio");
        expect(activities[0].otherUserName).toBe("Dueño Demo");
    });

    test("2. otro usuario no ve el evento ni puede abrir su detalle", async () => {
        await reserve(student);
        const [event] = await listActivity(student);

        expect(await listActivity(other)).toEqual([]);

        const res = buildRes();
        await expect(
            activityController.detail(
                { user: { id: other.id }, params: { id: event.id } },
                res,
            ),
        ).rejects.toThrow("Actividad no encontrada.");
    });

    test("3. el detalle devuelve el evento propio con el estado actual de la publicacion", async () => {
        await reserve(student);
        const [event] = await listActivity(student);

        const res = buildRes();
        await activityController.detail(
            { user: { id: student.id }, params: { id: event.id } },
            res,
        );

        const { activity } = res.json.mock.calls[0][0];
        expect(activity.id).toBe(event.id);
        expect(activity.Post.state).toBe("reservado");
    });

    test("4. los eventos se devuelven del mas reciente al mas antiguo", async () => {
        await Activity.create({
            userId: student.id,
            type: "reservado",
            postTitle: "Primero",
            otherUserName: "Dueño Demo",
            createdAt: new Date("2026-10-01T10:00:00"),
        });
        await Activity.create({
            userId: student.id,
            type: "reserva_liberada",
            postTitle: "Segundo",
            otherUserName: "Dueño Demo",
            createdAt: new Date("2026-10-05T10:00:00"),
        });
        await Activity.create({
            userId: student.id,
            type: "reservado",
            postTitle: "Tercero",
            otherUserName: "Dueño Demo",
            createdAt: new Date("2026-10-03T10:00:00"),
        });

        const activities = await listActivity(student);

        expect(activities.map((a) => a.postTitle)).toEqual([
            "Segundo",
            "Tercero",
            "Primero",
        ]);
    });

    test("5. el filtro de intercambios solo devuelve intercambios completados", async () => {
        await reserve(student);
        // El intercambio se completa cuando confirman ambas partes
        for (const user of [student, owner]) {
            await postController.confirm(
                { user: { id: user.id }, params: { id: post.id } },
                buildRes(),
            );
        }

        const exchanges = await listActivity(student, { type: "intercambios" });
        const reservations = await listActivity(student, { type: "reservas" });

        expect(exchanges).toHaveLength(1);
        expect(exchanges[0].type).toBe("intercambio_completado");
        expect(exchanges[0].role).toBe("receptor");
        expect(reservations).toHaveLength(1);
        expect(reservations[0].type).toBe("reservado");

        const ownerExchanges = await listActivity(owner, { type: "intercambios" });
        expect(ownerExchanges[0].role).toBe("entregador");
        expect(ownerExchanges[0].otherUserName).toBe("Ana Torres");
    });
});
