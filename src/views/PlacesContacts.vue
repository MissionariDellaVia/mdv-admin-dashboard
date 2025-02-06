<template>
  <v-container fluid class="relative-position">
    <!-- Simple centered spinner shown while loading places and contacts -->
    <div v-if="loading" class="spinner-container">
      <v-progress-circular indeterminate size="64" color="primary" />
    </div>

    <!-- Content displayed when loading is finished -->
    <v-row v-else>
      <!-- Places Section -->
      <v-col cols="12" md="6">
        <v-card outlined class="fill-height">
          <v-card-title class="text-center">Luoghi</v-card-title>
          <v-card-text>
            <v-btn class="ml-3" color="primary" @click="openPlaceDialog">Aggiungi Luogo</v-btn>
            <v-list>
              <v-list-item v-for="place in places" :key="place.place_id">
                <v-list-item-content>
                  <v-list-item-title>
                    {{ place.name }}
                    <v-icon class="float-end action-icon" @click="deletePlace(place.place_id)">mdi-delete</v-icon>
                    <v-icon class="float-end action-icon" @click="editPlace(place)">mdi-pencil</v-icon>
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    {{ place.street }}, {{ place.city }} {{ place.postal_code }}, {{ place.state }}
                  </v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Contacts Section -->
      <v-col cols="12" md="6">
        <v-card outlined class="fill-height">
          <v-card-title class="text-center">Contatti</v-card-title>
          <v-card-text>
            <v-btn class="ml-3" color="primary" @click="openContactDialog">Aggiungi Contatto</v-btn>
            <v-list>
              <v-list-item v-for="contact in contacts" :key="contact.contact_id">
                <v-list-item-content>
                  <v-list-item-title>
                    {{ contact.contact_value }}
                    <v-icon class="float-end action-icon" @click="deleteContact(contact.contact_id)">mdi-delete</v-icon>
                    <v-icon class="float-end action-icon" @click="editContact(contact)">mdi-pencil</v-icon>
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    {{ contact.contact_type }} - {{ contact.contact_group }}
                  </v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Dialog for Adding/Editing Place -->
    <v-dialog v-model:model-value="placeDialog" max-width="600">
      <v-card>
        <v-card-title class="text-center">{{ placeFormTitle }}</v-card-title>
        <v-card-text>
          <v-form ref="placeForm" v-model="valid">
            <v-text-field v-model="currentPlace.name" label="Nome" required />
            <v-text-field v-model="currentPlace.street" label="Via" />
            <v-text-field v-model="currentPlace.city" label="Città" required />
            <v-text-field v-model="currentPlace.state" label="Stato" required />
            <v-text-field v-model="currentPlace.postal_code" label="CAP" />
            <v-text-field v-model="currentPlace.latitude" label="Latitudine" />
            <v-text-field v-model="currentPlace.longitude" label="Longitudine" />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="brown darken-1" @click="closePlaceDialog">Chiudi</v-btn>
          <v-btn color="brown darken-1" @click="savePlace">Salva</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog for Adding/Editing Contact -->
    <v-dialog v-model:model-value="contactDialog" max-width="600">
      <v-card>
        <v-card-title class="text-center">{{ contactFormTitle }}</v-card-title>
        <v-card-text>
          <v-form ref="contactForm" v-model="valid">
            <v-select
                v-model="currentContact.contact_type"
                :items="contactTypes"
                label="Tipo di Contatto"
                required
            />
            <v-text-field
                v-model="currentContact.contact_group"
                label="Gruppo di Contatto"
            />
            <v-text-field
                v-model="currentContact.contact_type_description"
                label="Descrizione del Tipo di Contatto"
            />
            <v-text-field
                v-model="currentContact.contact_value"
                label="Valore del Contatto"
                required
            />
            <v-select
                v-model="currentContact.place_id"
                :items="places"
                item-title="name"
                item-value="place_id"
                label="Luogo"
            />
            <v-checkbox
                v-model="currentContact.is_active"
                label="Attivo"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="brown darken-1" @click="closeContactDialog">Chiudi</v-btn>
          <v-btn color="brown darken-1" @click="saveContact">Salva</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import {ref, onMounted} from 'vue'
import PlacesService from '../services/PlacesService'
import ContactsService from '../services/ContactsService'

const places = ref([])
const contacts = ref([])
const loading = ref(true)
const placeDialog = ref(false)
const contactDialog = ref(false)
const valid = ref(false)
const currentPlace = ref({})
const currentContact = ref({})
const placeFormTitle = ref('')
const contactFormTitle = ref('')
const contactTypes = ref(['Email', 'Phone', 'Fax', 'Other'])

const fetchPlaces = async () => {
  try {
    const response = await PlacesService.getAll()
    places.value = response.data
  } catch (error) {
    console.error('Error fetching places:', error)
  }
}

const fetchContacts = async () => {
  try {
    const response = await ContactsService.getAll()
    contacts.value = response.data
  } catch (error) {
    console.error('Error fetching contacts:', error)
  }
}

const openPlaceDialog = () => {
  currentPlace.value = {}
  placeFormTitle.value = 'Aggiungi Nuovo Luogo'
  placeDialog.value = true
}

const closePlaceDialog = () => {
  placeDialog.value = false
}

const savePlace = async () => {
  if (!valid.value) return
  try {
    if (currentPlace.value.place_id) {
      await PlacesService.update(currentPlace.value.place_id, currentPlace.value)
    } else {
      await PlacesService.create(currentPlace.value)
    }
    await fetchPlaces()
    closePlaceDialog()
  } catch (error) {
    console.error('Error saving place:', error)
  }
}

const editPlace = (place) => {
  currentPlace.value = {...place}
  placeFormTitle.value = 'Modifica Luogo'
  placeDialog.value = true
}

const deletePlace = async (id) => {
  try {
    await PlacesService.delete(id)
    await fetchPlaces()
  } catch (error) {
    console.error('Error deleting place:', error)
  }
}

const openContactDialog = () => {
  currentContact.value = {}
  contactFormTitle.value = 'Aggiungi Nuovo Contatto'
  contactDialog.value = true
}

const closeContactDialog = () => {
  contactDialog.value = false
}

const saveContact = async () => {
  if (!valid.value) return
  try {
    if (currentContact.value.contact_id) {
      await ContactsService.update(currentContact.value.contact_id, currentContact.value)
    } else {
      await ContactsService.create(currentContact.value)
    }
    await fetchContacts()
    closeContactDialog()
  } catch (error) {
    console.error('Error saving contact:', error)
  }
}

const editContact = (contact) => {
  currentContact.value = {...contact}
  contactFormTitle.value = 'Modifica Contatto'
  contactDialog.value = true
}

const deleteContact = async (id) => {
  try {
    await ContactsService.delete(id)
    await fetchContacts()
  } catch (error) {
    console.error('Error deleting contact:', error)
  }
}

onMounted(async () => {
  await Promise.all([fetchPlaces(), fetchContacts()])
  loading.value = false
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
</style>