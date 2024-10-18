import { ref } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'
import githubService from '@/services/GitHubService'
import type { Router } from 'vue-router'

export const useGitHubStore = defineStore('github', () => {
  // Will be set in main.ts
  const router = ref<Router | null>(null)

  const isSignedIn = ref(false)
  const username = ref<string | null>(null)
  const name = ref<string | null>(null)
  const avatarUrl = ref<string | null>(null)

  const loginToGitHub = async () => {
    localStorage.removeItem('githubTokenData')
    const redirectUri = `${window.location.origin}`
    const state = encodeURIComponent(window.location.pathname + window.location.hash)
    const githubAuthUrl = `/api/github/oauth/login?redirect_uri=${redirectUri}&state=${state}`
    window.location.href = githubAuthUrl
  }

  const handleGitHubCallback = async () => {
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')

    if (code) {
      try {
        const response = await axios.post(
          '/api/github/oauth/token',
          new URLSearchParams({ code }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        )

        const data = response.data
        githubService.saveTokenData(data)

        const user = await githubService.authenticate(data.access_token)
        isSignedIn.value = true
        username.value = user.login
        name.value = user.name || user.login
        avatarUrl.value = user.avatar_url

        const stateParam = urlParams.get('state')
        if (stateParam && router.value) {
          router.value.replace(stateParam)
        } else if (router.value) {
          router.value.replace('/')
        }

        return true
      } catch (error) {
        console.error('Error during GitHub OAuth callback', error)
        return false
      }
    }

    return false
  }

  const silentLogin = async () => {
    const user = await githubService.silentLogin()
    if (user) {
      isSignedIn.value = true
      username.value = user.login
      name.value = user.name || user.login
      avatarUrl.value = user.avatar_url
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
