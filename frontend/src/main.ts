import { createApp } from 'vue'
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import { createGtag } from "vue-gtag";
import './style.css'

const app = createApp(App);

app.use(createPinia());
app.use(router);

// Configure Google Analytics with manual bootstrap control
app.use(
  createGtag({
    tagId: import.meta.env.VITE_GA_MEASUREMENT_ID || "",
    config: {
      send_page_view: false, // Manual page view tracking
    },
    initMode: "manual", // Manual initialization for cookie consent
  })
);

app.mount("#app");
