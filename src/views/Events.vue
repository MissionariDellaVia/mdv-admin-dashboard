<template>
  <v-container fluid>
    <!-- Loading Spinner Overlay -->
    <!-- Replace :value with v-model:active to properly bind the overlay in Vuetify 3.7.0 -->
    <v-overlay v-model:active="loading" absolute>
      <v-progress-circular indeterminate size="64"></v-progress-circular>
    </v-overlay>

    <!-- Header -->
    <v-row class="mb-4">
      <v-col cols="12" class="d-flex justify-space-between align-center">
        <h2 class="title">Eventi</h2>
        <v-btn color="primary" @click="openEventDialog">
          Aggiungi Evento
        </v-btn>
      </v-col>
    </v-row>

    <!-- Events List -->
    <v-row v-if="!loading">
      <v-col cols="12" md="6" v-for="event in events" :key="event.event_id">
        <v-card outlined class="mb-4 fill-height">
          <v-card-title class="headline">{{ event.title }}</v-card-title>
          <v-card-text>
            <div class="mb-2" v-if="event.description">
              <strong>Descrizione: </strong>
              <span>{{ event.description }}</span>
            </div>
            <!-- If the event is marked as Santa Messa, the start date is fixed -->
            <div class="mb-2" v-if="!event.is_holy_mass">
              <strong>Data Inizio: </strong>
              <span>
                {{ event.start_date }}
                <span v-if="event.start_time">
                  - {{ formatTime(event.start_time) }}
                </span>
              </span>
            </div>
            <div class="mb-2" v-else>
              <strong>Data Inizio: </strong>
              <span>
                {{ event.start_date }} (Impostata automaticamente per la Santa Messa)
                <span v-if="event.start_time">
                  - {{ formatTime(event.start_time) }}
                </span>
              </span>
            </div>
            <div class="mb-2" v-if="!event.is_holy_mass && event.end_date && event.end_date !== '9999-01-01'">
              <strong>Data Fine: </strong>
              <span>
                {{ event.end_date }}
                <span v-if="event.end_time">
                  - {{ formatTime(event.end_time) }}
                </span>
              </span>
            </div>
            <div class="mb-2" v-if="event.is_recurring && event.recurrence_pattern">
              <strong>Ricorrenza: </strong>
              <span>{{ event.recurrence_pattern }}</span>
            </div>
            <div class="mb-2">
              <strong>Luogo: </strong>
              <span>{{ getPlaceName(event.place_id) }}</span>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-icon class="action-icon" @click="editEvent(event)">mdi-pencil</v-icon>
            <v-icon class="action-icon" @click="deleteEvent(event.event_id)">mdi-delete</v-icon>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Dialog for Adding/Editing an Event -->
    <v-dialog v-model:model-value="eventDialog" max-width="600">
      <v-card>
        <v-card-title class="text-center">{{ eventFormTitle }}</v-card-title>
        <v-card-text>
          <v-form ref="eventForm" v-model="valid">
            <v-text-field
                v-model="currentEvent.title"
                label="Titolo"
                required
            ></v-text-field>
            <v-textarea
                v-model="currentEvent.description"
                label="Descrizione"
                rows="3"
            ></v-textarea>

            <!-- Checkbox for Santa Messa -->
            <v-checkbox
                v-model="currentEvent.is_holy_mass"
                label="Santa Messa"
                @change="handleHolyMassChange"
            ></v-checkbox>

            <!-- If NOT a Santa Messa, show date fields -->
            <template v-if="!currentEvent.is_holy_mass">
              <!-- Checkbox for Recurring Event -->
              <v-checkbox
                  v-model="currentEvent.is_recurring"
                  label="Evento Ricorrente"
                  @change="handleRecurringChange"
              ></v-checkbox>

              <div class="mb-2">
                <em>Il campo "Luogo libero" può non essere inserito e si riferesce ai luoghi che non sono stati aggiunti. Es. Evento in "Sila"</em>
              </div>
              <v-text-field
                  v-model="currentEvent.place"
                  label="Luogo libero "
              ></v-text-field>

              <v-text-field
                  v-model="currentEvent.start_date"
                  label="Data Inizio"
                  type="date"
                  required
              ></v-text-field>
              <v-text-field
                  v-model="currentEvent.end_date"
                  label="Data Fine"
                  type="date"
              ></v-text-field>
            </template>
            <!-- For Santa Messa, inform that start_date is fixed to today and end_date/end_time are default -->
            <template v-else>
              <div class="mb-2">
                <strong>Data Inizio: </strong>
                <span>{{ currentEvent.start_date }}</span>
              </div>
              <div class="mb-2">
                <em>Selezionando il flag "Santa Messa", la data d'inizio è impostata a oggi e la data di fine e l'ora di fine sono predefiniti.</em>
              </div>
            </template>

            <!-- Ora Inizio deve essere visualizzata in formato "HH:MM" -->
            <v-text-field
                v-model="currentEvent.start_time"
                label="Ora Inizio (HH:MM)"
                :rules="[validateTimeFormat]"
                required
            ></v-text-field>

            <!-- If event is recurring, show recurrence configuration -->
            <template v-if="currentEvent.is_recurring">
              <v-row>
                <v-col cols="12" sm="6">
                  <v-select
                      v-model="recurrenceFrequency"
                      :items="frequencyOptions"
                      item-title="title"
                      item-value="value"
                      label="FREQ (Frequenza)"
                      required
                  ></v-select>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-select
                      v-model="recurrenceByday"
                      :items="dayOptions"
                      item-title="title"
                      item-value="value"
                      label="BYDAY (Giorno della Settimana)"
                      required
                  ></v-select>
                </v-col>
              </v-row>
              <v-alert type="info" dense>
                La ricorrenza verrà impostata come: FREQ={{ recurrenceFrequency }};BYDAY={{ recurrenceByday }}.<br />
                Frequenze disponibili: Settimanale (WEEKLY), Giornaliero (DAILY), Mensile (MONTHLY).<br />
                I giorni sono rappresentati dalle prime due lettere in inglese, ad esempio: MO (Lunedì), TU (Martedì), WE (Mercoledì), TH (Giovedì), FR (Venerdì), SA (Sabato), SU (Domenica).
              </v-alert>
            </template>

            <!-- Luogo -->
            <v-select
                v-model="currentEvent.place_id"
                :items="places"
                item-title="name"
                item-value="place_id"
                label="Luogo"
                required
            ></v-select>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="brown darken-1" @click="closeEventDialog">Chiudi</v-btn>
          <v-btn color="brown darken-1" @click="saveEvent">Salva</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar for Error Feedback -->
    <v-snackbar v-model="errorSnackbar" timeout="5000" top>
      {{ errorText }}
      <template #actions>
        <v-btn color="red" text="error" @click="errorSnackbar = false">
          Chiudi
        </v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import EventsService from '../services/EventsService'
import PlacesService from '../services/PlacesService'

const events = ref([])
const places = ref([])
const loading = ref(true)
const eventDialog = ref(false)
const valid = ref(false)
const eventFormTitle = ref('')
const currentEvent = ref({})

// New reactive variables for recurrence configuration
const recurrenceFrequency = ref(null)
const recurrenceByday = ref(null)
const frequencyOptions = [
  { value: 'WEEKLY', title: 'Settimanale' },
  { value: 'DAILY', title: 'Giornaliero' },
  { value: 'MONTHLY', title: 'Mensile' }
]
const dayOptions = [
  { value: 'MO', title: 'MO (Lunedì)' },
  { value: 'TU', title: 'TU (Martedì)' },
  { value: 'WE', title: 'WE (Mercoledì)' },
  { value: 'TH', title: 'TH (Giovedì)' },
  { value: 'FR', title: 'FR (Venerdì)' },
  { value: 'SA', title: 'SA (Sabato)' },
  { value: 'SU', title: 'SU (Domenica)' }
]

// Snackbar for error feedback
const errorSnackbar = ref(false)
const errorText = ref('')

// Utility function to convert a time string to HH:MM:SS format for payloads
const convertTimeForPayload = (timeStr) => {
  // If the time is in HH:MM, append :00 to have HH:MM:SS
  if (/^\d{2}:\d{2}$/.test(timeStr)) {
    return `${timeStr}:00`
  }
  // If already in HH:MM:SS, return as is
  if (/^\d{2}:\d{2}:\d{2}$/.test(timeStr)) {
    return timeStr
  }
  // Fallback using simple padding logic
  const timeParts = timeStr.split(':')
  if (timeParts.length === 2) {
    let [hh, mm] = timeParts
    hh = hh.padStart(2, '0')
    mm = mm.padStart(2, '0')
    return `${hh}:${mm}:00`
  }
  if (timeParts.length === 3) {
    let [hh, mm, ss] = timeParts
    hh = hh.padStart(2, '0')
    mm = mm.padStart(2, '0')
    ss = ss.padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  }
  return timeStr
}

// Format time for display in the event list (extract HH:MM from payload "Y-m-d H:i:s")
const formatTime = (dateTime) => {
  if (!dateTime) return ""
  const parts = dateTime.split(" ")
  if (parts.length < 2) return dateTime
  return parts[1].slice(0, 5)
}

// Fetch all events from the API
const fetchEvents = async () => {
  try {
    const response = await EventsService.getAll()
    events.value = response.data
  } catch (error) {
    errorText.value = 'Errore durante il caricamento degli eventi.'
    errorSnackbar.value = true
    console.error('Error fetching events:', error)
  } finally {
    loading.value = false
  }
}

// Fetch all places from the API
const fetchPlaces = async () => {
  try {
    const response = await PlacesService.getAll()
    places.value = response.data
  } catch (error) {
    errorText.value = 'Errore durante il caricamento dei luoghi.'
    errorSnackbar.value = true
    console.error('Error fetching places:', error)
  }
}

// Utility to lookup the name of a place given its id
const getPlaceName = (placeId) => {
  const selectedPlace = places.value.find(place => place.place_id === placeId)
  return selectedPlace ? selectedPlace.name : ''
}

// Handle changes when "Santa Messa" is toggled
const handleHolyMassChange = () => {
  if (currentEvent.value.is_holy_mass) {
    // For Santa Messa, fix the start_date to today and clear end date/time
    currentEvent.value.start_date = new Date().toISOString().slice(0, 10)
    currentEvent.value.end_date = '9999-01-01' // default end date
    currentEvent.value.end_time = ""
  }
}

// Handle changes when "Evento Ricorrente" is toggled
const handleRecurringChange = () => {
  if (!currentEvent.value.is_recurring) {
    // Clear recurrence configuration if unchecked
    recurrenceFrequency.value = null
    recurrenceByday.value = null
    currentEvent.value.recurrence_pattern = ""
  }
}

// Watchers to update recurrence_pattern when frequency or day selection changes
watch([recurrenceFrequency, recurrenceByday], () => {
  if (recurrenceFrequency.value && recurrenceByday.value) {
    currentEvent.value.recurrence_pattern = `FREQ=${recurrenceFrequency.value};BYDAY=${recurrenceByday.value}`
  } else {
    currentEvent.value.recurrence_pattern = ""
  }
})

// Open dialog for a new event
const openEventDialog = () => {
  currentEvent.value = {}
  // Default values for a new event
  currentEvent.value.is_holy_mass = false
  currentEvent.value.is_recurring = false
  currentEvent.value.recurrence_pattern = ""
  eventFormTitle.value = 'Aggiungi Nuovo Evento'
  eventDialog.value = true
}

// Close event dialog
const closeEventDialog = () => {
  eventDialog.value = false
}

// Save event: adjust the start_time and end_time format before sending the payload
const saveEvent = async () => {
  if (!valid.value) return

  // Adjust start_time: combine currentEvent.start_date with converted start_time
  if (currentEvent.value.start_time) {
    const startTimeConverted = convertTimeForPayload(currentEvent.value.start_time)
    currentEvent.value.start_time = `${currentEvent.value.start_date} ${startTimeConverted}`
  }

  // Adjust end_time: if provided, combine currentEvent.end_date with converted end_time.
  if (currentEvent.value.end_time && currentEvent.value.end_date) {
    const endTimeConverted = convertTimeForPayload(currentEvent.value.end_time)
    currentEvent.value.end_time = `${currentEvent.value.end_date} ${endTimeConverted}`
  }

  try {
    if (currentEvent.value.event_id) {
      await EventsService.update(currentEvent.value.event_id, currentEvent.value)
    } else {
      await EventsService.create(currentEvent.value)
    }
    await fetchEvents()
    closeEventDialog()
  } catch (error) {
    errorText.value = 'Errore durante il salvataggio dell\'evento.'
    errorSnackbar.value = true
    console.error('Error saving event:', error)
  }
}

const validateTimeFormat = (value) => {
  const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/
  return timePattern.test(value) || 'Il formato deve essere HH:MM'
}

// Open edit dialog with populated event data
const editEvent = (event) => {
  currentEvent.value = { ...event }
  // When editing, adjust start_time for the input field (display only "HH:MM")
  if (currentEvent.value.start_time) {
    const parts = currentEvent.value.start_time.split(" ")
    if (parts.length === 2) {
      currentEvent.value.start_time = parts[1].slice(0, 5)
    }
  }
  // When editing, adjust end_time for the input field similarly
  if (currentEvent.value.end_time) {
    const parts = currentEvent.value.end_time.split(" ")
    if (parts.length === 2) {
      currentEvent.value.end_time = parts[1].slice(0, 5)
    }
  }
  // If editing a recurring event, parse recurrence_pattern to set frequency and day
  if (currentEvent.value.is_recurring && currentEvent.value.recurrence_pattern) {
    const parts = currentEvent.value.recurrence_pattern.split(';')
    parts.forEach(part => {
      const [key, value] = part.split('=')
      if (key === 'FREQ') {
        recurrenceFrequency.value = value
      }
      if (key === 'BYDAY') {
        recurrenceByday.value = value
      }
    })
  } else {
    recurrenceFrequency.value = null
    recurrenceByday.value = null
  }
  eventFormTitle.value = 'Modifica Evento'
  eventDialog.value = true
}

// Delete an event by id
const deleteEvent = async (eventId) => {
  try {
    await EventsService.delete(eventId)
    await fetchEvents()
  } catch (error) {
    errorText.value = 'Errore durante la cancellazione dell\'evento.'
    errorSnackbar.value = true
    console.error('Error deleting event:', error)
  }
}

onMounted(async () => {
  await Promise.all([fetchEvents(), fetchPlaces()])
})
</script>

<style scoped>
.title {
  font-weight: 600;
  font-size: 1.5rem;
}
.v-card {
  transition: box-shadow 0.3s ease;
}
.v-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}
.action-icon {
  cursor: pointer;
  margin: 0 4px;
  transition: color 0.3s;
}
.action-icon:hover {
  color: #1976D2;
}
.mb-2 {
  margin-bottom: 0.5rem;
}
.mb-4 {
  margin-bottom: 1rem;
}
</style>