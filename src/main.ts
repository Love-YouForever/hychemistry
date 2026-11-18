import { createApp } from 'vue'
import SiteNav from './components/SiteNav.vue'
import AssistantPanel from './components/AssistantPanel.vue'
import { initPet } from './pet'

const navRoot = document.querySelector('#nav-app')
if (navRoot) {
  createApp(SiteNav).mount(navRoot)
}

const assistantRoot = document.querySelector('#assistant-app')
if (assistantRoot) {
  createApp(AssistantPanel).mount(assistantRoot)
  initPet()
}
