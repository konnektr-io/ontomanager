import { ref } from 'vue'
import { defineStore } from 'pinia'
import { set as gtagSet } from 'vue-gtag'
import githubService from '@/services/GitHubService'

export const useGitHubStore = defineStore('github', () => {
  const isSignedIn = ref(false)
  const username = ref<string | null>(null)
  const name = ref<string | null>(null)
  const avatarUrl = ref<string | null>(null)

  const loginToGitHub = () => {
    githubService.loginToGitHub()
  }

  const handleGitHubCallback = async (code: string) => {
    try {
      const tokenData = await githubService.exchangeCodeForToken(code)
      const user = await githubService.authenticate(tokenData.access_token)

      isSignedIn.value = true
      username.value = user.login
      name.value = user.name || user.login
      avatarUrl.value = user.avatar_url

      return user
    } catch (error) {
      console.error('Error during GitHub OAuth callback', error)
    }
    return null
  }

  const silentLogin = async () => {
    const user = await githubService.silentLogin()
    if (user) {
      isSignedIn.value = true
      username.value = user.login
      name.value = user.name || user.login
      avatarUrl.value = user.avatar_url
      gtagSet({ user_id: user.login })
    }
  }

  return {
    isSignedIn,
    username,
    name,
    avatarUrl,
    loginToGitHub,
    handleGitHubCallback,
    silentLogin
  }
})
