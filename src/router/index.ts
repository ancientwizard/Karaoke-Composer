import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/compose',
      name: 'compose',
      // Route level code-splitting for better performance
      component: () => import('@/views/ComposeView.vue')
    },
    {
      path: '/timing/:projectId',
      name: 'timing',
      component: () => import('@/views/TimingView.vue'),
      props: true
    },
    {
      path: '/library',
      name: 'library',
      component: () => import('@/views/LibraryView.vue')
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('@/views/AboutView.vue')
    },
    {
      path: '/test-timing',
      name: 'test-timing',
      component: () => import('@/views/TestTimingView.vue')
    }
  ]
})

export default router