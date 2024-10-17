<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import Avatar from 'primevue/avatar'
import Menu from 'primevue/menu'
import githubService from '@/services/GitHubService'

const isSignedIn = ref(false)
const username = ref<string | null>(null)
const name = ref<string | null>(null)
const avatarUrl = ref<string | null>(null)
const signOut = () => {
  isSignedIn.value = false
  username.value = ''
}

const router = useRouter()
const menu = ref<InstanceType<typeof Menu>>()

const menuItems = computed(() => [
  {
    label: 'GitHub account',
    items: [
      {
        label: 'Sign in',
        icon: 'pi pi-sign-in',
        command: loginToGitHub,
        visible: !isSignedIn.value
      },
      {
        label: `${name.value}`,
        visible: !!(isSignedIn.value && name.value),
        class: "text-sm"
      },
      {
        label: 'Sign out',
        icon: 'pi pi-sign-out',
        command: signOut,
        visible: isSignedIn.value
      }
    ]
  }
])

const loginToGitHub = async () => {
  localStorage.removeItem('githubToken')
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
      const response = await axios.post('/api/github/oauth/token', new URLSearchParams({ code }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })

      const data = response.data
      const token = data.access_token
      // TODO: store entire object in localStorage
      // as well as the absolute expiry time of access and refresh tokens (maybe in the same object)

      if (token) {
        localStorage.setItem('githubToken', token)
        await githubService.authenticate(token)
        const user = await githubService.getUser()
        isSignedIn.value = true
        username.value = user.login
        name.value = user.name || user.login


        // If a state param is provided, redirect to it
        const stateParam = urlParams.get('state')
        if (stateParam) {
          router.replace(stateParam)
        } else {
          router.replace('/')
        }

        return true
      }
    } catch (error) {
      console.error('Error during GitHub OAuth callback', error)
      return false
    }
  }


  return false
}

onMounted(() => {
  if (!handleGitHubCallback()) {
    // TODO: get entire object, including absolute expiry of access and refresh tokens
    // If the access token is expired, use the refresh token to get a new one /api/github/oauth/refresh_token
    // If the refresh token is expired, don't do anything
    const token = localStorage.getItem('githubToken')
    if (token) {
      githubService.authenticate(token).then(async () => {
        const user = await githubService.getUser()
        isSignedIn.value = true
        username.value = user.login
        name.value = user.name || user.login
        avatarUrl.value = user.avatar_url
      })
    }
  }
})

</script>
<template>
  <div class="flex items-center">
    <Avatar
      :image="isSignedIn && avatarUrl ? avatarUrl : undefined"
      :icon="!isSignedIn || !avatarUrl ? 'pi pi-user' : undefined"
      shape="circle"
      aria-haspopup="true"
      aria-controls="overlay_menu"
      class="cursor-pointer"
      @click="menu?.toggle"
    >
    </Avatar>
    <Menu
      ref="menu"
      id="overlay_menu"
      :model="menuItems"
      popup
    />
  </div>
</template>
