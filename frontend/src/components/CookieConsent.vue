<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { CookieIcon } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const props = withDefaults(defineProps<{
  variant?: 'default' | 'small' | 'minimal',
  mode?: boolean,
  onAcceptCallback?: () => void,
  onDeclineCallback?: () => void,
}>(), {
  variant: 'default',
  mode: false,
  onAcceptCallback: () => { },
  onDeclineCallback: () => { },
})

const isOpen = ref(false)
const hide = ref(false)

const accept = () => {
  isOpen.value = false
  document.cookie = 'cookieConsent=true; expires=Fri, 31 Dec 9999 23:59:59 GMT'
  setTimeout(() => {
    hide.value = true
  }, 700)
  props.onAcceptCallback()
}

const decline = () => {
  isOpen.value = false
  setTimeout(() => {
    hide.value = true
  }, 700)
  props.onDeclineCallback()
}

onMounted(() => {
  try {
    isOpen.value = true
    if (document.cookie.includes('cookieConsent=true')) {
      if (!props.mode) {
        isOpen.value = false
        setTimeout(() => {
          hide.value = true
        }, 700)
      }
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error checking cookie consent:', error)
  }
})
</script>

<template>
  <div
    v-if="props.variant === 'default'"
    :class="cn('fixed z-200 bottom-0 left-0 right-0 p-4 sm:p-0 sm:left-4 sm:bottom-4 w-full sm:max-w-md duration-700', !isOpen ? 'transition-[opacity,transform] translate-y-8 opacity-0' : 'transition-[opacity,transform] translate-y-0 opacity-100', hide && 'hidden')"
  >
    <div class="dark:bg-card bg-background rounded-lg sm:rounded-md border border-border shadow-lg">
      <div class="grid gap-2">
        <div class="border-b border-border h-12 sm:h-14 flex items-center justify-between p-3 sm:p-4">
          <h1 class="text-base sm:text-lg font-medium">We use cookies</h1>
          <CookieIcon class="h-4 w-4 sm:h-[1.2rem] sm:w-[1.2rem]" />
        </div>
        <div class="p-3 sm:p-4">
          <p class="text-xs sm:text-sm font-normal text-start text-muted-foreground">
            We use cookies to ensure you get the best experience on our
            website. For more information on how we use cookies, please see
            our cookie policy.
            <br />
            <br />
            <span class="text-xs">
              By clicking <span class="font-medium text-black dark:text-white">Accept</span>, you agree to
              our use of cookies.
            </span>
            <br />
            <a
              href="/privacy-policy"
              class="text-xs underline"
              aria-label="Learn more about our cookie policy (opens privacy policy page)"
            >
              Learn more.
            </a>
          </p>
        </div>
        <div
          class="grid grid-cols-2 items-center gap-2 p-3 sm:p-4 sm:py-5 border-t border-border dark:bg-background/20">
          <Button
            @click="accept"
            variant="default"
            class="w-full"
          >
            Accept
          </Button>
          <Button
            @click="decline"
            variant="outline"
            class="w-full"
          >
            Decline
          </Button>
        </div>
      </div>
    </div>
  </div>
  <div
    v-else-if="props.variant === 'small'"
    :class="cn('fixed z-200 bottom-0 left-0 right-0 p-4 sm:p-0 sm:left-4 sm:bottom-4 w-full sm:max-w-md duration-700', !isOpen ? 'transition-[opacity,transform] translate-y-8 opacity-0' : 'transition-[opacity,transform] translate-y-0 opacity-100', hide && 'hidden')"
  >
    <div class="m-0 sm:m-3 dark:bg-card bg-background border border-border rounded-lg shadow-lg">
      <div class="flex items-center justify-between p-3">
        <h1 class="text-base sm:text-lg font-medium">We use cookies</h1>
        <CookieIcon class="h-4 w-4 sm:h-[1.2rem] sm:w-[1.2rem]" />
      </div>
      <div class="p-3 -mt-2">
        <p class="text-xs sm:text-sm text-left text-muted-foreground">
          We use cookies to ensure you get the best experience on our website.
          For more information on how we use cookies, please see our cookie
          policy.
        </p>
      </div>
      <div class="grid grid-cols-2 items-center gap-2 p-3 mt-2 border-t">
        <Button
          @click="accept"
          class="w-full"
        >
          Accept
        </Button>
        <Button
          @click="decline"
          class="w-full"
          variant="outline"
        >
          Decline
        </Button>
      </div>
    </div>
  </div>
  <div
    v-else-if="props.variant === 'minimal'"
    :class="cn('fixed z-200 bottom-0 left-0 right-0 p-4 sm:p-0 sm:left-4 sm:bottom-4 w-full sm:max-w-[300px] duration-700', !isOpen ? 'transition-[opacity,transform] translate-y-8 opacity-0' : 'transition-[opacity,transform] translate-y-0 opacity-100', hide && 'hidden')"
  >
    <div class="m-0 sm:m-3 dark:bg-card bg-background border border-border rounded-lg shadow-lg">
      <div class="p-3 flex items-center justify-between border-b border-border">
        <div class="flex items-center gap-2">
          <CookieIcon class="h-3 w-3 sm:h-4 sm:w-4" />
          <span class="text-xs sm:text-sm font-medium">Cookie Notice</span>
        </div>
      </div>
      <div class="p-3">
        <p class="text-[11px] sm:text-xs text-muted-foreground">
          We use cookies to enhance your browsing experience.
        </p>
        <div class="grid grid-cols-2 items-center gap-2 mt-3">
          <Button
            @click="accept"
            variant="default"
            class="w-full"
          >
            Accept
          </Button>
          <Button
            @click="decline"
            variant="ghost"
            class="w-full"
          >
            Decline
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
