<template>
  <v-container fluid class="relative-position">
    <!-- Spinner shown while overall loading is true -->
    <div v-if="loading" class="spinner-container">
      <v-progress-circular indeterminate size="64" color="primary" />
    </div>

    <!-- Content displayed when loading is complete -->
    <div v-else>
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

      <!-- Quick Actions Section -->
      <v-row>
        <v-col cols="12">
          <v-card outlined class="pa-4">
            <v-card-title class="text-center">Azioni rapide</v-card-title>
            <v-card-text>
              <v-row>
                <v-col cols="12" sm="6">
                  <v-btn color="primary" block @click="openGospelDialog">
                    Aggiungi Nuovo Vangelo
                  </v-btn>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-btn color="primary" block @click="openSaintDialog">
                    Aggiungi un Santo
                  </v-btn>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-divider class="my-6"></v-divider>

      <!-- Events Section -->
      <v-row>
        <v-col cols="12" md="6">
          <v-card outlined>
            <v-card-title class="pa-5">Luoghi e Contatti</v-card-title>
            <v-card-text class="carousel-container">
              <div class="carousel-wrapper">
                <v-btn icon="prev" class="carousel-nav-btn prev" @click="prevSlide">
                  <v-icon size="36">mdi-chevron-left</v-icon>
                </v-btn>
                <v-carousel v-model="carouselIndex" cycle :show-arrows="false" hide-delimiter-background height="300">
                  <v-carousel-item v-for="place in places" :key="place.place_id">
                    <v-card flat class="no-shadow pa-4">
                      <v-card-title class="headline">{{ place.name }}</v-card-title>
                      <v-card-subtitle>
                        {{ place.street }}, {{ place.city }}, {{ place.state }}, {{ place.postal_code }}
                      </v-card-subtitle>
                      <v-divider class="my-4"></v-divider>
                      <v-list dense>
                        <v-list-item v-for="contact in place.contacts" :key="contact.contact_id">
                          <v-list-item-content>
                            <v-list-item-title class="font-weight-bold">{{ contact.contact_type_description }}</v-list-item-title>
                            <v-list-item-subtitle>{{ contact.contact_value }}</v-list-item-subtitle>
                          </v-list-item-content>
                        </v-list-item>
                      </v-list>
                    </v-card>
                  </v-carousel-item>
                </v-carousel>
                <v-btn icon="next" class="carousel-nav-btn next" @click="nextSlide">
                  <v-icon size="36">mdi-chevron-right</v-icon>
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="6">
          <v-card outlined class="fill-height">
            <v-card-title class="pa-5">
              Eventi recenti
              <v-btn text="all events" color="primary" class="float-end rounded-pill" @click="navigateTo('Events')">
                visualizza tutti
              </v-btn>
            </v-card-title>
            <v-card-text>
              <v-list two-line>
                <template v-if="recentEvents.length">
                  <v-list-item v-for="event in recentEvents" :key="event.id">
                    <v-list-item-content>
                      <v-list-item-title>{{ event.title }}</v-list-item-title>
                      <v-list-item-subtitle>
                        <template v-if="event.is_holy_mass">
                          Ore: <strong>{{ formatTime(event.start_time) }}</strong> presso: <strong>{{ event.place.name }}</strong>
                        </template>
                        <template v-else-if="event.is_recurring">
                          Data Inizio: {{ event.start_date }}
                          <span>
                            Frequenza: <strong>{{ translateFrequency(event.recurrence_pattern) }}</strong>,
                            Ogni: <strong>{{ translateDay(event.recurrence_pattern) }}</strong>
                          </span>
                        </template>
                        <template v-else>
                          {{ event.start_date }} alle {{ formatTime(event.start_time) }} presso: {{ event.place.name }}
                        </template>
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
      </v-row>

      <v-divider class="my-6"></v-divider>

      <!-- Add Gospel Way Form Section -->
      <v-row>
        <v-col cols="12" md="12">
          <v-card outlined>
            <v-card-title class="text-center pa-5">
              Aggiungi un commento al Vangelo
            </v-card-title>
            <v-card-text class="text-center">
              <v-form ref="form" v-model="valid">
                <!-- Gospel Search/Select with v-autocomplete -->
                <div class="mb-2">
                  <em>Scrivi il versetto del Vangelo da commentare, se è presente nel sistema comparirà nel menù a tendina. es. Mc 13,23</em>
                </div>
                <v-autocomplete
                    v-model="selectedGospel"
                    :items="gospels"
                    :loading="loadingGospels"
                    item-title="gospel_verse"
                    item-value="gospel_id"
                    :search-input="searchGospel"
                    @update:search="handleSearch"
                    label="Cerca un versetto..."
                    hide-no-data
                    clearable
                ></v-autocomplete>

                <!-- New Autocomplete for fetching saint_id -->
                <div class="mb-2">
                  <em>Scrivi il nome del Santo da ricercare, se è presente nel sistema comparirà nel menù a tendina. es. San Francesco</em>
                </div>
                <v-autocomplete
                    class="mt-4"
                    v-model="selectedSaintForComment"
                    :items="saints"
                    :loading="loadingSaints"
                    item-title="name"
                    item-value="saint_id"
                    :search-input="searchSaint"
                    @update:search="handleSaintSearch"
                    label="Cerca un Santo..."
                    hide-no-data
                    clearable
                ></v-autocomplete>

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

                <!-- Submit Button -->
                <v-btn color="brown darken-1" :loading="saving" @click="saveGospelWay">
                  Salva
                </v-btn>
              </v-form>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- Add/Edit Gospel Dialog -->
    <v-dialog v-model:model-value="gospelDialog" max-width="600px">
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

    <!-- Add/Edit Saint Dialog -->
    <v-dialog v-model:model-value="saintDialog" max-width="600px">
      <v-card>
        <v-card-title class="text-center my-5">
          <span class="text-h5">Aggiungi un Santo</span>
        </v-card-title>
        <v-card-text>
          <v-form ref="saintForm" v-model="valid">
            <v-text-field
                v-model="newSaint.name"
                label="Nome"
                required
                :rules="[v => !!v || 'Nome richiesto']"
            ></v-text-field>
            <v-textarea
                v-model="newSaint.biography"
                label="Biografia"
                required
                :rules="[v => !!v || 'Biografia richiesta']"
            ></v-textarea>
            <v-text-field
                v-model="newSaint.recurrence_date"
                label="Data di Recorrenza"
                type="date"
                required
                :rules="[v => !!v || 'Data richiesta']"
            ></v-text-field>
            <v-text-field
                v-model="newSaint.feast_day"
                label="Giorno della Festa"
                type="date"
                required
                :rules="[v => !!v || 'Data richiesta']"
            ></v-text-field>
            <v-checkbox
                v-model="newSaint.is_active"
                label="Attivo"
            ></v-checkbox>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="brown darken-1" @click="closeSaintDialog">Chiudi</v-btn>
          <v-btn color="brown darken-1" :loading="savingSaint" @click="saveSaint">
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
import GospelsService from '../services/GospelsService'
import SaintsService from '../services/SaintsService'
import CommentsService from '../services/CommentsService'
import EventsService from '../services/EventsService'
import GospelWayService from '../services/GospelWayService'
import PlacesService from '../services/PlacesService'

// Current date/time and user information
const currentDateTime = ref('2025-02-05 21:13:23')
const currentUser = ref('Alessandro-Mac7')

// Router
const router = useRouter()

// Form and validation refs
const form = ref(null)
const gospelForm = ref(null)
const saintForm = ref(null)
const valid = ref(false)
const loading = ref(true)
const saving = ref(false)
const savingGospel = ref(false)
const savingSaint = ref(false)
const loadingGospels = ref(false)

// Data refs for totals, events, gospels
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

// New data ref for places
const places = ref([])

// Data refs for saints autocomplete in the form
const saints = ref([])
const selectedSaintForComment = ref(null)
const searchSaint = ref('')
const loadingSaints = ref(false)
let saintSearchTimeout = null

// Carousel control ref for current slide index
const carouselIndex = ref(0)

// Dialog refs
const gospelDialog = ref(false)
const saintDialog = ref(false)
const newGospel = ref({})
const newSaint = ref({})
const formTitle = ref('')

// Fetch totals
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
      seeds: 0
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
    loadingGospels.value = true
    try {
      const response = await GospelsService.search(val)
      gospels.value = response
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      loadingGospels.value = false
    }
  }, 300)
}

// Debounced search handler for Saint search (autocomplete)
const handleSaintSearch = async (val) => {
  if (!val) {
    saints.value = []
    return
  }
  clearTimeout(saintSearchTimeout)
  saintSearchTimeout = setTimeout(async () => {
    loadingSaints.value = true
    try {
      const response = await SaintsService.search(val)
      saints.value = response
    } catch (error) {
      console.error('Saint search error:', error)
    } finally {
      loadingSaints.value = false
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

// Fetch places and contacts data
const fetchPlaces = async () => {
  try {
    const response = await PlacesService.getAll()
    places.value = response.data
  } catch (error) {
    console.error('Error fetching places:', error)
  }
}

// Navigation helper
const navigateTo = (routeName) => {
  router.push({name: routeName})
}

// Date formatter
const formatDate = (dateStr) => {
  const options = {year: 'numeric', month: 'short', day: 'numeric'}
  return new Date(dateStr).toLocaleDateString(undefined, options)
}

// Carousel navigation functions
const nextSlide = () => {
  if (places.value.length > 0) {
    carouselIndex.value = (carouselIndex.value + 1) % places.value.length
  }
}
const prevSlide = () => {
  if (places.value.length > 0) {
    carouselIndex.value = (carouselIndex.value - 1 + places.value.length) % places.value.length
  }
}

// Dialog handlers for Gospel Dialog
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
    await GospelsService.create({...newGospel.value})
    await handleSearch(searchGospel.value)
    closeGospelDialog()
  } catch (error) {
    console.error('Error saving gospel:', error)
  } finally {
    savingGospel.value = false
  }
}

// Dialog handlers for Saint Dialog
const openSaintDialog = () => {
  newSaint.value = {}
  saintDialog.value = true
}
const closeSaintDialog = () => {
  saintDialog.value = false
  newSaint.value = {}
}

// Save new Saint (via dialog)
const saveSaint = async () => {
  if (!saintForm.value?.validate()) return
  savingSaint.value = true
  try {
    await SaintsService.create({...newSaint.value})
    // Refresh totals and saints autocomplete data if needed
    await fetchTotals()
    closeSaintDialog()
  } catch (error) {
    console.error('Error saving saint:', error)
  } finally {
    savingSaint.value = false
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
      created_by: currentUser.value,
      created_at: currentDateTime.value,
      comment: commentText.value,
      saint_id: selectedSaintForComment.value
    }
    await GospelWayService.create(payload)
    form.value?.reset()
  } catch (error) {
    console.error('Error saving gospel way:', error)
  } finally {
    saving.value = false
  }
}

// Utility functions for recurring events
const translateFrequency = (pattern) => {
  const translations = {
    'FREQ=WEEKLY': 'Settimanale',
    'FREQ=DAILY': 'Giornaliero',
    'FREQ=MONTHLY': 'Mensile'
  }
  const freq = pattern.split(';')[0]
  return translations[freq] || pattern
}

const translateDay = (pattern) => {
  const translations = {
    'BYDAY=MO': 'Lunedì',
    'BYDAY=TU': 'Martedì',
    'BYDAY=WE': 'Mercoledì',
    'BYDAY=TH': 'Giovedì',
    'BYDAY=FR': 'Venerdì',
    'BYDAY=SA': 'Sabato',
    'BYDAY=SU': 'Domenica'
  }
  const day = pattern.split(';')[1]
  return translations[day] || pattern
}

const formatTime = (dateTime) => {
  if (!dateTime) return ""
  const parts = dateTime.split(" ")
  return parts.length > 1 ? parts[1] : dateTime
}

// Watch search input changes to trigger gospel and saint search
watch(searchGospel, (val) => {
  if (val) handleSearch(val)
})
watch(searchSaint, (val) => {
  if (val) handleSaintSearch(val)
})

// Initialize all data on component mount
onMounted(() => {
  Promise.all([fetchTotals(), fetchRecentEvents(), fetchPlaces()]).then(() => {
    loading.value = false
  })
})
</script>

<style scoped>
.relative-position {
  position: relative;
  min-height: 100vh;
}

.spinner-container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 9999;
}

/* Updated Styles for carousel navigation placed outside card content */
.carousel-container {
  position: relative;
  overflow: hidden;
}

.carousel-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  /* Adding padding to ensure carousel content isn't overlapped by nav buttons */
  padding: 0 60px;
}

.carousel-nav-btn {
  position: absolute;
  z-index: 2;
  background-color: rgb(206, 198, 194);
  color: #f0eeed;
  top: 50%;
  transform: translateY(-50%);
}

.carousel-nav-btn.prev {
  left: 10px;
}

.carousel-nav-btn.next {
  right: 10px;
}

.v-card {
  transition: box-shadow 0.3s ease;
}

.v-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.no-shadow {
  box-shadow: none !important;
}
</style>