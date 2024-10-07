<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { CircleUser } from 'lucide-vue-next'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import githubService from '@/services/GithubService';

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

onMounted(() => {
  loadToken();
});
</script>

<template>
  <Dialog>
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button
          variant="secondary"
          size="icon"
          class="rounded-full"
        >
          <template v-if="isSignedIn">
            <Avatar>
              <AvatarImage
                v-if="avatarUrl"
                :src="avatarUrl"
                :alt="`@${username}`"
              />
              <AvatarFallback>{{ name ? name.split(' ').map(n => n[0]).join('') : '' }}</AvatarFallback>
            </Avatar>
          </template>
          <template v-else>
            <CircleUser class="h-5 w-5" />
          </template>
          <span class="sr-only">Toggle user menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel v-if="!isSignedIn">GitHub account</DropdownMenuLabel>
        <DropdownMenuLabel v-else>
          <a
            :href="`https://github.com/${username}`"
            target="_blank"
          >GitHub account</a>
          <div
            v-if="name"
            class="text-xs text-muted-foreground"
          >{{ name }}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DialogTrigger
          v-if="!isSignedIn"
          asChild
        >
          <DropdownMenuItem>Sign in</DropdownMenuItem>
        </DialogTrigger>
        <DropdownMenuItem
          v-else
          @click="signOut"
        >Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Sign in</DialogTitle>
        <DialogDescription>
          Use a personal access token to authenticate with GitHub.
        </DialogDescription>
      </DialogHeader>
      <div class="grid gap-4 py-4">
        <Label for="pat">
          Personal access token
        </Label>
        <Input
          id="pat"
          v-model="pat"
          class="col-span-3"
        />
        <div class="flex items-center space-x-2">
          <Checkbox
            id="remember"
            v-model:checked="rememberMe"
          />
          <Label
            for="remember"
            class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Remember me
          </Label>
        </div>
      </div>
      <DialogFooter>
        <DialogClose as-child>
          <Button
            type="submit"
            @click="saveChanges"
          >
            Save changes
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
