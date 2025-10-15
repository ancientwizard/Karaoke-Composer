import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import router from './router'

// Import Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css'
// Import Bootstrap Icons CSS
import 'bootstrap-icons/font/bootstrap-icons.css'
// Import Bootstrap JavaScript
import 'bootstrap'

const app = createApp(App)

app.use(router)

app.mount('#app')
