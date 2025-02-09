<template>
  <v-dialog :value="internalDialog" max-width="600px" @input="updateDialog">
    <v-card>
      <v-card-title class="text-center my-5">
        <span class="text-h5">{{ formTitle }}</span>
      </v-card-title>
      <v-card-text>
        <v-form ref="form" v-model="internalValid">
          <v-textarea
              v-model="localComment.comment_text"
              label="Commento"
              :rules="[rules.required]"
              required
          ></v-textarea>
          <v-text-field
              v-model="localComment.extra_info"
              label="Informazioni Extra"
          ></v-text-field>
          <v-text-field
              v-model="localComment.youtube_link"
              label="Link YouTube"
          ></v-text-field>
          <v-text-field
              v-model="localComment.comment_order"
              label="Ordine Commento"
              type="number"
          ></v-text-field>
          <v-checkbox
              v-model="localComment.is_latest"
              label="Ultimo Commento"
          ></v-checkbox>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="brown darken-1" @click="handleClose">Chiudi</v-btn>
        <v-btn color="brown darken-1" @click="handleSave">Salva</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: "CommentDialog",
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    comment: {
      type: Object,
      default: () => ({}),
    },
    formTitle: {
      type: String,
      default: "",
    },
    rules: {
      type: Object,
      default: () => ({}),
    },
  },
  emits: ["update:modelValue", "close-dialog", "save-comment"],
  data() {
    return {
      internalDialog: this.modelValue,
      internalValid: false,
      // Create a local copy so we do not mutate the prop directly.
      localComment: { ...this.comment },
    };
  },
  watch: {
    modelValue(newVal) {
      this.internalDialog = newVal;
    },
    internalDialog(newVal) {
      this.$emit("update:modelValue", newVal);
    },
    comment: {
      deep: true,
      handler(newVal) {
        this.localComment = { ...newVal };
      },
    },
  },
  methods: {
    updateDialog(val) {
      this.internalDialog = val;
    },
    handleClose() {
      this.$emit("close-dialog");
    },
    handleSave() {
      if (this.$refs.form.validate()) {
        this.$emit("save-comment", this.localComment);
      }
    },
  },
};
</script>

<style scoped>
/* Add any custom styles for the CommentDialog component here */
</style>