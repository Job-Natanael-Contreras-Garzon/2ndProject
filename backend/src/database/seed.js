const bcrypt = require("bcryptjs");
require("./config");
const { sequelize, User, Post, Activity, Offer } = require("../models");

const users = [
    { name: "Martita Becerra", email: "martita@truequeu.com" },
    { name: "Admin Demo", email: "admin@truequeu.com" },
    { name: "Usuario Invitado", email: "invitado@truequeu.com" },
];

const posts = [
    { title: "Cálculo I – Stewart", category: "libros", condition: "usado", state: "disponible", owner: 0 },
    { title: "Cálculo diferencial – Larson", category: "libros", condition: "usado", state: "disponible", owner: 1 },
    { title: "Cálculo vectorial – Marsden", category: "libros", condition: "nuevo", state: "disponible", owner: 2 },
    { title: "Apuntes de cálculo integral", category: "libros", condition: "usado", state: "reservado", owner: 0 },
    { title: "Calculadora Casio fx-991", category: "electronica", condition: "usado", state: "disponible", owner: 1 },
    { title: "Física universitaria – Sears", category: "libros", condition: "usado", state: "intercambiado", owner: 2 },
    { title: "Audífonos Sony WH-CH520", category: "electronica", condition: "nuevo", state: "reservado", owner: 0 },
    { title: "Chaqueta de la facultad", category: "ropa", condition: "usado", state: "disponible", owner: 1 },
    { title: "Mochila Totto", category: "otros", condition: "usado", state: "intercambiado", owner: 2 },
    { title: "Química general – Chang", category: "libros", condition: "nuevo", state: "disponible", owner: 0 },
    { title: "Álgebra lineal – Grossman", category: "libros", condition: "usado", state: "disponible", owner: 1 },
    { title: "Mouse Logitech M170", category: "electronica", condition: "usado", state: "reservado", owner: 2 },
    { title: "Bata de laboratorio", category: "ropa", condition: "usado", state: "intercambiado", owner: 0 },
];

const activities = [
    { user: 0, type: "reservado", post: "Mouse Logitech M170", other: 2, createdAt: "2026-10-08T10:20:00" },
    { user: 0, type: "reservado", post: "Física universitaria – Sears", other: 2, createdAt: "2026-10-10T16:05:00" },
    { user: 0, type: "intercambio_completado", role: "receptor", post: "Física universitaria – Sears", other: 2, createdAt: "2026-10-13T12:30:00" },
    { user: 0, type: "reserva_liberada", post: "Calculadora Casio fx-991", other: 1, createdAt: "2026-10-15T09:45:00" },
    { user: 0, type: "intercambio_completado", role: "entregador", post: "Bata de laboratorio", other: 1, createdAt: "2026-10-18T11:40:00" },
    { user: 1, type: "reservado", post: "Apuntes de cálculo integral", other: 0, createdAt: "2026-10-12T14:10:00" },
    { user: 1, type: "reservado", post: "Audífonos Sony WH-CH520", other: 0, createdAt: "2026-10-16T18:25:00" },
    { user: 1, type: "intercambio_completado", role: "receptor", post: "Bata de laboratorio", other: 0, createdAt: "2026-10-18T11:40:00" },
    { user: 0, type: "oferta_enviada", post: "Calculadora Casio fx-991", other: 1, createdAt: "2026-10-27T09:15:00" },
    { user: 2, type: "oferta_enviada", post: "Calculadora Casio fx-991", other: 1, createdAt: "2026-10-28T15:30:00" },
];

// Ofertas pendientes por la calculadora de Admin Demo (usuario 1)
const offers = [
    {
        proposer: 0,
        target: "Calculadora Casio fx-991",
        offered: "Química general – Chang",
        message: "Te cambio mi libro de Química, está casi nuevo.",
        createdAt: "2026-10-27T09:15:00",
    },
    {
        proposer: 2,
        target: "Calculadora Casio fx-991",
        offered: null,
        message: "¿La cambias por unos apuntes de clase?",
        createdAt: "2026-10-28T15:30:00",
    },
];

async function run() {
    try {
        console.log("Iniciando conexión con SQLite...");
        await sequelize.sync({ force: true });

        const password = await bcrypt.hash("Password123!", 10);

        console.log("Insertando usuarios semilla...");
        const createdUsers = [];
        for (const data of users) {
            const [user, created] = await User.findOrCreate({
                where: { email: data.email },
                defaults: { ...data, password },
            });
            createdUsers.push(user);
            console.log(
                created
                    ? `+ Creado: "${user.name}", "${user.email}"`
                    : `~ Ya existía: ${user.email}`,
            );
        }

        console.log("Insertando publicaciones semilla...");
        const createdPosts = {};
        for (const data of posts) {
            const owner = createdUsers[data.owner];
            const reserver = createdUsers[(data.owner + 1) % createdUsers.length];
            const post = await Post.create({
                title: data.title,
                category: data.category,
                condition: data.condition,
                state: data.state,
                userId: owner.id,
                reservedById: data.state === "reservado" ? reserver.id : null,
            });
            createdPosts[post.title] = post;
            console.log(`+ Publicación: "${post.title}" (${post.state}) de ${owner.name}`);
        }

        console.log("Insertando historial de actividad semilla...");
        for (const data of activities) {
            await Activity.create({
                userId: createdUsers[data.user].id,
                type: data.type,
                role: data.role || null,
                postId: createdPosts[data.post].id,
                postTitle: data.post,
                otherUserName: createdUsers[data.other].name,
                createdAt: new Date(data.createdAt),
            });
        }
        console.log(`+ ${activities.length} eventos de actividad`);

        console.log("Insertando ofertas semilla...");
        for (const data of offers) {
            await Offer.create({
                targetPostId: createdPosts[data.target].id,
                offeredPostId: data.offered ? createdPosts[data.offered].id : null,
                proposerId: createdUsers[data.proposer].id,
                message: data.message,
                createdAt: new Date(data.createdAt),
            });
        }
        console.log(`+ ${offers.length} ofertas pendientes`);

        console.log("Carga de datos inicial completada.");
        process.exit(0);
    } catch (error) {
        console.error("Error al ejecutar el sembrado de datos:", error);
        process.exit(1);
    }
}

run();
