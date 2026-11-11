import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

import LoginView from "@/views/LoginView.vue";
import RegisterView from "@/views/RegisterView.vue";
import RecoverView from "@/views/RecoverView.vue";

import UserPostsView from "@/views/UserPostsView.vue";
import DashboardView from "@/views/DashboardView.vue";
import HistoryView from "@/views/HistoryView.vue";
import AnalyticsView from "@/views/AnalyticsView.vue";

import AuthLayout from "@/layouts/AuthLayout.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  routes: [
    {
      path: "/login",
      name: "login",
      component: LoginView,
    },

    {
      path: "/register",
      name: "register",
      component: RegisterView,
    },

    {
      path: "/recover",
      name: "recover",
      component: RecoverView,
    },

    {
      path: "/analitics",
      alias: ["/analitica", "/analytics"],
      name: "analytics",
      component: AnalyticsView,
    },

    {
      path: "/",
      component: AuthLayout,
      meta: {
        requiresAuth: true,
      },

      children: [
        { path: "", redirect: { name: "dashboard" } },
        {
          path: "dashboard",
          name: "dashboard",
          component: DashboardView,
        },

        {
          path: "posts",
          name: "posts",
          component: UserPostsView,
        },

        {
          path: "history",
          name: "history",
          component: HistoryView,
        },
      ],
    },
  ],
});

router.beforeEach((to) => {
  const auth = useAuthStore();

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return {
      name: "login",
    };
  }

  if (to.name === "login" && auth.isAuthenticated) {
    return {
      name: "dashboard",
    };
  }

  if (to.name === "register" && auth.isAuthenticated) {
    return {
      name: "dashboard",
    };
  }
});

export default router;
