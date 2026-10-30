<script setup>
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import logo from "@/assets/logo.png";

const auth = useAuthStore();
const router = useRouter();

async function logout() {
    await auth.logout();
    router.push({ name: "login" });
}
</script>

<template>
    <div class="navbar border-b border-base-200 bg-base-100 px-4">
        <div class="mx-auto flex w-full max-w-7xl items-center justify-between">


            <div class="flex-none">
                <RouterLink :to="{ name: 'dashboard' }" class="btn btn-ghost px-2 normal-case">
                    <img :src="logo" alt="Logo" class="h-8 w-auto" />
                </RouterLink>
            </div>

            <div class="flex items-center gap-4">
                <ul class="menu menu-horizontal gap-1 px-1">
                    <li>
                        <RouterLink :to="{ name: 'dashboard' }" exact-active-class="active font-medium">
                            Explorar
                        </RouterLink>
                    </li>
                    <li>
                        <RouterLink :to="{ name: 'posts' }" exact-active-class="active font-medium">
                            Mis publicaciones
                        </RouterLink>
                    </li>
                    <li>
                        <RouterLink :to="{ name: 'history' }" exact-active-class="active font-medium">
                            Historial
                        </RouterLink>
                    </li>
                </ul>

                <button @click="logout" class="btn btn-error btn-sm text-white">
                    Cerrar sesión
                </button>
            </div>

        </div>
    </div>
</template>