// Regla de la cuenta: no se puede eliminar con un intercambio en curso (publicación reservada).
// Devuelve el mensaje de error, o null si se puede eliminar.
function getEliminarCuentaError(intercambiosEnCurso) {
    if (intercambiosEnCurso.length === 0) {
        return null;
    }

    const titulos = intercambiosEnCurso.map((post) => `«${post.title}»`).join(", ");
    return `No se eliminó tu cuenta porque tienes un intercambio en curso: ${titulos}. Complétalo o cancélalo y vuelve a intentarlo.`;
}

module.exports = { getEliminarCuentaError };
