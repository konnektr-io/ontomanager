import { createRouter, createWebHistory } from 'vue-router'
import { useGitHubStore } from '@/stores/github'
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

router.beforeEach(async (to, from, next) => {
  const githubStore = useGitHubStore()
  if (!githubStore.isSignedIn && !(await githubStore.handleGitHubCallback())) {
    await githubStore.silentLogin()
  }
  next()
})

export default router
