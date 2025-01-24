<!-- src/views/Gospels.vue -->

<template>
  <v-container>
    <v-card>
      <v-card-title>
        Gospels of the Day
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="openDialog()">Add Gospel</v-btn>
      </v-card-title>
      <v-data-table
          :headers="headers"
          :items="gospels"
          :search="search"
          class="elevation-1"
      >
        <template v-slot:top>
          <v-text-field
              v-model="search"
              label="Search"
              class="mx-4"
          ></v-text-field>
        </template>
        <template v-slot:item.actions="{ item }">
          <v-icon small class="mr-2" @click="editGospel(item)">
            mdi-pencil
          </v-icon>
          <v-icon small @click="deleteGospel(item.id)">
            mdi-delete
          </v-icon>
        </template>
      </v-data-table>
    </v-card>

    <!-- Dialog for Adding/Editing Gospel -->
    <v-dialog v-model="dialog" max-width="600px">
      <v-card>
        <v-card-title>
          <span class="text-h5">{{ formTitle }}</span>
        </v-card-title>
        <v-card-text>
          <v-form ref="form" v-model="valid">
            <!-- Add form fields here -->
            <v-text-field
                v-model="editedGospel.date"
                label="Date"
                :rules="[rules.required]"
                required
            ></v-text-field>
            <v-text-field
                v-model="editedGospel.gospelVerse"
                label="Gospel Verse"
                :rules="[rules.required]"
                required
            ></v-text-field>
            <!-- Add other fields similarly -->
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue darken-1" text="Cancel" @click="closeDialog">Cancel</v-btn>
          <v-btn color="blue darken-1" text="Save" @click="saveGospel">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import GospelsService from '../services/GospelsService'

export default {
  data() {
    return {
      gospels: [],
      headers: [
        { text: 'Date', value: 'date' },
        { text: 'Gospel Verse', value: 'gospelVerse' },
        // Add other headers
        { text: 'Actions', value: 'actions', sortable: false },
      ],
      search: '',
      dialog: false,
      editedGospel: {},
      formTitle: '',
      valid: false,
      rules: {
        required: value => !!value || 'Required.',
      },
    }
  },
  created() {
    this.fetchGospels()
  },
  methods: {
    fetchGospels() {
      GospelsService.getAll()
          .then(response => {
            this.gospels = response.data
          })
          .catch(error => {
            console.error(error)
          })
    },
    openDialog() {
      this.editedGospel = {}
      this.formTitle = 'Add Gospel'
      this.dialog = true
    },
    editGospel(item) {
      this.editedGospel = { ...item }
      this.formTitle = 'Edit Gospel'
      this.dialog = true
    },
    deleteGospel(id) {
      if (confirm('Are you sure you want to delete this gospel?')) {
        GospelsService.delete(id)
            .then(() => {
              this.fetchGospels()
            })
            .catch(error => {
              console.error(error)
            })
      }
    },
    saveGospel() {
      if (this.$refs.form.validate()) {
        if (this.editedGospel.id) {
          // Update existing gospel
          GospelsService.update(this.editedGospel.id, this.editedGospel)
              .then(() => {
                this.fetchGospels()
                this.closeDialog()
              })
              .catch(error => {
                console.error(error)
              })
        } else {
          // Create new gospel
          GospelsService.create(this.editedGospel)
              .then(() => {
                this.fetchGospels()
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