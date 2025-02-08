<template>
  <v-app>
    <!-- If not authenticated, show only the router view (Login page) -->
    <div v-if="!isAuthenticated">
      <router-view></router-view>
    </div>
    <!-- If authenticated, show full layout with navigation drawer and toolbar -->
    <div v-else>
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
              <v-list-item-title>
                <v-icon>{{ item.icon }}</v-icon> {{ item.title }}
              </v-list-item-title>
            </v-list-item-content>
          </v-list-item>
        </v-list>
      </v-navigation-drawer>

      <!-- Application Toolbar -->
      <v-app-bar app color="primary" dark :clipped-left="drawer">
        <!-- Menu Button (Visible on Mobile) -->
        <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
        <v-spacer></v-spacer>
        <!-- Logout Button -->
        <v-btn icon @click="handleLogout">
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
    </div>
  </v-app>
</template>

<script>
import logo from "./assets/logo-mdv.png";
import eventBus from "./services/eventBus";
import AuthService from "./services/AuthService";

export default {
  name: "App",
  data() {
    return {
      drawer: true, // Controls the visibility of the navigation drawer
      navItems: [
        {title: "Dashboard", icon: "mdi-view-dashboard", route: "/"},
        {title: "Via del Vangelo", icon: "mdi-cross-outline", route: "/gospels-way"},
        {title: "Vangeli", icon: "mdi-book-cross", route: "/gospels"},
        {title: "Commenti", icon: "mdi-comment-outline", route: "/comments"},
        {title: "Santi", icon: "mdi-account-group", route: "/saints"},
        {title: "Contatti", icon: "mdi-contacts", route: "/contacts"},
        {title: "Eventi", icon: "mdi-calendar", route: "/events"},
        {title: "Semini", icon: "mdi-dots-circle", route: "/seeds"},
        {title: "Pagine", icon: "mdi-page-layout-body", route: "/pages"},
      ],
      logo, // Imported logo asset
      authToken: localStorage.getItem("authToken") || null,
    };
  },
  computed: {
    isAuthenticated() {
      // Reactive authentication status based on authToken
      return !!this.authToken;
    },
  },
  methods: {
    isActiveRoute(route) {
      return this.$route.path === route;
    },
    async handleLogout() {
      try {
        await AuthService.logout();
        this.authToken = null;
        this.$router.push({name: "Login"});
      } catch (error) {
        console.error("Logout failed:", error);
        // Optionally handle error scenarios here (e.g. display error message)
      }
    },
  },
  created() {
    // Listen for authentication changes via the event bus
    eventBus.on("auth-changed", (token) => {
      this.authToken = token;
    });
    // Update authToken on every route change (as a fallback)
    this.$router.afterEach(() => {
      this.authToken = localStorage.getItem("authToken");
    });
  },
};
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