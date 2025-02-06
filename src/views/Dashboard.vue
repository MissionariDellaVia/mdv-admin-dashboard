<template>
  <v-container fluid>
    <!-- Top Stats Cards Row -->
    <v-row>
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4" outlined>
          <v-card-title class="text-center">
            <v-icon large color="primary">mdi-book-cross</v-icon>
            <span class="ml-1">Vangeli</span>
          </v-card-title>
          <v-card-subtitle>
            <h1 class="font-weight-bold text-center text-brown">{{ totals.gospels }}</h1>
          </v-card-subtitle>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4" outlined>
          <v-card-title class="text-center">
            <v-icon large color="accent">mdi-comment-outline</v-icon>
            <span class="ml-1">Commenti</span>
          </v-card-title>
          <v-card-subtitle>
            <h1 class="font-weight-bold text-center text-brown">{{ totals.comments }}</h1>
          </v-card-subtitle>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4" outlined>
          <v-card-title class="text-center">
            <v-icon large color="secondary">mdi-account-group</v-icon>
            <span class="ml-1">Santi</span>
          </v-card-title>
          <v-card-subtitle>
            <h1 class="font-weight-bold text-center text-brown">{{ totals.saints }}</h1>
          </v-card-subtitle>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4" outlined>
          <v-card-title class="text-center">
            <v-icon large color="accent">mdi-dots-circle</v-icon>
            <span class="ml-1">Semini</span>
          </v-card-title>
          <v-card-subtitle>
            <h1 class="font-weight-bold text-center text-brown">{{ totals.seeds }}</h1>
          </v-card-subtitle>
        </v-card>
      </v-col>
    </v-row>

    <v-divider class="my-6"></v-divider>

    <!-- Events and Chart Row -->
    <v-row>
      <v-col cols="12" md="6">
        <v-card outlined>
          <v-card-title class="pa-5">
            Eventi recenti
            <v-btn text="visualizza tutti" color="primary" class="float-end rounded-pill" @click="navigateTo('Events')">
              visualizza tutti
            </v-btn>
          </v-card-title>
          <v-card-text>
            <v-list two-line>
              <template v-if="recentEvents.length">
                <v-list-item v-for="event in recentEvents" :key="event.id">
                  <v-list-item-content>
                    <v-list-item-title>{{ event.name }}</v-list-item-title>
                    <v-list-item-subtitle>
                      {{ formatDate(event.date) }} at {{ event.place }}
                    </v-list-item-subtitle>
                  </v-list-item-content>
                </v-list-item>
              </template>
              <v-list-item v-else>
                <v-list-item-content>
                  <v-list-item-title>Nessun evento trovato.</v-list-item-title>
                </v-list-item-content>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

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

    <!-- Add Gospel Form -->
    <v-row>
      <v-col cols="12" md="12">
        <v-card outlined>
          <v-card-title class="text-center pa-5">
            Aggiungi un Vangelo del Giorno
          </v-card-title>
          <v-card-text class="text-center">
            <v-form ref="form" v-model="valid">
              <!-- Gospel Search/Select with v-autocomplete -->
              <v-autocomplete
                  v-model="selectedGospel"
                  :items="gospels"
                  :loading="loading"
                  item-title="gospel_verse"
                  item-value="gospel_id"
                  :search-input="searchGospel"
                  @update:search="handleSearch"
                  label="Seleziona un Vangelo"
                  hide-no-data
                  clearable
              ></v-autocomplete>

              <v-divider class="my-4"></v-divider>
              <p class="my-4"> se non trovi il vangelo desiderato </p>
              <v-btn color="primary" @click="openGospelDialog">
                Aggiungi Nuovo Vangelo
              </v-btn>

              <v-divider class="my-4"></v-divider>

              <!-- Comment Section -->
              <v-textarea
                  v-model="commentText"
                  label="Aggiungi Commento"
                  required
                  :rules="[v => !!v || 'Commento richiesto']"
              ></v-textarea>

              <!-- Calendar and Liturgical Info -->
              <v-text-field
                  v-model="calendarDate"
                  label="Data del Calendario"
                  type="date"
                  required
                  :rules="[v => !!v || 'Data richiesta']"
              ></v-text-field>

              <v-text-field
                  v-model="liturgicalSeason"
                  label="Periodo Liturgico"
                  required
                  :rules="[v => !!v || 'Periodo liturgico richiesto']"
              ></v-text-field>

              <!-- Checkboxes -->
              <v-checkbox v-model="isSolemnity" label="Solennità"></v-checkbox>
              <v-checkbox v-model="isFeast" label="Festa"></v-checkbox>
              <v-checkbox v-model="isMemorial" label="Memoria"></v-checkbox>

              <!-- Creator Info -->
              <v-text-field :value="currentUser" label="Creato da" readonly disabled></v-text-field>
              <v-text-field :value="currentDateTime" label="Data e ora di creazione" readonly disabled></v-text-field>

              <!-- Submit Button -->
              <v-btn color="brown darken-1" :loading="saving" @click="saveGospelWay">
                Salva
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Add/Edit Gospel Dialog -->
    <v-dialog v-model="gospelDialog" max-width="600px">
      <v-card>
        <v-card-title class="text-center my-5">
          <span class="text-h5">{{ formTitle }}</span>
        </v-card-title>
        <v-card-text>
          <v-form ref="gospelForm" v-model="valid">
            <v-text-field
                v-model="newGospel.evangelist"
                label="Evangelista"
                required
                :rules="[v => !!v || 'Evangelista richiesta']"
            ></v-text-field>
            <v-text-field
                v-model="newGospel.sacred_text_reference"
                label="Testi connessi"
            ></v-text-field>
            <v-text-field
                v-model="newGospel.liturgical_period"
                label="Periodo Liturgico"
            ></v-text-field>
            <v-textarea
                v-model="newGospel.gospel_text"
                label="Vangelo"
                required
                :rules="[v => !!v || 'Testo del vangelo richiesto']"
            ></v-textarea>
            <v-text-field
                v-model="newGospel.gospel_verse"
                label="Versetto"
                required
                :rules="[v => !!v || 'Versetto richiesto']"
            ></v-text-field>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="brown darken-1" @click="closeGospelDialog">Chiudi</v-btn>
          <v-btn color="brown darken-1" :loading="savingGospel" @click="saveGospel">
            Salva
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import Chart from 'chart.js/auto'
import GospelsService from '../services/GospelsService'
import SaintsService from '../services/SaintsService'
import CommentsService from '../services/CommentsService'
import EventsService from '../services/EventsService'
import GospelWayService from '../services/GospelWayService'

// Current date/time and user information
const currentDateTime = ref('2025-02-05 21:13:23')
const currentUser = ref('Alessandro-Mac7')

// Router
const router = useRouter()

// Form and validation refs
const form = ref(null)
const gospelForm = ref(null)
const valid = ref(false)
const loading = ref(false)
const saving = ref(false)
const savingGospel = ref(false)

// Data refs
const totals = ref({
  gospels: 0,
  saints: 0,
  comments: 0,
  seeds: 0
})
const recentEvents = ref([])
const gospels = ref([])
const selectedGospel = ref(null)
const searchGospel = ref('')
const commentText = ref('')
const calendarDate = ref('')
const liturgicalSeason = ref('')
const isSolemnity = ref(false)
const isFeast = ref(false)
const isMemorial = ref(false)

// Dialog refs
const gospelDialog = ref(false)
const newGospel = ref({})
const formTitle = ref('')

// Fetch total counts
const fetchTotals = async () => {
  try {
    const [gospelsRes, saintsRes, commentsRes] = await Promise.all([
      GospelsService.getTotal(),
      SaintsService.getTotal(),
      CommentsService.getTotal()
    ])
    totals.value = {
      gospels: gospelsRes,
      saints: saintsRes,
      comments: commentsRes,
      seeds: 0 // Update if seeds service is available
    }
  } catch (error) {
    console.error('Error fetching totals:', error)
  }
}

// Debounced search handler for Gospel search
let searchTimeout
const handleSearch = async (val) => {
  if (!val) {
    gospels.value = []
    return
  }
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    loading.value = true
    try {
      // API call to /search/gospels?query=...
      const response = await GospelsService.search(val)
      // Expected API response:
      // [
      //   {
      //     "gospel_id": 3,
      //     "gospel_verse": "Matteo 3:16"
      //   }
      // ]
      console.log('Search results:', response)
      gospels.value = response
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      loading.value = false
    }
  }, 300)
}

// Fetch recent events
const fetchRecentEvents = async () => {
  try {
    const response = await EventsService.getAll()
    recentEvents.value = response.data.slice(0, 5)
  } catch (error) {
    console.error('Error fetching recent events:', error)
  }
}

// Navigation helper
const navigateTo = (routeName) => {
  router.push({ name: routeName })
}

// Date formatter
const formatDate = (dateStr) => {
  const options = { year: 'numeric', month: 'short', day: 'numeric' }
  return new Date(dateStr).toLocaleDateString(undefined, options)
}

// Initialize charts for Gospels overview
const initializeCharts = async () => {
  try {
    const response = await GospelsService.getAll()
    const gospelsData = response.data
    const gospelsByMonth = {}
    gospelsData.forEach(gospel => {
      const month = new Date(gospel.created_at).toLocaleString('default', { month: 'short' })
      gospelsByMonth[month] = (gospelsByMonth[month] || 0) + 1
    })
    const ctx = document.getElementById('gospelsChart')?.getContext('2d')
    if (!ctx) return
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(gospelsByMonth),
        datasets: [{
          label: 'Vangeli per il mese',
          data: Object.values(gospelsByMonth),
          backgroundColor: 'rgba(139, 69, 19, 0.6)',
          borderColor: 'rgba(139, 69, 19, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    })
  } catch (error) {
    console.error('Error initializing charts:', error)
  }
}

// Dialog handlers
const openGospelDialog = () => {
  newGospel.value = {}
  formTitle.value = 'Aggiungi Nuovo Vangelo'
  gospelDialog.value = true
}

const closeGospelDialog = () => {
  gospelDialog.value = false
  newGospel.value = {}
}

// Save new Gospel (via dialog)
const saveGospel = async () => {
  if (!gospelForm.value?.validate()) return
  savingGospel.value = true
  try {
    await GospelsService.create({
      ...newGospel.value,
      created_by: currentUser.value,
      created_at: currentDateTime.value
    })
    // Refresh the gospel search results in case the new gospel should appear
    await handleSearch(searchGospel.value)
    closeGospelDialog()
  } catch (error) {
    console.error('Error saving gospel:', error)
  } finally {
    savingGospel.value = false
  }
}

// Save the Gospel Way (submission of the main form)
const saveGospelWay = async () => {
  if (!form.value?.validate()) return
  saving.value = true
  try {
    const payload = {
      calendar_date: calendarDate.value,
      gospel_id: selectedGospel.value,
      liturgical_season: liturgicalSeason.value,
      is_solemnity: isSolemnity.value,
      is_feast: isFeast.value,
      is_memorial: isMemorial.value,
      created_by: currentUser.value,
      created_at: currentDateTime.value,
      comment: commentText.value
    }
    await GospelWayService.create(payload)
    // Optionally reset form fields after successful save
    form.value?.reset()
  } catch (error) {
    console.error('Error saving gospel way:', error)
  } finally {
    saving.value = false
  }
}

// Watch search input changes to trigger gospel search
watch(searchGospel, (val) => {
  if (val) handleSearch(val)
})

// Initialize data on component mount
onMounted(() => {
  fetchTotals()
  fetchRecentEvents()
  initializeCharts()
})
</script>

<style scoped>
.v-card {
  transition: box-shadow 0.3s ease;
}
.v-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}
</style>