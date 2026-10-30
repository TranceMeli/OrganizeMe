import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import '@fontsource/caveat/400.css'
import '@fontsource/caveat/600.css'
import '@fontsource/nunito/400.css'
import '@fontsource/nunito/600.css'
import '@fontsource/nunito/700.css'
import './styles/book.css'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')