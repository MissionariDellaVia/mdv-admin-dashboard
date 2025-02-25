<!-- src/views/Saints.vue -->

<template>
  <v-container>
    <v-card>
      <v-card-title class="mb-5 mt-5">
        <v-btn color="green" class="float-end rounded-pill" @click="openDialog()">
          <v-icon small>
            mdi-plus
          </v-icon>
        </v-btn>
        <span>Santi</span>
      </v-card-title>
      <v-data-table
          :loading="isLoading"
          :disabled="isLoading"
          :headers="headers"
          :items="saints"
          :search="search"
          :items-length="totalItems"
          :page="page"
          class="elevation-1"
      >
        <template v-slot:progress>
          <v-progress-linear indeterminate color="primary"></v-progress-linear>
        </template>
        <template v-slot:top>
          <v-text-field
              v-model="search"
              label="cerca..."
              class="mx-5 my-"
          ></v-text-field>
        </template>
        <template v-slot:item.actions="{ item }">
          <v-icon small color="yellow" class="mr-2" @click="editSaint(item)">
            mdi-pencil
          </v-icon>
          <v-icon small color="red" @click="deleteSaint(item.saint_id)">
            mdi-delete
          </v-icon>
        </template>
        <template v-slot:bottom>
          <v-toolbar flat>
            <!-- Items per page selector -->
            <span class="ml-4">
              {{ (page - 1) * itemsPerPage + 1 }}-{{ Math.min(page * itemsPerPage, totalItems) }} di {{ totalItems }}
            </span>
            <v-pagination
                v-model="page"
                :length="Math.ceil(totalItems / itemsPerPage)"
                :total-visible="7"
                @update:modelValue="handlePageChange"
            ></v-pagination>
          </v-toolbar>
        </template>

      </v-data-table>
    </v-card>

    <!-- Dialog for Adding/Editing Saint -->
    <v-dialog v-model="dialog" max-width="600px">
      <v-card>
        <v-card-title class="text-center my-5">
          <span class="text-h5">{{ formTitle }}</span>
        </v-card-title>
        <v-card-text>
          <v-form ref="form" v-model="valid">
            <!-- Add form fields here -->
            <v-text-field
                v-model="editedSaint.name"
                label="Nome"
                :rules="[rules.required]"
                required
            ></v-text-field>
            <v-textarea
                v-model="editedSaint.biography"
                label="Biografia"
                :rules="[rules.required]"
                required
            ></v-textarea>
            <v-text-field
                v-model="editedSaint.recurrence_date"
                label="Data Ricorrenza"
                :rules="[rules.required, rules.date]"
                required
            ></v-text-field>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="brown darken-1" text="Cancel" @click="closeDialog">Chiudi</v-btn>
          <v-btn color="brown darken-1" text="Save" @click="saveSaint">Salva</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import SaintsService from '../services/SaintsService'

export default {
  data() {
    return {
      isLoading: false,
      saints: [],
      headers: [
        { title: 'Nome', value: 'name', width: '20%'},
        { title: 'Biografia', value: 'biography' },
        { title: 'Ricorrenza', value: 'recurrence_date', width: '10%' },
        // Add other headers
        { title: '', value: 'actions', sortable: false, width: '10%' },
      ],
      search: '',
      dialog: false,
      editedSaint: {},
      formTitle: '',
      valid: false,
      rules: {
        required: value => !!value || 'Required.',
        date: value => /^\d{4}-\d{2}-\d{2}$/.test(value) || 'Formato data atteso (YYYY-MM-DD).',
      },
      page: 1,
      itemsPerPage: 30,
      totalItems: 0,
    }
  },
  created() {
    this.fetchSaints()
  },
  methods: {
    fetchSaints() {
      this.isLoading = true;
      SaintsService.getAll(this.page, this.itemsPerPage)
          .then(response => {
            this.saints = response.data
            this.totalItems = response.total
          })
          .catch(error => {
            console.error(error)
          }).finally(() => {
            this.isLoading = false
          })
    },
    handlePageChange(newPage) {
      console.log('New page:', newPage);
      this.page = newPage;
      this.fetchSaints();
    },
    openDialog() {
      this.editedSaint = {}
      this.formTitle = 'Aggiungi un Santo'
      this.dialog = true
    },
    editSaint(item) {
      this.editedSaint = { ...item }
      this.formTitle = 'Modifica Santo'
      this.dialog = true
    },
    deleteSaint(id) {
      if (confirm('Are you sure you want to delete this saint?')) {
        SaintsService.delete(id)
            .then(() => {
              this.fetchSaints()
            })
            .catch(error => {
              console.error(error)
            })
      }
    },
    saveSaint() {
      if (this.$refs.form.validate()) {
        if (this.editedSaint.saint_id) {
          // Update existing saint
          SaintsService.update(this.editedSaint.saint_id, this.editedSaint)
              .then(() => {
                this.fetchSaints()
                this.closeDialog()
              })
              .catch(error => {
                console.error(error)
              })
        } else {
          // Create new saint
          SaintsService.create(this.editedSaint)
              .then(() => {
                this.fetchSaints()
                this.closeDialog()
              })
              .catch(error => {
                console.error(error)
              })
        }
      }
    },
    closeDialog() {
      this.dialog = false
    },
  },
}
</script>

<style scoped>
/* Add any custom styles here */
</style>