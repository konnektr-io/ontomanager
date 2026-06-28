<script setup lang="ts">
import { User, LogIn, LogOut } from 'lucide-vue-next'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useGitHubStore } from '@/stores/github'

const githubStore = useGitHubStore()

const handleSignOut = () => {
  githubStore.isSignedIn = false
  githubStore.username = null
  githubStore.name = null
  githubStore.avatarUrl = null
  localStorage.removeItem('githubTokenData')
}
</script>

<template>
  <div class="flex items-center">
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Avatar class="cursor-pointer h-9 w-9">
          <AvatarImage
            v-if="githubStore.isSignedIn && githubStore.avatarUrl"
            :src="githubStore.avatarUrl"
            :alt="githubStore.name || githubStore.username || 'User'"
          />
          <AvatarFallback>
            <User class="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        class="w-56"
      >
        <DropdownMenuLabel v-if="!githubStore.isSignedIn">
          GitHub Account
        </DropdownMenuLabel>
        <DropdownMenuLabel
          v-else
          class="font-normal"
        >
          <div class="flex flex-col space-y-1">
            <p class="text-sm font-medium leading-none">{{ githubStore.name }}</p>
            <p
              v-if="githubStore.username"
              class="text-xs leading-none text-muted-foreground"
            >
              @{{ githubStore.username }}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          v-if="!githubStore.isSignedIn"
          @click="githubStore.loginToGitHub"
        >
          <LogIn class="mr-2 h-4 w-4" />
          <span>Sign in</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          v-if="githubStore.isSignedIn"
          @click="handleSignOut"
        >
          <LogOut class="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
