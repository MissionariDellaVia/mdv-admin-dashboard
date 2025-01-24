// src/router/index.js

import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import Gospels from '../views/Gospels.vue'
// import Saints from '../views/Saints.vue'
// import Contacts from '../views/Contacts.vue'
// import Addresses from '../views/Addresses.vue'
// import Events from '../views/Events.vue'

const routes = [
    { path: '/', name: 'Dashboard', component: Dashboard },
    { path: '/gospels', name: 'Gospels', component: Gospels },
    // { path: '/saints', name: 'Saints', component: Saints },
    // { path: '/contacts', name: 'Contacts', component: Contacts },
    // { path: '/addresses', name: 'Addresses', component: Addresses },
    // { path: '/events', name: 'Events', component: Events },
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

export default router