<template>
  <v-card>
    <v-card-title class="mb-5 mt-5">
      <v-btn color="green" class="float-end rounded-pill" @click="$emit('open-dialog')">
        <v-icon small>mdi-plus</v-icon>
      </v-btn>
      <span>Commenti per Vangelo</span>
    </v-card-title>
    <v-data-table
        :loading="isLoading"
        :headers="headers"
        :items="comments"
        :search="search"
        :items-length="totalItems"
        :page="page"
        class="elevation-1"
    >
      <template #progress>
        <v-progress-linear indeterminate color="primary"></v-progress-linear>
      </template>
      <template #top>
        <v-text-field v-model="localSearch" label="cerca..." class="mx-5"></v-text-field>
      </template>
      <template #item.actions="{ item }">
        <v-icon small color="yellow" class="mr-2" @click="$emit('edit-comment', item)">
          mdi-pencil
        </v-icon>
        <v-icon small color="red" @click="$emit('delete-comment', item.comment_id)">
          mdi-delete
        </v-icon>
      </template>
      <template #bottom>
        <v-toolbar flat>
          <span class="ml-4">
            {{ (page - 1) * itemsPerPage + 1 }}-
            {{ Math.min(page * itemsPerPage, totalItems) }} di {{ totalItems }}
          </span>
          <v-pagination
              v-model="localPage"
              :length="Math.ceil(totalItems / itemsPerPage)"
              :total-visible="7"
              @update:modelValue="emitPageChange"
          ></v-pagination>
        </v-toolbar>
      </template>
    </v-data-table>
  </v-card>
</template>

<script>
export default {
  name: "CommentsTable",
  props: {
    comments: {
      type: Array,
      default: () => [],
    },
    headers: {
      type: Array,
      default: () => [],
    },
    search: {
      type: String,
      default: "",
    },
    isLoading: {
      type: Boolean,
      default: false,
    },
    page: {
      type: Number,
      default: 1,
    },
    itemsPerPage: {
      type: Number,
      default: 10,
    },
    totalItems: {
      type: Number,
      default: 0,
    },
  },
  emits: ["open-dialog", "edit-comment", "delete-comment", "page-change", "update:search"],
  data() {
    return {
      // Local copies for search and page value to avoid mutating the prop directly.
      localSearch: this.search,
      localPage: this.page,
    };
  },
  watch: {
    localSearch(newVal) {
      this.$emit("update:search", newVal);
    },
    search(newVal) {
      this.localSearch = newVal;
    },
    page(newVal) {
      this.localPage = newVal;
    },
  },
  methods: {
    emitPageChange(newPage) {
      this.$emit("page-change", newPage);
    },
  },
};
</script>

<style scoped>
/* Add any custom styling for the CommentsTable component here */
</style>