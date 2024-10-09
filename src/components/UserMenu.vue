<script setup lang="ts">
import { onMounted, ref } from 'vue';
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
  }
};


const menu = ref<typeof Menu>();
const dialogVisible = ref(false);

const menuItems = ref([
  {
    label: 'GitHub account',
    items: [
      {
        label: 'Sign in',
        icon: 'pi pi-sign-in',
        command: () => dialogVisible.value = true,
        visible: !isSignedIn.value
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



onMounted(() => {
  loadToken();
});

</script>
<template>
  <div>
    <Button
      type="button"
      icon="pi pi-user"
      class="p-button-rounded p-button-secondary"
      aria-haspopup="true"
      aria-controls="overlay_menu"
      @click="menu?.toggle"
    />
    <Menu
      ref="menu"
      id="overlay_menu"
      :model="menuItems"
      popup
    />

    <Dialog
      v-model:visible="dialogVisible"
      header="Sign in"
      modal
      :style="{ width: '25rem' }"
    >
      <span class="text-surface-500 dark:text-surface-400 block mb-8">
        Use a personal access token to authenticate with GitHub.
      </span>
      <div class="flex items-center gap-4 mb-4">
        <label
          for="pat"
          class="font-semibold w-24"
        >Personal access token</label>
        <InputText
          id="pat"
          v-model="pat"
          class="flex-auto"
          autocomplete="off"
        />
      </div>
      <div class="flex items-center gap-4 mb-8">
        <Checkbox
          id="remember"
          v-model="rememberMe"
          binary
        />
        <label
          for="remember"
          class="text-sm font-medium leading-none"
        >
          Remember me
        </label>
      </div>
      <div class="flex justify-end gap-2">
        <Button
          type="button"
          label="Cancel"
          severity="secondary"
          @click="dialogVisible = false"
        />
        <Button
          type="button"
          label="Save changes"
          @click="saveChanges"
        />
      </div>
    </Dialog>
  </div>
</template>
