import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

import VueGtag from 'vue-gtag'
import './assets/main.css'
import 'primeicons/primeicons.css'
import PrimeVue from 'primevue/config'
import { definePreset } from '@primevue/themes'
import Aura from '@primevue/themes/aura'
import Ripple from 'primevue/ripple'
import Tooltip from 'primevue/tooltip'
import ConfirmationService from 'primevue/confirmationservice'
import DialogService from 'primevue/dialogservice'
import ToastService from 'primevue/toastservice'

const Konnektr = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{slate.50}',
      100: '{slate.100}',
      200: '{slate.200}',
      300: '{slate.300}',
      400: '{slate.400}',
      500: '{slate.500}',
      600: '{slate.600}',
      700: '{slate.700}',
      800: '{slate.800}',
      900: '{slate.900}',
      950: '{slate.950}'
    },
    colorScheme: {
      light: {
        primary: {
          color: '{slate.950}',
          inverseColor: '#ffffff',
          hoverColor: '{primary.800}',
          activeColor: '{primary.700}'
        },
        highlight: {
          background: '{primary.950}',
          focusBackground: '{primary.700}',
          color: '#ffffff',
          focusColor: '#ffffff'
        }
      },
      dark: {
        primary: {
          color: '{primary.50}',
          inverseColor: '{primary.950}',
          hoverColor: '{primary.200}',
          activeColor: '{primary.300}'
        },
        highlight: {
          background: '{primary.50}',
          focusBackground: '{primary.300}',
          color: '{primary.950}',
          focusColor: '{primary.950}'
        }
      }
    }
  }
})

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.use(
  VueGtag,
  {
    appName: 'OntoManager',
    bootstrap: false,
    pageTrackerScreenviewEnabled: true,
    config: {
      id: import.meta.env.VITE_GA_MEASUREMENT_ID
    }
  },
  router
)

app.use(PrimeVue, {
  ripple: true,
  theme: {
    preset: Konnektr,
    options: {
      darkModeSelector: '.p-dark',
      cssLayer: {
        name: 'primevue',
        order: 'tailwind-base, primevue, tailwind-utilities'
      }
    }
  }
})
app.use(ConfirmationService)
app.use(DialogService)
app.use(ToastService)
app.directive('ripple', Ripple)
app.directive('tooltip', Tooltip)

app.mount('#app')
