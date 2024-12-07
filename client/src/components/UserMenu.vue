<script setup lang="ts">
import { computed, ref } from 'vue'
import Avatar from 'primevue/avatar'
import Menu from 'primevue/menu'
import { useGitHubStore } from '@/stores/github'

const githubStore = useGitHubStore()
const menu = ref<InstanceType<typeof Menu>>()

const menuItems = computed(() => [
  {
    label: 'GitHub account',
    items: [
      {
        label: 'Sign in',
        icon: 'pi pi-sign-in',
        command: githubStore.loginToGitHub,
        visible: !githubStore.isSignedIn
      },
      {
        label: `${githubStore.name}`,
        visible: !!(githubStore.isSignedIn && githubStore.name),
        class: "text-sm"
      },
      {
        label: 'Sign out',
        icon: 'pi pi-sign-out',
        command: () => {
          githubStore.isSignedIn = false
          githubStore.username = null
          githubStore.name = null
          githubStore.avatarUrl = null
          localStorage.removeItem('githubTokenData')
        },
        visible: githubStore.isSignedIn
      }
    ]
  }
])

</script>
<template>
  <div class="flex items-center">
    <Avatar
      :image="githubStore.isSignedIn && githubStore.avatarUrl ? githubStore.avatarUrl : undefined"
      :icon="!githubStore.isSignedIn || !githubStore.avatarUrl ? 'pi pi-user' : undefined"
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
