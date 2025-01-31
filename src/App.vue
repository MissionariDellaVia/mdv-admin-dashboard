<!-- src/App.vue -->

<template>
  <v-app>
    <!-- Navigation Drawer (Sidebar) -->
    <v-navigation-drawer
        app
        clipped
        color="primary"
        dark
        v-model="drawer"
        fixed
        :width="250"
    >

      <v-list dense>
        <!-- Application Logo or Title -->
        <v-list-item>
          <v-list-item-content>
            <v-img :src="logo" alt="MdV Admin Logo" class="mx-auto my-5" max-width="60"></v-img>
          </v-list-item-content>
        </v-list-item>

        <v-divider class="mb-5"></v-divider>

        <!-- Navigation Links -->
        <v-list-item
            class="mt-1 text-center"
            v-for="item in navItems"
            :key="item.title"
            :to="item.route"
            router
            link
            :active="isActiveRoute(item.route)"
        >

          <v-list-item-content>
            <v-list-item-title><v-icon>{{ item.icon }}</v-icon> {{ item.title }}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <!-- Application Toolbar -->
    <v-app-bar
        app
        color="primary"
        dark
        :clipped-left="drawer"
    >
      <!-- Menu Button (Visible on Mobile) -->
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>

      <v-spacer></v-spacer>

      <!-- Optional Toolbar Items (e.g., User Profile, Notifications) -->
      <v-btn icon="mdi-bell">
        <v-icon>mdi-bell</v-icon>
      </v-btn>
      <v-btn icon="mdi-account-circle">
        <v-icon>mdi-account-circle</v-icon>
      </v-btn>
    </v-app-bar>

    <!-- Main Content Area -->
    <v-main>
      <v-container fluid>
        <!-- Rendered Component for Each Route -->
        <router-view></router-view>
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
import logo from './assets/logo-mdv.png'

export default {
  name: 'App',
  data() {
    return {
      drawer: true, // Controls the visibility of the navigation drawer
      navItems: [ // Navigation items for the sidebar
        { title: 'Dashboard', icon: 'mdi-view-dashboard', route: '/' },
        { title: 'Vangelo', icon: 'mdi-book-open-page-variant', route: '/gospels' },
        { title: 'Santi', icon: 'mdi-account-group', route: '/saints' },
        { title: 'Contatti', icon: 'mdi-contacts', route: '/contacts' },
        { title: 'Indirizzi', icon: 'mdi-map-marker', route: '/addresses' },
        { title: 'Eventi', icon: 'mdi-calendar', route: '/events' },
        { title: 'Semini', icon: 'mdi-calendar', route: '/seeds' },
      ],
      currentYear: new Date().getFullYear(), // For the footer
      logo, // Add the imported logo to the data
    }
  },
  methods: {
    isActiveRoute(route) {
      return this.$route.path === route
    },
  }
}
</script>

<style>
/* Optional: Customize scrollbar for better aesthetics */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #f5f5f5;
}

::-webkit-scrollbar-thumb {
  background-color: #3c1e02; /* Brown color */
  border-radius: 4px;
}
</style>