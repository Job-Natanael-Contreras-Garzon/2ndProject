<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useCuentaStore } from "@/stores/cuenta";
import { track } from "@/utils/analitica";
import Modal from "@/components/Modal.vue";
import PageTitle from "@/components/PageTitle.vue";

const auth = useAuthStore();
const cuenta = useCuentaStore();
const router = useRouter();

const datos = ref(null);
const cargando = ref(true);
const errorCarga = ref("");

const mostrarEliminar = ref(false);
const eliminando = ref(false);
const errorEliminar = ref("");

onMounted(async () => {
    try {
        datos.value = await cuenta.verMisDatos();
    } catch (err) {
        errorCarga.value = err.message;
    } finally {
        cargando.value = false;
    }
});

// Cuántos datos hay de cada tipo
const resumen = computed(() => {
    if (!datos.value) return [];
    return [
        { clave: "publicaciones", texto: "Publicaciones", cantidad: datos.value.publicaciones.length },
        { clave: "ofertas", texto: "Ofertas enviadas", cantidad: datos.value.ofertas.length },
        { clave: "actividad", texto: "Movimientos en el historial", cantidad: datos.value.actividad.length },
        { clave: "recibidas", texto: "Calificaciones recibidas", cantidad: datos.value.calificaciones.recibidas.length },
        { clave: "dadas", texto: "Calificaciones dadas", cantidad: datos.value.calificaciones.dadas.length },
    ];
});

function fecha(valor) {
    return new Date(valor).toLocaleDateString();
}

// Descarga los mismos datos que se ven en pantalla, en un archivo JSON
function descargar() {
    const archivo = new Blob([JSON.stringify(datos.value, null, 2)], { type: "application/json" });
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(archivo);
    enlace.download = "mis-datos-trueque-u.json";
    enlace.click();
    URL.revokeObjectURL(enlace.href);
}

function abrirEliminar() {
    errorEliminar.value = "";
    mostrarEliminar.value = true;
    track("cuenta_eliminacion_iniciada");
}

async function eliminarCuenta() {
    errorEliminar.value = "";
    eliminando.value = true;

    try {
        await cuenta.eliminarCuenta();
        track("cuenta_eliminada");
        auth.logout();
        router.push({ name: "login" });
    } catch (err) {
        if (err.bloqueada) {
            track("cuenta_eliminacion_bloqueada", { motivo: "intercambio_en_curso" });
        }
        errorEliminar.value = err.message;
    } finally {
        eliminando.value = false;
    }
}
</script>

<template>
    <div class="mx-auto max-w-3xl p-6">
        <PageTitle title="Mis datos" subtitle="Lo que Trueque U guarda sobre ti" />

        <div v-if="cargando" class="mt-6 text-sm text-base-content/60">Cargando tus datos...</div>
        <div v-else-if="errorCarga" role="alert" class="alert alert-error mt-6 text-sm">{{ errorCarga }}</div>

        <template v-else>
            <div class="card bg-base-100 shadow-sm border border-base-300 mt-6 p-6">
                <h2 class="text-lg font-semibold">Tu cuenta</h2>
                <p class="mt-2">{{ datos.usuario.nombre }}</p>
                <p class="text-sm text-base-content/60">{{ datos.usuario.correo }}</p>
                <p class="text-sm text-base-content/60">Registrada el {{ fecha(datos.usuario.registradoEn) }}</p>

                <ul class="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <li v-for="fila in resumen" :key="fila.clave" class="flex justify-between text-sm">
                        <span>{{ fila.texto }}</span>
                        <span class="font-semibold" :data-testid="`cantidad-${fila.clave}`">{{ fila.cantidad }}</span>
                    </li>
                </ul>

                <details class="mt-4">
                    <summary class="cursor-pointer text-sm font-medium">Ver todos mis datos</summary>
                    <pre class="mt-2 max-h-80 overflow-auto rounded bg-base-200 p-3 text-xs"
                        data-testid="datos-json">{{ JSON.stringify(datos, null, 2) }}</pre>
                </details>

                <div class="mt-4">
                    <button type="button" @click="descargar" class="btn btn-outline">Descargar mis datos (JSON)</button>
                </div>
            </div>

            <div class="card bg-base-100 shadow-sm border border-base-300 mt-6 p-6">
                <h2 class="text-lg font-semibold">Eliminar mi cuenta</h2>
                <p class="mt-2 text-sm text-base-content/70">
                    Borra tu cuenta y tus datos de forma permanente. Si quieres conservarlos, descárgalos antes.
                </p>
                <div class="mt-4">
                    <button type="button" @click="abrirEliminar" class="btn btn-outline">Eliminar mi cuenta</button>
                </div>
            </div>
        </template>

        <Modal v-model="mostrarEliminar" title="Eliminar mi cuenta">
            <p class="text-sm text-base-content/70">
                Se borrarán de forma permanente tu cuenta, tus publicaciones, tus ofertas y las que recibiste en tus
                publicaciones, tus calificaciones y tu historial. No se puede deshacer.
            </p>
            <p class="mt-2 text-sm text-base-content/70">
                Después ya no podrás iniciar sesión con esta cuenta, pero puedes crear una nueva cuando quieras. Tu
                nombre puede seguir apareciendo en el historial de las personas con las que intercambiaste.
            </p>
            <p class="mt-2 text-sm text-base-content/70">
                Si tienes un intercambio en curso, primero tienes que completarlo o cancelarlo.
            </p>

            <div v-if="errorEliminar" role="alert" class="alert alert-error mt-3 text-sm py-2 px-3">
                <span>{{ errorEliminar }}</span>
            </div>

            <div class="modal-action mt-4">
                <button type="button" @click="mostrarEliminar = false" :disabled="eliminando"
                    class="btn btn-outline">Volver</button>
                <button type="button" @click="eliminarCuenta" :disabled="eliminando"
                    class="btn btn-outline">Eliminar mi cuenta</button>
            </div>
        </Modal>
    </div>
</template>
