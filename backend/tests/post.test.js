const postController = require("../src/controllers/post.controller");
const { Op } = require("sequelize");
const { Post, User } = require("../src/models");
const { HttpError } = require("../src/middleware/errorHandler");

jest.mock("../src/models", () => ({
    Post: {
        findByPk: jest.fn(),
        findAll: jest.fn(),
    },
    User: {
        findByPk: jest.fn().mockResolvedValue({ name: "Ana Torres" }),
    },
    Activity: {
        create: jest.fn(),
    },
}));

describe("Restricciones de estado en publicaciones", () => {
    let mockPost;
    let mockReq;
    let mockRes;

    beforeEach(() => {
        mockPost = {
            id: 10,
            title: "Libro de Estructura de Datos",
            category: "libros",
            condition: "usado",
            state: "disponible",
            userId: 1,
            update: jest.fn(),
            destroy: jest.fn(),
        };

        mockReq = {
            params: { id: 10 },
            user: { id: 1 },
            body: {},
        };

        mockRes = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
        };

        Post.findByPk.mockClear();
    });

    test("1. deberia permitir editar si el estado no esta reservado", async () => {
        Post.findByPk.mockResolvedValue(mockPost);

        mockReq.body = {
            title: "Libro de ED II (Editado)",
            category: "libros",
            condition: "nuevo",
            state: "disponible",
        };

        await postController.update(mockReq, mockRes);

        expect(mockPost.update).toHaveBeenCalledWith({
            title: "Libro de ED II (Editado)",
            category: "libros",
            condition: "nuevo",
        });
        expect(mockRes.json).toHaveBeenCalled();
    });

    test("2.  Deberia permitir Eliminar si el estado es diferente a reservado", async () => {
        Post.findByPk.mockResolvedValue(mockPost);

        await postController.delete(mockReq, mockRes);

        expect(mockPost.destroy).toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
                message: "Publicación eliminada satisfactoriamente",
            }),
        );
    });

    test("3. Restriccion, Deberia rechazar la edicion si el estado es reservado", async () => {
        mockPost.state = "reservado";
        Post.findByPk.mockResolvedValue(mockPost);

        mockReq.body = {
            title: "Intentar editar ilegalemnte",
            category: "ropa",
            condition: "nuevo",
            state: "disponible",
        };

        await expect(postController.update(mockReq, mockRes)).rejects.toThrow(
            HttpError,
        );
        await expect(postController.update(mockReq, mockRes)).rejects.toThrow(
            "No puedes editar una publicación reservada",
        );

        expect(mockPost.update).not.toHaveBeenCalled();
    });

    test("4. restriccion, deberia  rechazar la eliminacion si el estado es reservado", async () => {
        mockPost.state = "reservado";
        Post.findByPk.mockResolvedValue(mockPost);

        await expect(postController.delete(mockReq, mockRes)).rejects.toThrow(
            HttpError,
        );
        await expect(postController.delete(mockReq, mockRes)).rejects.toThrow(
            "No puedes eliminar una publicación reservada",
        );

        expect(mockPost.destroy).not.toHaveBeenCalled();
    });

    test("5. debería alternar entre reservado y disponible", async () => {
        mockReq.user.id = 2;
        Post.findByPk.mockResolvedValue(mockPost);
        await postController.toggleReservation(mockReq, mockRes);
        expect(mockPost.update).toHaveBeenCalledWith({
            state: "reservado",
            reservedById: 2,
        });

        mockPost.state = "reservado";
        mockPost.reservedById = 2;
        await postController.toggleReservation(mockReq, mockRes);
        expect(mockPost.update).toHaveBeenCalledWith({
            state: "disponible",
            reservedById: null,
        });
    });

    test("5b. restriccion, el dueño no puede reservar su propia publicación", async () => {
        Post.findByPk.mockResolvedValue(mockPost);

        await expect(
            postController.toggleReservation(mockReq, mockRes),
        ).rejects.toThrow("No puedes reservar tu propia publicación.");

        expect(mockPost.update).not.toHaveBeenCalled();
    });

    test("6. la primera confirmación de entrega no completa el intercambio", async () => {
        mockPost.state = "reservado";
        mockPost.reservedById = 2;
        Post.findByPk.mockResolvedValue(mockPost);

        await postController.confirm(mockReq, mockRes);

        expect(mockPost.update).toHaveBeenCalledWith({ ownerConfirmed: true });
        expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({ completed: false }),
        );
    });

    test("6b. la segunda confirmación de entrega completa el intercambio", async () => {
        mockPost.state = "reservado";
        mockPost.reservedById = 2;
        mockPost.receiverConfirmed = true;
        Post.findByPk.mockResolvedValue(mockPost);

        await postController.confirm(mockReq, mockRes);

        expect(mockPost.update).toHaveBeenCalledWith({
            ownerConfirmed: true,
            state: "intercambiado",
        });
        expect(mockPost.title).toBe("Libro de Estructura de Datos");
        expect(mockPost.category).toBe("libros");
        expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({ completed: true }),
        );
    });

    test("7. restriccion, deberia rechazar confirmar si el estado es disponible", async () => {
        Post.findByPk.mockResolvedValue(mockPost);

        await expect(postController.confirm(mockReq, mockRes)).rejects.toThrow(
            "Solo puedes confirmar la entrega de una publicación reservada.",
        );

        expect(mockPost.update).not.toHaveBeenCalled();
    });

    test("8. validacion, deberia rechazar una categoria no valida al editar", async () => {
        Post.findByPk.mockResolvedValue(mockPost);
        mockReq.body = { title: "Libro", category: "juguetes", condition: "usado" };

        await expect(postController.update(mockReq, mockRes)).rejects.toThrow(
            "Categoría no válida.",
        );

        expect(mockPost.update).not.toHaveBeenCalled();
    });

    test("9. validacion, deberia rechazar editar si falta la condicion", async () => {
        Post.findByPk.mockResolvedValue(mockPost);
        mockReq.body = { title: "Libro", category: "libros" };

        await expect(postController.update(mockReq, mockRes)).rejects.toThrow(
            "Título, categoría y condición son obligatorios.",
        );

        expect(mockPost.update).not.toHaveBeenCalled();
    });

    test("10. validacion, deberia rechazar una condicion no valida al editar", async () => {
        Post.findByPk.mockResolvedValue(mockPost);
        mockReq.body = { title: "Libro", category: "libros", condition: "roto" };

        await expect(postController.update(mockReq, mockRes)).rejects.toThrow(
            "Condición no válida.",
        );

        expect(mockPost.update).not.toHaveBeenCalled();
    });

});

describe("Explorar publicaciones", () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        mockReq = {
            user: { id: 1 },
            query: {},
        };

        mockRes = {
            json: jest.fn(),
        };

        Post.findAll.mockClear();
    });

    test("1. deberia devolver las publicaciones de otros usuarios", async () => {
        const posts = [{ id: 20, title: "Calculadora", userId: 2 }];
        Post.findAll.mockResolvedValue(posts);

        await postController.explore(mockReq, mockRes);

        expect(Post.findAll).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    state: { [Op.ne]: "intercambiado" },
                    userId: { [Op.ne]: 1 },
                },
            }),
        );
        expect(mockRes.json).toHaveBeenCalledWith({ posts });
    });

    test("2. deberia devolver una lista vacia si no hay coincidencias", async () => {
        Post.findAll.mockResolvedValue([]);
        mockReq.query = { q: "microscopio", category: "ropa" };

        await postController.explore(mockReq, mockRes);

        expect(Post.findAll).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    title: { [Op.like]: "%microscopio%" },
                    category: "ropa",
                    state: { [Op.ne]: "intercambiado" },
                    userId: { [Op.ne]: 1 },
                },
            }),
        );
        expect(mockRes.json).toHaveBeenCalledWith({ posts: [] });
    });
});
