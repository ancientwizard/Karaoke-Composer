/**
 * Karaoke Composer - Main Application Entry Point
 *
 * Vue 3 application bootstrap with Router and Bootstrap CSS framework
 */

import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

const app = createApp(App);

app.use(router);
app.mount('#app');

// VIM: set ft=typescript :
// END
