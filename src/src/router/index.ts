import { createRouter, createWebHistory } from 'vue-router'
import TheOntologyManagerView from '../views/TheOntologyManagerView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'ontology',
      component: TheOntologyManagerView
    }
  ]
})

export default router
