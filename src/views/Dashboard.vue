<!-- src/views/Dashboard.vue -->

<template>
  <v-container fluid>
    <v-row>
      <!-- Summary Cards -->
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4" outlined>
          <v-card-title>
            <v-icon large color="primary">mdi-book-cross</v-icon>
            <span class="ml-3">Vangeli aggiunti</span>
          </v-card-title>
          <v-card-text>
            <h2>{{ totals.gospels }}</h2>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4" outlined>
          <v-card-title>
            <v-icon large color="accent">mdi-comment-outline</v-icon>
            <span class="ml-3">Commenti totali</span>
          </v-card-title>
          <v-card-text>
            <h2 >{{ totals.contacts }}</h2>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4" outlined>
          <v-card-title>
            <v-icon large color="secondary">mdi-account-group</v-icon>
            <span class="ml-3">Santi aggiunti</span>
          </v-card-title>
          <v-card-text>
            <h2>{{ totals.saints }}</h2>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4" outlined>
          <v-card-title>
            <v-icon large color="accent">mdi-dots-circle</v-icon>
            <span class="ml-3">Semini aggiunti</span>
          </v-card-title>
          <v-card-text>
            <h2 >{{ totals.contacts }}</h2>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-divider class="my-6"></v-divider>

    <v-row>
      <!-- Recent Events -->
      <v-col cols="12" md="6">
        <v-card outlined>
          <v-card-title class="pa-5">
            Eventi recenti
            <v-btn text="" color="primary" class="float-end rounded-pill" @click="navigateTo('Events')">visualizza tutti</v-btn>
          </v-card-title>
          <v-card-text>
            <v-list two-line>
              <v-list-item v-for="event in recentEvents" :key="event.id">
                <v-list-item-content>
                  <v-list-item-title>{{ event.name }}</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ formatDate(event.date) }} at {{ event.place }}
                  </v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
              <v-list-item v-if="recentEvents.length === 0">
                <v-list-item-content>
                  <v-list-item-title>Nessun evento trovato.</v-list-item-title>
                </v-list-item-content>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Gospels Chart -->
      <v-col cols="12" md="6">
        <v-card outlined>
          <v-card-title class="pa-5">Panoramica sui Vangeli</v-card-title>
          <v-card-text>
            <canvas id="gospelsChart"></canvas>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-divider class="my-6"></v-divider>

    <v-row>
      <!-- Upcoming Holy Week Indicators -->
      <v-col cols="12" md="12">
        <v-card outlined>
          <v-card-title class="text-center pa-5">
            Aggiungi un Vangelo del Giorno
          </v-card-title>
          <v-card-text>
          </v-card-text>
        </v-card>
      </v-col>

    </v-row>
  </v-container>
</template>

<script>
// Import necessary services and libraries
import GospelsService from '../services/GospelsService'
import SaintsService from '../services/SaintsService'
import ContactsService from '../services/ContactsService'
import EventsService from '../services/EventsService'
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Chart from 'chart.js/auto'

export default {
  name: 'Dashboard',
  setup() {
    const router = useRouter()

    // Reactive state for totals
    const totals = ref({
      gospels: 0,
      saints: 0,
      contacts: 0,
    })

    // Recent events
    const recentEvents = ref([])

    // Fetch totals from services
    const fetchTotals = async () => {
      try {
        const [gospelsRes, saintsRes, contactsRes] = await Promise.all([
          GospelsService.getTotal(),
          SaintsService.getTotal(),
          ContactsService.getAll(),
        ])
        totals.value.gospels = gospelsRes
        totals.value.saints = saintsRes
        totals.value.contacts = contactsRes.data.length
      } catch (error) {
        console.error('Error fetching totals:', error)
      }
    }

    // Fetch recent events
    const fetchRecentEvents = async () => {
      try {
        const eventsRes = await EventsService.getAll()
        // Assuming events are sorted by date descending
        recentEvents.value = eventsRes.data.slice(0, 5)
      } catch (error) {
        console.error('Error fetching recent events:', error)
      }
    }

    // Navigate to a specific route
    const navigateTo = (routeName) => {
      router.push({ name: routeName })
    }

    // Format date
    const formatDate = (dateStr) => {
      const options = { year: 'numeric', month: 'short', day: 'numeric' }
      return new Date(dateStr).toLocaleDateString(undefined, options)
    }

    // Initialize Charts
    const initializeCharts = async () => {
      try {
        const gospelsRes = await GospelsService.getAll()
        const contactsRes = await ContactsService.getAll()

        // Gospels Chart Data
        const gospelsByMonth = {}
        gospelsRes.forEach(gospel => {
          const month = new Date(gospel.created_at).toLocaleString('default', { month: 'short' })
          gospelsByMonth[month] = (gospelsByMonth[month] || 0) + 1
        })

        const gospelsCtx = document.getElementById('gospelsChart').getContext('2d')
        new Chart(gospelsCtx, {
          type: 'bar',
          data: {
            labels: Object.keys(gospelsByMonth),
            datasets: [{
              label: 'Vangeli per il mese',
              data: Object.values(gospelsByMonth),
              backgroundColor: 'rgba(139, 69, 19, 0.6)', // Brown color
              borderColor: 'rgba(139, 69, 19, 1)',
              borderWidth: 1,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
          },
        })
      } catch (error) {
        console.error('Error initializing charts:', error)
      }
    }

    // Lifecycle hook
    onMounted(() => {
      fetchTotals()
      fetchRecentEvents()
      initializeCharts()
    })

    return {
      totals,
      recentEvents,
      navigateTo,
      formatDate,
    }
  },
}
</script>

<style scoped>
/* Custom styles for the dashboard */

.v-card {
  transition: box-shadow 0.3s ease;
}

.v-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.v-timeline-item {
  max-width: 500px;
}
</style>