<!-- src/views/Dashboard.vue -->

<template>
  <v-container fluid>
    <v-row>
      <!-- Summary Cards -->
      <v-col cols="12" sm="6" md="4">
        <v-card class="pa-4" outlined>
          <v-card-title>
            <v-icon large color="primary">mdi-book</v-icon>
            <span class="ml-3">Vangeli inseriti</span>
          </v-card-title>
          <v-card-text>
            <h2>{{ totals.gospels }}</h2>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="4">
        <v-card class="pa-4" outlined>
          <v-card-title>
            <v-icon large color="secondary">mdi-account-group</v-icon>
            <span class="ml-3">Santi descritti</span>
          </v-card-title>
          <v-card-text>
            <h2>{{ totals.saints }}</h2>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="4">
        <v-card class="pa-4" outlined>
          <v-card-title>
            <v-icon large color="accent">mdi-contacts</v-icon>
            <span class="ml-3">Eventi aggiunti</span>
          </v-card-title>
          <v-card-text>
            <h2>{{ totals.contacts }}</h2>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-divider class="my-6"></v-divider>

    <v-row>
      <!-- Recent Events -->
      <v-col cols="12" md="6">
        <v-card outlined>
          <v-card-title>
            Recent Events
            <v-spacer></v-spacer>
            <v-btn text="" color="primary" @click="navigateTo('Events')">View All</v-btn>
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
                  <v-list-item-title>No recent events found.</v-list-item-title>
                </v-list-item-content>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Upcoming Holy Week Indicators -->
      <v-col cols="12" md="6">
        <v-card outlined>
          <v-card-title>
            Holy Week Indicators
          </v-card-title>
          <v-card-text>
            <v-timeline>
              <v-timeline-item
                  v-for="indicator in holyWeekIndicators"
                  :key="indicator.id"
                  :color="indicator.color"
                  :icon="indicator.icon"
              >
                <strong>{{ indicator.name }}</strong>: {{ indicator.description }}
                <v-chip class="mt-2" :color="indicator.chipColor" small>
                  {{ formatDate(indicator.date) }}
                </v-chip>
              </v-timeline-item>
            </v-timeline>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-divider class="my-6"></v-divider>

    <v-row>
      <!-- Gospels Chart -->
      <v-col cols="12" md="6">
        <v-card outlined>
          <v-card-title>Gospels Overview</v-card-title>
          <v-card-text>
            <canvas id="gospelsChart"></canvas>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Contacts Distribution Chart -->
      <v-col cols="12" md="6">
        <v-card outlined>
          <v-card-title>Contacts Distribution</v-card-title>
          <v-card-text>
            <canvas id="contactsChart"></canvas>
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

    // Holy Week Indicators
    const holyWeekIndicators = ref([
      {
        id: 1,
        name: 'Palm Sunday',
        description: 'Commemoration of Jesus\' entry into Jerusalem.',
        date: '2025-03-24',
        color: 'green',
        icon: 'mdi-palm-tree',
        chipColor: 'green lighten-2',
      },
      {
        id: 2,
        name: 'Maundy Thursday',
        description: 'Observance of the Last Supper.',
        date: '2025-03-28',
        color: 'blue',
        icon: 'mdi-teach',
        chipColor: 'blue lighten-2',
      },
      // Add more indicators as needed
    ])

    // Fetch totals from services
    const fetchTotals = async () => {
      try {
        const [gospelsRes, saintsRes, contactsRes] = await Promise.all([
          GospelsService.getAll(),
          SaintsService.getAll(),
          ContactsService.getAll(),
        ])
        totals.value.gospels = gospelsRes.data.length
        totals.value.saints = saintsRes.data.length
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
        gospelsRes.data.forEach(gospel => {
          const month = new Date(gospel.date).toLocaleString('default', { month: 'short' })
          gospelsByMonth[month] = (gospelsByMonth[month] || 0) + 1
        })

        const gospelsCtx = document.getElementById('gospelsChart').getContext('2d')
        new Chart(gospelsCtx, {
          type: 'bar',
          data: {
            labels: Object.keys(gospelsByMonth),
            datasets: [{
              label: 'Gospels per Month',
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

        // Contacts Chart Data
        const contactsByType = {}
        contactsRes.data.forEach(contact => {
          const type = contact.type || 'Other'
          contactsByType[type] = (contactsByType[type] || 0) + 1
        })

        const contactsCtx = document.getElementById('contactsChart').getContext('2d')
        new Chart(contactsCtx, {
          type: 'doughnut',
          data: {
            labels: Object.keys(contactsByType),
            datasets: [{
              label: 'Contacts Distribution',
              data: Object.values(contactsByType),
              backgroundColor: [
                '#8B4513', // SaddleBrown
                '#CD853F', // Peru
                '#DEB887', // BurlyWood
                '#F4A460', // SandyBrown
              ],
              borderColor: '#fff',
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
      holyWeekIndicators,
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