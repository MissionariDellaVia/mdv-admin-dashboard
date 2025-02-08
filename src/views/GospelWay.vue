<template>
  <v-container>
    <v-card>
      <v-card-title class="mb-5 mt-5">
        <v-btn color="green" class="float-end rounded-pill" @click="openDialog()">
          <v-icon small>mdi-plus</v-icon>
        </v-btn>
        <span>Via del Vangelo</span>
      </v-card-title>
      <v-data-table
          :loading="isLoading"
          :disabled="isLoading"
          :headers="headers"
          :items="gospelWays"
          :items-length="totalItems"
          :search="search"
          :page="page"
          class="elevation-1"
      >
        <template v-slot:progress>
          <v-progress-linear indeterminate color="primary"></v-progress-linear>
        </template>
        <template v-slot:top>
          <v-text-field v-model="search" label="cerca..." class="mx-4"></v-text-field>
        </template>
        <template v-slot:item.calendar_date="{ item }">
          {{ formatDate(item.calendar_date) }}
        </template>
        <template v-slot:item.gospel="{ item }">
          <span v-if="item.gospel">
            {{ item.gospel.gospel_verse }}
          </span>
          <span v-else>N/A</span>
        </template>
        <template v-slot:item.gospel.latest_comment="{ item }">
          <span v-if="item.gospel">
            {{ item.gospel.latest_comment.comment_text }}
          </span>
          <span v-else>N/A</span>
        </template>
        <template v-slot:item.saint="{ item }">
          <span v-if="item.saint">
            {{ item.saint.name }}
          </span>
          <span v-else>N/A</span>
        </template>
        <template v-slot:item.liturgical_season="{ item }">
          <span>{{ item.liturgical_season || 'N/A' }}</span>
        </template>
        <template v-slot:item.actions="{ item }">
          <v-icon small color="red" @click="deleteGospelWay(item.gospel_way_id)">
            mdi-delete
          </v-icon>
        </template>
        <template v-slot:bottom>
          <v-toolbar flat>
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

    <!-- Dialog for Adding/Editing Gospel Way -->
    <v-dialog v-model="dialog" max-width="600px">
      <v-card>
        <v-card-title class="text-center my-5">
          <span class="text-h5">{{ formTitle }}</span>
        </v-card-title>
        <v-card-text>
          <v-form ref="form" v-model="valid">
            <v-text-field
                v-model="editedGospelWay.calendar_date"
                label="Data del Commento"
                type="date"
                :rules="[rules.required]"
                required
            ></v-text-field>
            <v-text-field
                v-model="editedGospelWay.gospel_id"
                label="ID Vangelo (per ricerca del versetto)"
                :rules="[rules.required]"
                required
            ></v-text-field>
            <v-text-field
                v-model="editedGospelWay.saint_id"
                label="ID Santo"
            ></v-text-field>
            <v-text-field
                v-model="editedGospelWay.liturgical_season"
                label="Periodo Liturgico"
            ></v-text-field>
            <v-textarea
                v-model="editedGospelWay.comment"
                label="Commento al Vangelo"
                :rules="[rules.required]"
                required
            ></v-textarea>
            <v-textarea
                v-model="editedGospelWay.extra_info"
                label="Extra"
            ></v-textarea>
            <v-text-field
                v-model="editedGospelWay.youtube_link"
                label="Link YouTube"
                type="url"
            ></v-text-field>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="brown darken-1" text @click="closeDialog">Chiudi</v-btn>
          <v-btn color="brown darken-1" text @click="saveGospelWay">Salva</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar for Error Feedback -->
    <v-snackbar v-model="errorSnackbar" timeout="5000" top color="error">
      {{ errorText }}
      <template #actions>
        <v-btn color="white" text @click="errorSnackbar = false">
          Chiudi
        </v-btn>
      </template>
    </v-snackbar>

    <!-- Snackbar for Success Feedback -->
    <v-snackbar v-model="successSnackbar" timeout="5000" top color="success">
      {{ successText }}
      <template #actions>
        <v-btn color="white" text @click="successSnackbar = false">
          Chiudi
        </v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script>
import GospelWayService from '../services/GospelWayService'

export default {
  data() {
    return {
      isLoading: false,
      gospelWays: [],
      search: '',
      page: 1,
      itemsPerPage: 30,
      totalItems: 0,
      dialog: false,
      editedGospelWay: {},
      formTitle: '',
      valid: false,
      rules: {
        required: value => !!value || 'Required.'
      },
      // Snackbars for feedback
      errorSnackbar: false,
      errorText: '',
      successSnackbar: false,
      successText: ''
    }
  },
  created() {
    this.fetchGospelWays()
  },
  methods: {
    // Utility method to format dates
    formatDate(dateString) {
      if (!dateString) return ''
      return new Date(dateString).toLocaleDateString()
    },
    fetchGospelWays() {
      this.isLoading = true;
      GospelWayService.getAll(this.page, this.itemsPerPage)
          .then(response => {
            // Assuming the API returns an object with data and a total count
            this.gospelWays = response.data;
            this.totalItems = response.total;
          })
          .catch(error => {
            this.errorText = 'Errore durante il caricamento della Via del Vangelo.'
            this.errorSnackbar = true;
            console.error(error)
          })
          .finally(() => {
            this.isLoading = false;
          });
    },
    handlePageChange(newPage) {
      this.page = newPage;
      this.fetchGospelWays();
    },
    openDialog() {
      this.editedGospelWay = {};
      this.formTitle = 'Aggiungi Commento al Vangelo';
      this.dialog = true;
    },
    closeDialog() {
      this.dialog = false;
    },
    saveGospelWay() {
      if (this.$refs.form.validate()) {
        if (this.editedGospelWay.id) {
          // Update existing record
          GospelWayService.update(this.editedGospelWay.id, this.editedGospelWay)
              .then(() => {
                this.successText = 'Record aggiornato con successo.';
                this.successSnackbar = true;
                this.fetchGospelWays();
                this.closeDialog();
              })
              .catch(error => {
                this.errorText = 'Errore durante l\'aggiornamento del record.';
                this.errorSnackbar = true;
                console.error(error)
              });
        } else {
          // Create new record
          GospelWayService.create(this.editedGospelWay)
              .then(() => {
                this.successText = 'Record creato con successo.';
                this.successSnackbar = true;
                this.fetchGospelWays();
                this.closeDialog();
              })
              .catch(error => {
                this.errorText = 'Errore durante la creazione del record.';
                this.errorSnackbar = true;
                console.error(error)
              });
        }
      }
    },
    deleteGospelWay(id) {
      if (confirm('Sei sicuro di voler cancellare questo record?')) {
        GospelWayService.delete(id)
            .then(() => {
              this.successText = 'Record eliminato con successo.';
              this.successSnackbar = true;
              this.fetchGospelWays();
            })
            .catch(error => {
              this.errorText = 'Errore durante la cancellazione del record.';
              this.errorSnackbar = true;
              console.error(error)
            });
      }
    }
  },
  computed: {
    headers() {
      return [
        { title: 'Data', value: 'calendar_date' },
        { title: 'Vangelo', value: 'gospel' },
        { title: 'Commento', value: 'gospel.latest_comment' },
        { title: 'Santo', value: 'saint' },
        { title: 'Periodo Liturgico', value: 'liturgical_season' },
        { title: 'Azioni', value: 'actions', sortable: false }
      ]
    }
  },
  watch: {
    search(newVal) {
      // Optionally implement search debounce and fetch filtered records.
      // For now, simply trigger a fetch to refresh the table based on search.
      this.page = 1;
      this.fetchGospelWays();
    }
  }
}
</script>

<style scoped>
/* Add any custom styles here */
</style>