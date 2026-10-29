const {
    getOfferError,
    getRespondError,
    getAcceptError,
} = require("../src/rules/offerRules");

describe("Reglas para enviar una oferta", () => {
    let post;
    let offeredPost;

    beforeEach(() => {
        post = { id: 10, state: "disponible", userId: 1 };
        offeredPost = { id: 20, state: "disponible", userId: 2 };
    });

    test("1. otro usuario puede ofertar por una publicación disponible", () => {
        expect(getOfferError(post, 2, null, null)).toBeNull();
    });

    test("2. puede ofertar ofreciendo un producto suyo disponible", () => {
        expect(getOfferError(post, 2, offeredPost, null)).toBeNull();
    });

    test("3. restriccion, el dueño no puede ofertar por su propia publicación", () => {
        expect(getOfferError(post, 1, null, null)).toBe(
            "No puedes ofertar por tu propia publicación.",
        );
    });

    test("4. restriccion, no se puede ofertar si no está disponible", () => {
        post.state = "reservado";
        expect(getOfferError(post, 2, null, null)).toBe(
            "Solo puedes ofertar por una publicación disponible.",
        );

        post.state = "intercambiado";
        expect(getOfferError(post, 2, null, null)).toBe(
            "Solo puedes ofertar por una publicación disponible.",
        );
    });

    test("5. restriccion, no puede tener dos ofertas pendientes por la misma publicación", () => {
        expect(getOfferError(post, 2, null, { id: 99 })).toBe(
            "Ya tienes una oferta pendiente por esta publicación.",
        );
    });

    test("6. restriccion, el producto ofrecido debe ser suyo", () => {
        offeredPost.userId = 3;
        expect(getOfferError(post, 2, offeredPost, null)).toBe(
            "Solo puedes ofrecer un producto tuyo.",
        );
    });

    test("7. restriccion, el producto ofrecido debe estar disponible", () => {
        offeredPost.state = "reservado";
        expect(getOfferError(post, 2, offeredPost, null)).toBe(
            "El producto que ofreces debe estar disponible.",
        );
    });
});

describe("Reglas para aceptar o rechazar una oferta", () => {
    let post;
    let offer;

    beforeEach(() => {
        post = { id: 10, state: "disponible", userId: 1 };
        offer = { id: 30, status: "pendiente", proposerId: 2 };
    });

    test("1. el dueño puede responder una oferta pendiente", () => {
        expect(getRespondError(offer, post, 1)).toBeNull();
        expect(getAcceptError(offer, post, 1)).toBeNull();
    });

    test("2. restriccion, otra persona no puede responder la oferta", () => {
        expect(getRespondError(offer, post, 2)).toBe(
            "Solo el dueño de la publicación puede responder ofertas.",
        );
        expect(getAcceptError(offer, post, 99)).toBe(
            "Solo el dueño de la publicación puede responder ofertas.",
        );
    });

    test("3. restriccion, una oferta ya respondida no se vuelve a responder", () => {
        offer.status = "aceptada";
        expect(getRespondError(offer, post, 1)).toBe("Esta oferta ya fue respondida.");

        offer.status = "rechazada";
        expect(getAcceptError(offer, post, 1)).toBe("Esta oferta ya fue respondida.");
    });

    test("4. restriccion, no se acepta si la publicación ya no está disponible", () => {
        post.state = "reservado";
        expect(getAcceptError(offer, post, 1)).toBe(
            "La publicación ya no está disponible.",
        );
    });

    test("5. rechazar sí se permite aunque la publicación ya no esté disponible", () => {
        post.state = "reservado";
        expect(getRespondError(offer, post, 1)).toBeNull();
    });
});
