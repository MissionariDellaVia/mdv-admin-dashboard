// src/router/index.js

import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import Gospels from '../views/Gospels.vue'
import GospelWay from '../views/GospelWay.vue'
import Saints from '../views/Saints.vue'
import Comments from '../views/Comments.vue'
import PlacesContacts from '../views/PlacesContacts.vue'
import Events from '../views/Events.vue'
import Seeds from '../views/Seeds.vue'
import TextContents from '../views/TextContents.vue'

const routes = [
    { path: '/', name: 'Dashboard', component: Dashboard },
    { path: '/gospels-way', name: 'GospelWay', component: GospelWay },
    { path: '/gospels', name: 'Gospels', component: Gospels },
    { path: '/saints', name: 'Saints', component: Saints },
    { path: '/comments', name: 'Comments', component: Comments },
    { path: '/contacts', name: 'Contacts', component: PlacesContacts },
    { path: '/events', name: 'Events', component: Events },
    { path: '/pages', name: 'Pagine', component: TextContents },
    { path: '/seeds', name: 'Semini', component: Seeds },
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

export default router