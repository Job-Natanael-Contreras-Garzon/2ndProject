<script setup>
import { ref, onMounted } from "vue";
import { RouterLink } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import logo from "@/assets/logo.png";

const API_URL = import.meta.env?.VITE_API_URL || "http://localhost:3000/api";

const authStore = useAuthStore();
const loading = ref(false);
const error = ref("");
const resumen = ref({
    iniciadas: 0,
    guardadas: 0,
    tasaFinalizacion: 0,
    total: 0,
    conteoPorEvento: {},
});
const ultimosEventos = ref([]);

async function fetchResumen() {
    loading.value = true;
    error.value = "";
    try {
        const res = await fetch(`${API_URL}/eventos/resumen`);
        if (!res.ok) {
            throw new Error(`Error en el servidor (${res.status})`);
        }
        const data = await res.json();
        resumen.value = data.resumen || {
            iniciadas: 0,
            guardadas: 0,
            tasaFinalizacion: 0,
            total: 0,
            conteoPorEvento: {},
        };
        ultimosEventos.value = data.ultimosEventos || [];
    } catch (err) {
        error.value = err.message || "No se pudo cargar la analítica";
    } finally {
        loading.value = false;
    }
}

function formatDate(isoString) {
    if (!isoString) return "-";
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return isoString;
        return date.toLocaleString("es-ES", {
            dateStyle: "short",
            timeStyle: "medium",
        });
    } catch {
        return isoString;
    }
}

function formatProps(props) {
    if (!props || (typeof props === "object" && Object.keys(props).length === 0)) return "-";
    if (typeof props === "string") return props.trim() || "-";
    const formatted = JSON.stringify(props, null, 1).replace(/[\{\}"]/g, "").trim();
    return formatted || "-";
}

function getBadgeClass(evento) {
    if (evento === "publicacion_guardada") return "badge-success text-white";
    if (evento === "publicacion_iniciada") return "badge-info text-white";
    return "badge-neutral";
}

onMounted(() => {
    fetchResumen();
});
</script>

<template>
    <div class="min-h-screen bg-base-100 flex flex-col">
        <!-- Barra de navegación pública -->
        <header class="border-b border-base-200 bg-base-100 px-6 py-4">
            <div class="mx-auto flex max-w-6xl items-center justify-between">
                <div class="flex items-center gap-3">
                    <img :src="logo" alt="Trueque U" class="h-8 w-auto" />
                    <span class="text-xl font-bold tracking-tight">Trueque U</span>
                    <span class="badge badge-outline badge-sm ml-2">Analítica</span>
                </div>
                <div class="flex items-center gap-2">
                    <button
                        @click="fetchResumen"
                        class="btn btn-outline btn-sm gap-1"
                        :disabled="loading"
                        title="Actualizar datos"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-4 w-4"
                            :class="{ 'animate-spin': loading }"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                        Actualizar
                    </button>
                    <template v-if="authStore?.isAuthenticated">
                        <RouterLink :to="{ name: 'dashboard' }" class="btn btn-ghost btn-sm">
                            Explorar
                        </RouterLink>
                        <RouterLink :to="{ name: 'posts' }" class="btn btn-primary btn-sm">
                            Mis publicaciones
                        </RouterLink>
                    </template>
                    <template v-else>
                        <RouterLink :to="{ name: 'login' }" class="btn btn-primary btn-sm">
                            Iniciar sesión
                        </RouterLink>
                    </template>
                </div>
            </div>
        </header>

        <!-- Contenido principal -->
        <main class="mx-auto w-full max-w-6xl flex-1 p-6 space-y-6">
            <!-- Título y descripción -->
            <div>
                <h1 class="text-3xl font-bold text-base-content">Panel de Analítica</h1>
                <p class="text-base-content/70 mt-1">
                    Métricas del embudo de publicación: desde la apertura del formulario hasta el guardado exitoso.
                </p>
            </div>

            <!-- Alerta de error -->
            <div v-if="error" role="alert" class="alert alert-error shadow-sm flex justify-between">
                <span>{{ error }}</span>
                <button @click="fetchResumen" class="btn btn-sm btn-ghost">Reintentar</button>
            </div>

            <!-- Tarjetas de métricas -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="card bg-base-200 border border-base-300 shadow-sm p-4">
                    <div class="text-xs uppercase font-semibold text-base-content/60 tracking-wider">
                        📌 Publicaciones Iniciadas
                    </div>
                    <div class="text-3xl font-extrabold text-info mt-2">
                        {{ resumen.iniciadas }}
                    </div>
                    <p class="text-xs text-base-content/50 mt-1">
                        Clics en "+ Nueva publicación"
                    </p>
                </div>

                <div class="card bg-base-200 border border-base-300 shadow-sm p-4">
                    <div class="text-xs uppercase font-semibold text-base-content/60 tracking-wider">
                        🚀 Publicaciones Guardadas
                    </div>
                    <div class="text-3xl font-extrabold text-success mt-2">
                        {{ resumen.guardadas }}
                    </div>
                    <p class="text-xs text-base-content/50 mt-1">
                        Publicaciones creadas con éxito
                    </p>
                </div>

                <div class="card bg-base-200 border border-base-300 shadow-sm p-4">
                    <div class="text-xs uppercase font-semibold text-base-content/60 tracking-wider">
                        📈 Tasa de Finalización
                    </div>
                    <div class="text-3xl font-extrabold text-primary mt-2">
                        {{ resumen.tasaFinalizacion }}%
                    </div>
                    <div class="w-full bg-base-300 rounded-full h-2 mt-2 overflow-hidden">
                        <div
                            class="bg-primary h-2 rounded-full transition-all duration-500"
                            :style="{ width: Math.min(resumen.tasaFinalizacion, 100) + '%' }"
                        ></div>
                    </div>
                </div>

                <div class="card bg-base-200 border border-base-300 shadow-sm p-4">
                    <div class="text-xs uppercase font-semibold text-base-content/60 tracking-wider">
                        📊 Total Eventos
                    </div>
                    <div class="text-3xl font-extrabold text-base-content mt-2">
                        {{ resumen.total }}
                    </div>
                    <p class="text-xs text-base-content/50 mt-1">
                        Registros en tabla SQLite
                    </p>
                </div>
            </div>

            <!-- Tabla de últimos eventos -->
            <div class="card bg-base-200 border border-base-300 shadow-sm">
                <div class="p-4 border-b border-base-300 flex items-center justify-between">
                    <div>
                        <h2 class="text-lg font-bold text-base-content">Últimos Eventos Registrados</h2>
                        <p class="text-xs text-base-content/60">
                            Historial reciente sin datos personales (PII protegida)
                        </p>
                    </div>
                    <span class="badge badge-neutral badge-sm">Máx. 20 registros</span>
                </div>

                <div class="overflow-x-auto">
                    <table class="table w-full">
                        <thead>
                            <tr class="text-base-content/70">
                                <th class="w-16">#</th>
                                <th>Evento</th>
                                <th>Propiedades mínimas</th>
                                <th>Fecha (ISO / Local)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="loading && ultimosEventos.length === 0">
                                <td colspan="4" class="text-center py-8">
                                    <span class="loading loading-spinner loading-md text-primary"></span>
                                    <p class="text-xs text-base-content/60 mt-2">Cargando eventos...</p>
                                </td>
                            </tr>
                            <tr v-else-if="ultimosEventos.length === 0">
                                <td colspan="4" class="text-center py-8 text-base-content/50 italic">
                                    No hay eventos registrados aún. Inicia el flujo de publicación para ver métricas aquí.
                                </td>
                            </tr>
                            <tr v-for="ev in ultimosEventos" :key="ev.id" class="hover">
                                <td class="font-mono text-xs opacity-60">{{ ev.id }}</td>
                                <td>
                                    <span class="badge font-mono text-xs" :class="getBadgeClass(ev.evento)">
                                        {{ ev.evento }}
                                    </span>
                                </td>
                                <td>
                                    <span v-if="formatProps(ev.props) === '-'" class="text-xs opacity-40 font-mono">-</span>
                                    <code v-else class="bg-base-300 px-2 py-0.5 rounded text-xs font-mono">
                                        {{ formatProps(ev.props) }}
                                    </code>
                                </td>
                                <td class="text-xs opacity-75 whitespace-nowrap">
                                    {{ formatDate(ev.fecha) }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    </div>
</template>
