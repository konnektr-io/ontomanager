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
  if (githubStore.isSignedIn) {
    next()
  } else {
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    if (code) {
      const user = await githubStore.handleGitHubCallback(code)
      if (!user) next()
      else {
        const stateParam = urlParams.get('state')
        if (stateParam) next(stateParam)
        else next()
      }
    } else {
      githubStore.silentLogin()
      next()
    }
  }
})

export default router
