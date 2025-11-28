/**
 * Karaoke Composer - Router Configuration
 *
 * Vue Router setup with lazy-loaded views for code splitting
 */

import { createRouter, createWebHashHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/HomeView.vue'),
  },
  {
    path: '/editor',
    name: 'Editor',
    component: () => import('../views/EditorView.vue'),
  },
  {
    path: '/playlist',
    name: 'Playlist',
    component: () => import('../views/PlaylistView.vue'),
  },
  {
    path: '/export',
    name: 'Export',
    component: () => import('../views/ExportView.vue'),
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/SettingsView.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFoundView.vue'),
  },
];

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;

// VIM: set ft=typescript :
// END
