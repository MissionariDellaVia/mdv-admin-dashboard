<template>
  <v-container>
    <CommentsTable
        :comments="comments"
        :headers="headers"
        :is-loading="isLoading"
        :total-items="totalItems"
        :page="page"
        :items-per-page="itemsPerPage"
        v-model:search="search"
        @open-dialog="openDialog"
        @edit-comment="editComment"
        @delete-comment="deleteComment"
        @page-change="handlePageChange"
    />

    <CommentDialog
        v-model="dialog"
        :comment="editedComment"
        :form-title="formTitle"
        :rules="rules"
        @close-dialog="closeDialog"
        @save-comment="saveComment"
    />
  </v-container>
</template>

<script>
import CommentsService from "../services/CommentsService";
import CommentsTable from "../components/CommentsTable.vue";
import CommentDialog from "../components/CommentDialog.vue";

export default {
  name: "Comments",
  components: {
    CommentsTable,
    CommentDialog,
  },
  data() {
    return {
      isLoading: false,
      comments: [],
      headers: [
        { title: "Testo Commento", value: "comment_text" },
        { title: "Informazioni Extra", value: "extra_info" },
        { title: "Link YouTube", value: "youtube_link" },
        { title: "Ordine Commento", value: "comment_order" },
        { title: "Ultimo Commento", value: "is_latest" },
        { title: "", value: "actions", sortable: false },
      ],
      search: "",
      dialog: false,
      editedComment: {},
      formTitle: "",
      rules: {
        required: value => !!value || "Required.",
      },
      // Pagination and additional data
      page: 1,
      itemsPerPage: 10,
      totalItems: 0,
      // Assume the gospelId is passed or preset
      gospelId: 1,
    };
  },
  created() {
    this.fetchComments();
  },
  methods: {
    fetchComments() {
      this.isLoading = true;
      CommentsService.getAll(this.gospelId, this.page, this.itemsPerPage)
          .then(response => {
            this.comments = response.data;
            this.totalItems = response.total;
          })
          .catch(error => {
            console.error("Error fetching comments:", error);
          })
          .finally(() => {
            this.isLoading = false;
          });
    },
    handlePageChange(newPage) {
      this.page = newPage;
      this.fetchComments();
    },
    openDialog() {
      this.editedComment = {};
      this.formTitle = "Aggiungi Commento";
      this.dialog = true;
    },
    editComment(comment) {
      this.editedComment = { ...comment };
      this.formTitle = "Modifica Commento";
      this.dialog = true;
    },
    deleteComment(id) {
      if (confirm("Sei sicuro di voler eliminare questo commento?")) {
        CommentsService.delete(id)
            .then(() => {
              this.fetchComments();
            })
            .catch(error => {
              console.error("Error deleting comment:", error);
            });
      }
    },
    saveComment(updatedComment) {
      if (updatedComment.comment_id) {
        // Update existing comment
        CommentsService.update(updatedComment.comment_id, updatedComment)
            .then(() => {
              this.fetchComments();
              this.closeDialog();
            })
            .catch(error => {
              console.error("Error updating comment:", error);
            });
      } else {
        // Create new comment. Set gospel_id before sending.
        updatedComment.gospel_id = this.gospelId;
        CommentsService.create(updatedComment)
            .then(() => {
              this.fetchComments();
              this.closeDialog();
            })
            .catch(error => {
              console.error("Error creating comment:", error);
            });
      }
    },
    closeDialog() {
      this.dialog = false;
    },
  },
};
</script>

<style scoped>
/* Add any custom styles for the Comments view here */
</style>