<script setup lang="ts">
import { onMounted } from 'vue'
import { bootstrap } from 'vue-gtag'
import ConfirmDialog from 'primevue/confirmdialog'
import DynamicDialog from 'primevue/dynamicdialog'
import Toast from 'primevue/toast'
import { useConfirm } from "primevue/useconfirm"
import TheHeader from '@/components/TheHeader.vue'

const confirm = useConfirm()

const cookieDialog = () => {
  confirm.require({
    header: 'Cookie Consent',
    message: 'We use cookies to track usage and improve your experience. Do you consent to the use of cookies for analytics?',
    icon: 'pi pi-info-circle',
    position: 'bottomright',
    modal: false,
    rejectProps: {
      label: 'Decline',
      severity: 'secondary',
      text: true
    },
    acceptProps: {
      label: 'Accept',
      severity: 'secondary',
      outlined: true
    },
    accept: () => {
      // Bootstrap the Google Analytics
      bootstrap()
      localStorage.setItem('cookie-consent', 'true')
    },
    reject: () => {
    }
  })
}

onMounted(() => {
  if (!localStorage.getItem('cookie-consent') && typeof
    import.meta.env.VITE_GA_MEASUREMENT_ID === 'string' &&
    import.meta.env.VITE_GA_MEASUREMENT_ID.length > 0) {
    cookieDialog()
  } else {
    bootstrap()
  }
})
</script>

<template>
  <div class="flex min-h-screen w-full flex-col">
    <!-- Header Section -->
    <header class="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      <TheHeader />
    </header>

    <!-- Main View -->
    <main class="flex-grow h-[calc(100vh-4rem)] flex flex-col">
      <RouterView class="flex-grow h-full" />
    </main>

    <!-- Dynamic Dialog -->
    <DynamicDialog></DynamicDialog>

    <!-- Cookie Dialog -->
    <ConfirmDialog></ConfirmDialog>

    <!-- Toast -->
    <Toast></Toast>
  </div>
</template>