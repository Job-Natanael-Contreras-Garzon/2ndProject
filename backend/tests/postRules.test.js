const {
    getConfirmError,
    getCancelError,
    getReserveError,
    getEditError,
} = require("../src/rules/postRules");

describe("Reglas para confirmar o cancelar un intercambio", () => {
    let post;

    beforeEach(() => {
        post = {
            id: 10,
            title: "Libro de Cálculo I",
            state: "reservado",
            userId: 1,
            reservedById: 2,
            ownerConfirmed: false,
            receiverConfirmed: false,
        };
    });

    test("1. el dueño puede confirmar la entrega de una publicación reservada", () => {
        expect(getConfirmError(post, 1)).toBeNull();
    });

    test("2. quien reservó puede confirmar la entrega", () => {
        expect(getConfirmError(post, 2)).toBeNull();
    });

    test("3. restriccion, no se puede confirmar una publicación disponible", () => {
        post.state = "disponible";

        expect(getConfirmError(post, 1)).toBe(
            "Solo puedes confirmar la entrega de una publicación reservada.",
        );
    });

    test("4. restriccion, no se puede confirmar otra vez una intercambiada", () => {
        post.state = "intercambiado";

        expect(getConfirmError(post, 1)).toBe(
            "Solo puedes confirmar la entrega de una publicación reservada.",
        );
    });

    test("5. restriccion, otra persona no puede confirmar la entrega", () => {
        expect(getConfirmError(post, 99)).toBe(
            "Solo el dueño o quien reservó pueden confirmar la entrega.",
        );
    });

    test("5b. restriccion, la misma parte no puede confirmar dos veces", () => {
        post.ownerConfirmed = true;

        expect(getConfirmError(post, 1)).toBe(
            "Ya confirmaste la entrega. Falta la confirmación de la otra parte.",
        );
        expect(getConfirmError(post, 2)).toBeNull();
    });

    test("5c. cualquiera de las dos partes puede cancelar con motivo", () => {
        expect(getCancelError(post, 1, "No pudimos coincidir en horario")).toBeNull();
        expect(getCancelError(post, 2, "Ya no necesito el objeto")).toBeNull();
    });

    test("5d. restriccion, cancelar exige un motivo de 5 a 200 caracteres", () => {
        expect(getCancelError(post, 1, "")).toBe("Escribe el motivo de la cancelación.");
        expect(getCancelError(post, 1, "   ")).toBe("Escribe el motivo de la cancelación.");
        expect(getCancelError(post, 1)).toBe("Escribe el motivo de la cancelación.");
        expect(getCancelError(post, 1, "no")).toBe(
            "El motivo debe tener al menos 5 caracteres.",
        );
        expect(getCancelError(post, 1, "x".repeat(201))).toBe(
            "El motivo no puede pasar de 200 caracteres.",
        );
    });

    test("5e. restriccion, solo las partes pueden cancelar una publicación reservada", () => {
        expect(getCancelError(post, 99, "No pudimos coincidir")).toBe(
            "Solo el dueño o quien reservó pueden cancelar el intercambio.",
        );

        post.state = "disponible";
        expect(getCancelError(post, 1, "No pudimos coincidir")).toBe(
            "Solo puedes cancelar el intercambio de una publicación reservada.",
        );
    });

    test("6. restriccion, una intercambiada no se puede reservar, editar ni eliminar", () => {
        post.state = "intercambiado";

        expect(getReserveError(post, 2)).toBe(
            "No puedes reservar una publicación intercambiada.",
        );
        expect(getEditError(post, "editar")).toBe(
            "No puedes editar una publicación intercambiada.",
        );
        expect(getEditError(post, "eliminar")).toBe(
            "No puedes eliminar una publicación intercambiada.",
        );
    });

    test("7. una publicación disponible sí se puede reservar y editar", () => {
        post.state = "disponible";

        expect(getReserveError(post, 2)).toBeNull();
        expect(getEditError(post, "editar")).toBeNull();
    });

    test("8. restriccion, el dueño no puede reservar su propia publicación", () => {
        post.state = "disponible";

        expect(getReserveError(post, 1)).toBe(
            "No puedes reservar tu propia publicación.",
        );
    });

    test("9. quien reservó puede liberar la reserva", () => {
        expect(getReserveError(post, 2)).toBeNull();
    });

    test("10. restriccion, un tercero no puede liberar la reserva", () => {
        expect(getReserveError(post, 99)).toBe(
            "Solo el dueño o quien reservó pueden liberar la reserva.",
        );
    });
});
