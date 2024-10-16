<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import axios from 'axios';
import Avatar from 'primevue/avatar';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Menu from 'primevue/menu';
import githubService from '@/services/GitHubService';


const pat = ref('')

const isSignedIn = ref(false)
const username = ref<string | null>(null)
const name = ref<string | null>(null)
const avatarUrl = ref<string | null>(null)
const signOut = () => {
  isSignedIn.value = false
  username.value = ''
}
const rememberMe = ref(false);

const saveChanges = async () => {
  try {
    const result = await githubService.authenticate(pat.value);
    if (result) {
      isSignedIn.value = true;
      username.value = result.login;
      name.value = result.name || result.login;
      avatarUrl.value = result.avatar_url;

      if (rememberMe.value) {
        localStorage.setItem('githubToken', btoa(pat.value));
      }

      dialogVisible.value = false
    } else {
      // Handle authentication failure
      console.error('Authentication failed');
    }
  } catch (error) {
    console.error('Error during authentication', error);
  }
};

const loadToken = () => {
  const token = localStorage.getItem('githubToken');
  if (token) {
    pat.value = atob(token);
    saveChanges();
    isSignedIn.value = true;
  }
};


const menu = ref<typeof Menu>();
const dialogVisible = ref(false);

const menuItems = computed(() => [
  {
    label: 'GitHub account',
    items: [
      {
        label: 'Sign in',
        icon: 'pi pi-sign-in',
        command: () => redirectToGitHub(),
        visible: !isSignedIn.value
      },
      {
        label: name.value,
        visible: isSignedIn.value && name.value,
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
]);

const redirectToGitHub = () => {
  localStorage.removeItem('githubToken');
  const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
  const redirectUri = `${window.location.origin}`;
  const state = encodeURIComponent(window.location.pathname);
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}`;
  window.location.href = githubAuthUrl;
};

const handleGitHubCallback = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');

  if (code) {
    try {
      const response = await axios.post('/api/github/oauth/exchange', new URLSearchParams({ code }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const data = response.data;
      const token = data.access_token;

      if (token) {
        localStorage.setItem('githubToken', token);
        await githubService.authenticate(token);
        const user = await githubService.getUser();
        isSignedIn.value = true;
        username.value = user.login;
        name.value = user.name || user.login;
        avatarUrl.value = user.avatar_url;
      }
    } catch (error) {
      console.error('Error during GitHub OAuth callback', error);
    }
  }
};

onMounted(() => {
  const token = localStorage.getItem('githubToken');
  if (token) {
    githubService.authenticate(token).then(async () => {
      const user = await githubService.getUser();
      isSignedIn.value = true;
      username.value = user.login;
      name.value = user.name || user.login;
      avatarUrl.value = user.avatar_url;
    });
  } else {
    handleGitHubCallback();
  }
});

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
