<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { optIn } from 'vue-gtag'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Toaster } from '@/components/ui/sonner'
import { SidebarProvider } from '@/components/ui/sidebar'

const cookieDialogOpen = ref(false)

const acceptCookies = () => {
  // Enable Google Analytics tracking
  optIn()
  localStorage.setItem('cookie-consent', 'true')
  cookieDialogOpen.value = false
}

const declineCookies = () => {
  cookieDialogOpen.value = false
}

onMounted(() => {
  if (!localStorage.getItem('cookie-consent') &&
    typeof import.meta.env.VITE_GA_MEASUREMENT_ID === 'string' &&
    import.meta.env.VITE_GA_MEASUREMENT_ID.length > 0) {
    cookieDialogOpen.value = true
  } else if (localStorage.getItem('cookie-consent') === 'true') {
    optIn()
  }
})
</script>

<template>
  <SidebarProvider>
    <div class="flex h-screen w-full overflow-hidden">
      <!-- Main View with Sidebar -->
      <RouterView class="flex flex-1 w-full" />

      <!-- Cookie Consent Dialog -->
      <AlertDialog v-model:open="cookieDialogOpen">
        <AlertDialogContent class="fixed bottom-4 right-4 max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Cookie Consent</AlertDialogTitle>
            <AlertDialogDescription>
              We use cookies to track usage and improve your experience. Do you consent to the use of cookies for
              analytics?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel @click="declineCookies">
              Decline
            </AlertDialogCancel>
            <AlertDialogAction @click="acceptCookies">
              Accept
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <!-- Toast Notifications -->
      <Toaster />
    </div>
  </SidebarProvider>
</template>

