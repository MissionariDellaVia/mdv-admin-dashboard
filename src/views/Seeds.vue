<template>
  <v-container fluid class="relative-position">
    <!-- Spinner displayed while loading -->
    <div v-if="loading" class="spinner-container">
      <v-progress-circular indeterminate size="64" color="primary" />
    </div>

    <!-- Content displayed when loading is finished -->
    <div v-else>
      <!-- Header -->
      <v-row class="mb-4">
        <v-col cols="12" class="d-flex justify-space-between align-center">
          <h2 class="title">Semini</h2>
          <v-btn color="primary" @click="openSeedDialog">
            Aggiungi Seed
          </v-btn>
        </v-col>
      </v-row>

      <!-- Seeds List -->
      <v-row>
        <v-col cols="12" md="6" v-for="seed in seeds" :key="seed.seed_id">
          <v-card outlined class="mb-4 fill-height">
            <v-card-title class="headline">{{ seed.reference }}</v-card-title>
            <v-card-text>
              <div class="mb-2">
                <strong>Verse:</strong>
                <span>{{ seed.verse_text }}</span>
              </div>
              <div class="mb-2">
                <strong>Colore:</strong>
                <span>{{ seed.color }}</span>
              </div>
              <div class="mb-2">
                <strong>Creato il:</strong>
                <span>{{ new Date(seed.created_at).toLocaleDateString() }}</span>
              </div>
            </v-card-text>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-icon class="action-icon" @click="editSeed(seed)">mdi-pencil</v-icon>
              <v-icon class="action-icon" @click="deleteSeed(seed.seed_id)">mdi-delete</v-icon>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>

      <!-- Dialog for Adding/Editing a Seed -->
      <v-dialog v-model:model-value="seedDialog" max-width="600">
        <v-card>
          <v-card-title class="text-center">{{ seedFormTitle }}</v-card-title>
          <v-card-text>
            <v-form ref="seedForm" v-model="valid">
              <v-textarea
                  v-model="currentSeed.verse_text"
                  label="Verse Text"
                  rows="3"
                  required
              ></v-textarea>
              <v-text-field
                  v-model="currentSeed.color"
                  label="Colore"
              ></v-text-field>
              <v-text-field
                  v-model="currentSeed.reference"
                  label="Reference"
                  required
              ></v-text-field>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="brown darken-1" @click="closeSeedDialog">Chiudi</v-btn>
            <v-btn color="brown darken-1" @click="saveSeed">Salva</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Snackbar for Error Feedback -->
      <v-snackbar v-model="errorSnackbar" timeout="5000" top>
        {{ errorText }}
        <template #actions>
          <v-btn color="red" text @click="errorSnackbar = false">
            Chiudi
          </v-btn>
        </template>
      </v-snackbar>
    </div>
  </v-container>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import SeedsService from '../services/SeedsService'

const seeds = ref([])
const loading = ref(true)
const seedDialog = ref(false)
const valid = ref(false)
const seedFormTitle = ref('')
const currentSeed = ref({})

// Snackbar for error feedback
const errorSnackbar = ref(false)
const errorText = ref('')

// Fetch all seeds from the API
const fetchSeeds = async () => {
  try {
    const response = await SeedsService.getAll()
    seeds.value = response.data
  } catch (error) {
    errorText.value = 'Errore durante il caricamento dei seeds.'
    errorSnackbar.value = true
    console.error('Error fetching seeds:', error)
  } finally {
    loading.value = false
  }
}

// Open dialog for a new seed
const openSeedDialog = () => {
  currentSeed.value = {}
  seedFormTitle.value = 'Aggiungi Nuovo Semino'
  seedDialog.value = true
}

// Close seed dialog
const closeSeedDialog = () => {
  seedDialog.value = false
}

// Save seed (create or update)
const saveSeed = async () => {
  if (!valid.value) return
  try {
    if (currentSeed.value.seed_id) {
      await SeedsService.update(currentSeed.value.seed_id, currentSeed.value)
    } else {
      await SeedsService.create(currentSeed.value)
    }
    await fetchSeeds()
    closeSeedDialog()
  } catch (error) {
    errorText.value = 'Errore durante il salvataggio del semino.'
    errorSnackbar.value = true
    console.error('Error saving seed:', error)
  }
}

// Open edit dialog with populated seed data
const editSeed = (seed) => {
  currentSeed.value = { ...seed }
  seedFormTitle.value = 'Modifica Semino'
  seedDialog.value = true
}

// Delete a seed by id
const deleteSeed = async (seedId) => {
  try {
    await SeedsService.delete(seedId)
    await fetchSeeds()
  } catch (error) {
    errorText.value = 'Errore durante la cancellazione del semino.'
    errorSnackbar.value = true
    console.error('Error deleting seed:', error)
  }
}

onMounted(async () => {
  await fetchSeeds()
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