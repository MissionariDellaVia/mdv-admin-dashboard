<!-- src/views/Comments.vue -->

<template>
  <v-container>
    <v-card>
      <v-card-title class="mb-5 mt-5">
        <v-btn color="green" class="float-end rounded-pill" @click="openDialog()">
          <v-icon small>
            mdi-plus
          </v-icon>
        </v-btn>
        <span>Commenti per Vangelo</span>
      </v-card-title>
      <v-data-table
          :loading="isLoading"
          :disabled="isLoading"
          :headers="headers"
          :items="comments"
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
          <v-icon small color="yellow" class="mr-2" @click="editComment(item)">
            mdi-pencil
          </v-icon>
          <v-icon small color="red" @click="deleteComment(item.comment_id)">
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

    <!-- Dialog for Adding/Editing Comment -->
    <v-dialog v-model="dialog" max-width="600px">
      <v-card>
        <v-card-title class="text-center my-5">
          <span class="text-h5">{{ formTitle }}</span>
        </v-card-title>
        <v-card-text>
          <v-form ref="form" v-model="valid">
            <!-- Add form fields here -->
            <v-textarea
                v-model="editedComment.comment_text"
                label="Commento"
                :rules="[rules.required]"
                required
            ></v-textarea>
            <v-text-field
                v-model="editedComment.extra_info"
                label="Informazioni Extra"
            ></v-text-field>
            <v-text-field
                v-model="editedComment.youtube_link"
                label="Link YouTube"
            ></v-text-field>
            <v-text-field
                v-model="editedComment.comment_order"
                label="Ordine Commento"
                type="number"
            ></v-text-field>
            <v-checkbox
                v-model="editedComment.is_latest"
                label="Ultimo Commento"
            ></v-checkbox>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="brown darken-1" text="Cancel" @click="closeDialog">Chiudi</v-btn>
          <v-btn color="brown darken-1" text="Save" @click="saveComment">Salva</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import CommentsService from '../services/CommentsService'

export default {
  data() {
    return {
      isLoading: false,
      comments: [],
      headers: [
        { title: 'Testo Commento', value: 'comment_text' },
        { title: 'Informazioni Extra', value: 'extra_info' },
        { title: 'Link YouTube', value: 'youtube_link' },
        { title: 'Ordine Commento', value: 'comment_order' },
        { title: 'Ultimo Commento', value: 'is_latest' },
        { title: '', value: 'actions', sortable: false },
      ],
      search: '',
      dialog: false,
      editedComment: {},
      formTitle: '',
      valid: false,
      rules: {
        required: value => !!value || 'Required.',
      },
      page: 1,
      itemsPerPage: 10,
      totalItems: 0,
      gospelId: 1, // Assumi che il gospelId sia passato o impostato
    }
  },
  created() {
    this.fetchComments()
  },
  methods: {
    fetchComments() {
      this.isLoading = true;
      CommentsService.getAll(this.gospelId, this.page, this.itemsPerPage)
          .then(response => {
            this.comments = response.data
            this.totalItems = response.total
          })
          .catch(error => {
            console.error(error)
          }).finally(() => {
        this.isLoading = false
      })
    },
    handlePageChange(newPage) {
      this.page = newPage;
      this.fetchComments();
    },
    openDialog() {
      this.editedComment = {}
      this.formTitle = 'Aggiungi Commento'
      this.dialog = true
    },
    editComment(item) {
      this.editedComment = { ...item }
      this.formTitle = 'Modifica Commento'
      this.dialog = true
    },
    deleteComment(id) {
      if (confirm('Sei sicuro di voler eliminare questo commento?')) {
        CommentsService.delete(id)
            .then(() => {
              this.fetchComments()
            })
            .catch(error => {
              console.error(error)
            })
      }
    },
    saveComment() {
      if (this.$refs.form.validate()) {
        if (this.editedComment.comment_id) {
          // Update existing comment
          CommentsService.update(this.editedComment.comment_id, this.editedComment)
              .then(() => {
                this.fetchComments()
                this.closeDialog()
              })
              .catch(error => {
                console.error(error)
              })
        } else {
          // Create new comment
          this.editedComment.gospel_id = this.gospelId;
          CommentsService.create(this.editedComment)
              .then(() => {
                this.fetchComments()
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