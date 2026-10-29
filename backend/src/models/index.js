const sequelize = require("../database/db");
const User = require("./User");
const Post = require("./Post");
const Activity = require("./Activity");
const Offer = require("./Offer");

User.hasMany(Post, { foreignKey: "userId" });
Post.belongsTo(User, { foreignKey: "userId", as: "owner" });
Post.belongsTo(User, { foreignKey: "reservedById", as: "reservedBy" });

User.hasMany(Activity, { foreignKey: "userId" });
Activity.belongsTo(User, { foreignKey: "userId" });
Activity.belongsTo(Post, { foreignKey: "postId", constraints: false });

// Oferta: por qué publicación, qué producto ofrece (opcional) y quién la envía.
// Si se elimina la publicación, sus ofertas se eliminan; si se elimina el producto ofrecido, queda sin producto.
Offer.belongsTo(Post, {
    foreignKey: { name: "targetPostId", allowNull: false },
    as: "targetPost",
    onDelete: "CASCADE",
});
Offer.belongsTo(Post, {
    foreignKey: "offeredPostId",
    as: "offeredPost",
    onDelete: "SET NULL",
});
Offer.belongsTo(User, {
    foreignKey: { name: "proposerId", allowNull: false },
    as: "proposer",
    onDelete: "CASCADE",
});

module.exports = { sequelize, User, Post, Activity, Offer };
