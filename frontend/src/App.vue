<script setup lang="ts">
import { Toaster } from '@/components/ui/sonner'
import { SidebarProvider } from '@/components/ui/sidebar'
import CookieConsent from '@/components/CookieConsent.vue'

// GTM/Clarity consent logic (matches React)
const setConsent = (consent: 'accepted' | 'declined') => {
  if (typeof window !== 'undefined') {
    // gtag
    const gtag = (window as typeof window & { gtag?: Function }).gtag
    if (gtag) {
      if (consent === 'accepted') {
        gtag('consent', 'update', {
          ad_storage: 'granted',
          analytics_storage: 'granted',
        })
      } else {
        gtag('consent', 'update', {
          ad_storage: 'denied',
          analytics_storage: 'denied',
        })
      }
    }
    // clarity
    const clarity = (window as typeof window & { clarity?: Function }).clarity
    if (clarity) {
      if (consent === 'accepted') {
        clarity('consentv2', {
          ad_Storage: 'granted',
          analytics_Storage: 'granted',
        })
      } else {
        clarity('consentv2', {
          ad_Storage: 'denied',
          analytics_Storage: 'denied',
        })
      }
    }
  }
}

const handleAccept = () => {
  setConsent('accepted')
}
const handleDecline = () => {
  setConsent('declined')
}
</script>

<template>
  <SidebarProvider>
    <div class="flex h-screen w-full overflow-hidden">
      <!-- Main View with Sidebar -->
      <RouterView class="flex flex-1 w-full" />

      <!-- Cookie Consent Dialog (minimal variant, React-style) -->
      <CookieConsent
        variant="minimal"
        :onAcceptCallback="handleAccept"
        :onDeclineCallback="handleDecline"
      />

      <!-- Toast Notifications -->
      <Toaster />
    </div>
  </SidebarProvider>
</template>
