<script setup>
import { computed, onMounted } from "vue";
import { useAuthStore } from "@/stores/auth";
import PageTitle from "@/components/PageTitle.vue";

const authStore = useAuthStore();

// Pide el perfil al backend para tener el promedio y la cantidad al día
onMounted(() => authStore.getProfile());

const calificaciones = computed(() => authStore.user?.calificaciones || { promedio: 0, cantidad: 0 });
</script>

<template>
    <div class="mx-auto max-w-3xl p-6">
        <PageTitle title="Perfil" subtitle="Tus datos y las calificaciones que recibiste" />

        <div class="card bg-base-100 shadow-sm border border-base-300 mt-6 p-6">
            <p class="text-lg font-semibold">{{ authStore.user?.name }}</p>
            <p class="text-sm text-base-content/60">{{ authStore.user?.email }}</p>

            <div class="mt-4 flex gap-8">
                <div>
                    <p class="text-sm text-base-content/60">Promedio</p>
                    <p class="text-3xl font-bold" data-testid="promedio">
                        {{ calificaciones.cantidad > 0 ? calificaciones.promedio : "-" }}
                    </p>
                </div>
                <div>
                    <p class="text-sm text-base-content/60">Calificaciones</p>
                    <p class="text-3xl font-bold" data-testid="cantidad">{{ calificaciones.cantidad }}</p>
                </div>
            </div>
        </div>
    </div>
</template>
