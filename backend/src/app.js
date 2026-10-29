const express = require("express");
const cors = require("cors");
const { port } = require("./database/config");
const { sequelize } = require("./models");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", require("./routes/auth.routes"));
app.use("/api", require("./routes/post.routes"));
app.use("/api", require("./routes/offer.routes"));
app.use("/api", require("./routes/activity.routes"));

app.use(errorHandler);

async function start() {
    try {
        await sequelize.sync();
        console.log("Base de datos SQLite sincronizada exitosamente");
        app.listen(port, () => {
            console.log(`Servidor activo en: http://localhost:${port}`);
        });
    } catch (error) {
        console.error("Error al inicializar la base de datos o el servidor:", error);
    }
}

start();
