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
          <h2 class="title">Contenuto Pagine</h2>
          <v-btn color="primary" @click="openContentDialog">
            Aggiungi Contenuto
          </v-btn>
        </v-col>
      </v-row>

      <!-- Text Contents List -->
      <v-row>
        <v-col cols="12" md="6" v-for="content in contents" :key="content.content_id">
          <v-card outlined class="mb-4 fill-height">
            <v-card-title class="headline">{{ content.title }}</v-card-title>
            <v-card-text>
              <div class="mb-2">
                <strong>Slug:</strong>
                <span>{{ content.slug }}</span>
              </div>
              <div class="mb-2">
                <strong>Pubblicato:</strong>
                <span>{{ content.is_published ? 'Si' : 'No' }}</span>
              </div>
              <div class="mb-2">
                <strong>Creato il:</strong>
                <span>{{ new Date(content.created_at).toLocaleDateString() }}</span>
              </div>
            </v-card-text>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-icon class="action-icon" @click="editContent(content)">mdi-pencil</v-icon>
              <v-icon class="action-icon" @click="deleteContent(content.content_id)">mdi-delete</v-icon>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>

      <!-- Dialog for Adding/Editing Text Content -->
      <v-dialog v-model:model-value="contentDialog" max-width="600">
        <v-card>
          <v-card-title class="text-center">{{ contentFormTitle }}</v-card-title>
          <v-card-text>
            <v-form ref="contentForm" v-model="valid">
              <v-text-field
                  v-model="currentContent.title"
                  label="Titolo"
                  required
              ></v-text-field>
              <v-text-field
                  v-model="currentContent.slug"
                  label="Slug"
                  required
              ></v-text-field>
              <v-textarea
                  v-model="currentContent.content"
                  label="Contenuto"
                  rows="5"
                  required
              ></v-textarea>
              <v-checkbox
                  v-model="currentContent.is_published"
                  label="Pubblicato"
              ></v-checkbox>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="brown darken-1" @click="closeContentDialog">Chiudi</v-btn>
            <v-btn color="brown darken-1" @click="saveContent">Salva</v-btn>
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
import TextContentsService from '../services/TextContentsService'

const contents = ref([])
const loading = ref(true)
const contentDialog = ref(false)
const valid = ref(false)
const contentFormTitle = ref('')
const currentContent = ref({})

// Snackbar for error feedback
const errorSnackbar = ref(false)
const errorText = ref('')

// Fetch all text contents from the API
const fetchContents = async () => {
  try {
    const response = await TextContentsService.getAll()
    contents.value = response.data
  } catch (error) {
    errorText.value = 'Errore durante il caricamento dei contenuti.'
    errorSnackbar.value = true
    console.error('Error fetching contents:', error)
  } finally {
    loading.value = false
  }
}

// Open dialog for a new content
const openContentDialog = () => {
  currentContent.value = {}
  contentFormTitle.value = 'Aggiungi Nuovo Contenuto'
  contentDialog.value = true
}

// Close content dialog
const closeContentDialog = () => {
  contentDialog.value = false
}

// Save content (create or update)
const saveContent = async () => {
  if (!valid.value) return
  try {
    if (currentContent.value.content_id) {
      await TextContentsService.update(currentContent.value.content_id, currentContent.value)
    } else {
      await TextContentsService.create(currentContent.value)
    }
    await fetchContents()
    closeContentDialog()
  } catch (error) {
    errorText.value = 'Errore durante il salvataggio del contenuto.'
    errorSnackbar.value = true
    console.error('Error saving content:', error)
  }
}

// Open edit dialog with populated content data
const editContent = (content) => {
  currentContent.value = { ...content }
  contentFormTitle.value = 'Modifica Contenuto'
  contentDialog.value = true
}

// Delete a content by id
const deleteContent = async (contentId) => {
  try {
    await TextContentsService.delete(contentId)
    await fetchContents()
  } catch (error) {
    errorText.value = 'Errore durante la cancellazione del contenuto.'
    errorSnackbar.value = true
    console.error('Error deleting content:', error)
  }
}

onMounted(async () => {
  await fetchContents()
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