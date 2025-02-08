<template>
  <v-container>
    <v-card>
      <v-card-title class="mb-5 mt-5">
        <v-btn color="green" class="float-end rounded-pill" @click="openDialog()">
          <v-icon small>
            mdi-plus
          </v-icon>
        </v-btn>
        <span>Vangelo</span>
      </v-card-title>
      <v-data-table
          :loading="isLoading"
          :disabled="isLoading"
          :headers="headers"
          :items="gospels"
          :items-length="totalItems"
          :search="search"
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
              class="mx-4"
          ></v-text-field>
        </template>
        <template v-slot:item.actions="{ item }">
          <v-icon small color="yellow" class="mr-2" @click="editGospel(item)">
            mdi-pencil
          </v-icon>
          <v-icon small color="red" @click="deleteGospel(item.id)">
            mdi-delete
          </v-icon>
        </template>
        <template v-slot:item.comments="{ item }">
          <span v-if="item.comments.length === 0">Nessun commento</span>
          <span v-else @click="openCommentsDialog(item.comments)" style="cursor: pointer;" @mouseover="hover = true" @mouseleave="hover = false" :style="{ color: hover ? 'saddlebrown' : 'inherit' }">
            {{ item.comments.length }} commenti
          </span>
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

    <!-- Dialog for Viewing Comments -->
    <v-dialog v-model="commentsDialog" max-width="800px">
      <v-card>
        <v-card-title class="text-center my-5">
          <span class="text-h5">Commenti</span>
        </v-card-title>
        <v-card-text>
          <v-row>
            <v-col
                v-for="comment in comments"
                :key="comment.id"
                cols="12"
                md="6"
                lg="6"
            >
              <v-card>
                <v-card-title class="text-center">Id commento: {{ comment.comment_id }}</v-card-title>
                <v-card-subtitle class="text-center">
                  <a :href="comment.youtube_link" style="color: saddlebrown;" target="_blank">{{ comment.youtube_link }}</a>
                </v-card-subtitle>
                <v-card-text>
                  {{ comment.comment_text }}
                </v-card-text>
                <v-card-text>
                  {{ comment.extra_info }}
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="brown darken-1" text @click="closeCommentsDialog">Chiudi</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog for Adding/Editing Gospel -->
    <v-dialog v-model="dialog" max-width="600px">
      <v-card>
        <v-card-title class="text-center my-5">
          <span class="text-h5">{{ formTitle }}</span>
        </v-card-title>
        <v-card-text>
          <v-form ref="form" v-model="valid">
            <v-text-field
                v-model="editedGospel.evangelist"
                label="Evangelista"
                :rules="[rules.required]"
                required
            ></v-text-field>
            <v-text-field
                v-model="editedGospel.sacred_text_reference"
                label="Testi connessi"
            ></v-text-field>
            <v-text-field
                v-model="editedGospel.liturgical_period"
                label="Periodo Liturgico es. I Settimana Tempo Ordinario"
            ></v-text-field>
            <v-textarea
                v-model="editedGospel.gospel_text"
                label="Vangelo"
                :rules="[rules.required]"
                required
            ></v-textarea>
            <v-text-field
                v-model="editedGospel.gospel_verse"
                label="Versetto es. Gv 3,16"
                :rules="[rules.required]"
                required
            ></v-text-field>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="brown darken-1" text @click="closeDialog">Chiudi</v-btn>
          <v-btn color="brown darken-1" text @click="saveGospel">Salva</v-btn>
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
        <v-btn color="white" text="" @click="successSnackbar = false">
          Chiudi
        </v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script>
import GospelsService from '../services/GospelsService'

export default {
  data() {
    return {
      isLoading: false,
      gospels: [],
      comments: [],
      commentsDialog: false,
      headers: [
        { title: 'Versetto', value: 'gospel_verse' },
        { title: 'Evangelista', value: 'evangelist' },
        { title: 'Vangelo', value: 'gospel_text' },
        { title: 'Testi connessi', value: 'sacred_text_reference' },
        { title: 'Periodo Liturgico', value: 'liturgical_period' },
        { title: 'Commenti', value: 'comments', sortable: false },
        { title: '', value: 'actions', sortable: false },
      ],
      search: '',
      dialog: false,
      editedGospel: {},
      formTitle: '',
      valid: false,
      hover: false,
      rules: {
        required: value => !!value || 'Required.',
      },
      page: 1,
      itemsPerPage: 30,
      totalItems: 0,
      // Snackbars for feedback
      errorSnackbar: false,
      errorText: '',
      successSnackbar: false,
      successText: ''
    }
  },
  created() {
    this.fetchGospels()
  },
  methods: {
    fetchGospels() {
      this.isLoading = true;
      GospelsService.getAll(this.page, this.itemsPerPage)
          .then(response => {
            this.gospels = response.data;
            // Assuming the API response has a total count attribute
            this.totalItems = response.total;
          })
          .catch(error => {
            this.errorText = 'Errore durante il caricamento dei vangeli.'
            this.errorSnackbar = true;
            console.error(error)
          })
          .finally(() => {
            this.isLoading = false;
          });
    },
    handlePageChange(newPage) {
      this.page = newPage;
      this.fetchGospels();
    },
    openDialog() {
      this.editedGospel = {};
      this.formTitle = 'Aggiungi Vangelo';
      this.dialog = true;
    },
    editGospel(item) {
      this.editedGospel = {...item};
      this.formTitle = 'Modifica Vangelo';
      this.dialog = true;
    },
    deleteGospel(id) {
      if (confirm('Are you sure you want to delete this gospel?')) {
        GospelsService.delete(id)
            .then(() => {
              this.successText = 'Gospel eliminato con successo.';
              this.successSnackbar = true;
              this.fetchGospels();
            })
            .catch(error => {
              this.errorText = 'Errore durante la cancellazione del vangelo.';
              this.errorSnackbar = true;
              console.error(error)
            });
      }
    },
    saveGospel() {
      if (this.$refs.form.validate()) {
        if (this.editedGospel.id) {
          // Update existing gospel
          GospelsService.update(this.editedGospel.id, this.editedGospel)
              .then(() => {
                this.successText = 'Gospel aggiornato con successo.';
                this.successSnackbar = true;
                this.fetchGospels();
                this.closeDialog();
              })
              .catch(error => {
                this.errorText = 'Errore durante l\'aggiornamento del vangelo.';
                this.errorSnackbar = true;
                console.error(error)
              });
        } else {
          // Create new gospel
          GospelsService.create(this.editedGospel)
              .then(() => {
                this.successText = 'Gospel creato con successo.';
                this.successSnackbar = true;
                this.fetchGospels();
                this.closeDialog();
              })
              .catch(error => {
                this.errorText = 'Errore durante la creazione del vangelo.';
                this.errorSnackbar = true;
                console.error(error)
              });
        }
      }
    },
    closeDialog() {
      this.dialog = false;
    },
    openCommentsDialog(comments) {
      this.comments = comments;
      this.commentsDialog = true;
    },
    closeCommentsDialog() {
      this.commentsDialog = false;
    },
  },
}
</script>

<style scoped>
/* Add any custom styles here */
</style>