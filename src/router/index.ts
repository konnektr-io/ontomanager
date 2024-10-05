import { createRouter, createWebHistory } from 'vue-router'
import OntologyManagerView from '../views/OntologyManagerView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'ontology',
      component: OntologyManagerView
    }
  ]
})

export default router
