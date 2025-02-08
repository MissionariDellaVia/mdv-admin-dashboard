// src/router/index.js

import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
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
    { path: '/login', name: 'Login', component: Login },
    { path: '/', name: 'Dashboard', meta: { requiresAuth: true }, component: Dashboard },
    { path: '/gospels-way', name: 'GospelWay', meta: { requiresAuth: true }, component: GospelWay },
    { path: '/gospels', name: 'Gospels', meta: { requiresAuth: true }, component: Gospels },
    { path: '/saints', name: 'Saints', meta: { requiresAuth: true }, component: Saints },
    { path: '/comments', name: 'Comments', meta: { requiresAuth: true }, component: Comments },
    { path: '/contacts', name: 'Contacts', meta: { requiresAuth: true }, component: PlacesContacts },
    { path: '/events', name: 'Events', meta: { requiresAuth: true }, component: Events },
    { path: '/pages', name: 'Pagine', meta: { requiresAuth: true }, component: TextContents },
    { path: '/seeds', name: 'Semini', meta: { requiresAuth: true }, component: Seeds },
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

// Global navigation guard to secure routes that require authentication
router.beforeEach((to, from, next) => {
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
    const token = localStorage.getItem("authToken");

    if (requiresAuth && !token) {
        next({ name: "Login" });
    } else {
        next();
    }
});

export default router