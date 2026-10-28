import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

// UI5 Web Components: no CDN - each used component is imported and bundled
// explicitly (see https://sap.github.io/ui5-webcomponents/). sap_horizon
// (the Fiori Horizon theme the design mock specifies) is the built-in default.
import '@ui5/webcomponents/dist/Card.js'
import '@ui5/webcomponents/dist/CardHeader.js'
import '@ui5/webcomponents/dist/Button.js'
import '@ui5/webcomponents/dist/Input.js'
import '@ui5/webcomponents/dist/Select.js'
import '@ui5/webcomponents/dist/Option.js'
import '@ui5/webcomponents/dist/Dialog.js'

createApp(App).mount('#app')
