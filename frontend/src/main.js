import "./assets/main.css";
import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import router from "./router";
import { iniciarGoogleAnalytics } from "./utils/analitica";

const app = createApp(App);

app.use(createPinia());
app.use(router);

iniciarGoogleAnalytics();

app.mount("#app");
