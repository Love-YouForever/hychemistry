/// <reference types="vite/client" />

import type { AssistantApi } from './types'

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, never>, Record<string, never>, any>
  export default component
}

declare global {
  interface Window {
    ElementWhisperAssistant?: AssistantApi
    __assistantPanelOpen?: boolean
  }
}

export {}
