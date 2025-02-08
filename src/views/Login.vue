<template>
  <v-container
      fluid
      class="d-flex justify-center align-center"
      style="min-height: 100vh; background: #f5f5f5"
  >
    <!-- Increased card width for a larger login form -->
    <v-card min-width="40%" outlined class="pa-8">
      <v-card-title class="justify-center">
        <span class="login-title">Login</span>
      </v-card-title>
      <v-card-text>
        <v-form ref="form" v-model="valid" @submit.prevent="login">
          <v-text-field
              v-model="credentials.email"
              label="Email"
              :rules="[rules.required, rules.email]"
              required
              class="login-input"
          ></v-text-field>
          <v-text-field
              v-model="credentials.password"
              label="Password"
              type="password"
              :rules="[rules.required]"
              required
              class="login-input"
          ></v-text-field>
          <v-btn color="primary" type="submit" :loading="isLoading" block class="login-btn">
            Login
          </v-btn>
        </v-form>
      </v-card-text>
    </v-card>
    <!-- Snackbar for error feedback -->
    <v-snackbar v-model="errorSnackbar" timeout="5000" top color="error">
      {{ errorText }}
      <template #actions>
        <v-btn color="white" text @click="errorSnackbar = false">
          Chiudi
        </v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script>
import AuthService from "../services/AuthService";

export default {
  name: "Login",
  data() {
    return {
      isLoading: false,
      valid: false,
      credentials: {
        email: "",
        password: ""
      },
      rules: {
        required: (value) => !!value || "Required.",
        email: (value) => {
          const pattern = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
          return pattern.test(value) || "Invalid e-mail.";
        }
      },
      errorSnackbar: false,
      errorText: ""
    };
  },
  methods: {
    async login() {
      if (this.$refs.form.validate()) {
        this.isLoading = true;
        try {
          // Using AuthService to perform login and attach token if successful
          await AuthService.login(this.credentials);
          // Redirect to Dashboard after successful login
          this.$router.push({ name: "Dashboard" });
        } catch (error) {
          this.errorText =
              error.response?.data?.message ||
              "Login failed. Please check your credentials.";
          this.errorSnackbar = true;
        } finally {
          this.isLoading = false;
        }
      }
    }
  }
};
</script>

<style scoped>
.login-title {
  font-size: 2rem;
  font-weight: bold;
}
.login-input input {
  font-size: 1.25rem !important;
}
.login-btn {
  font-size: 1.25rem;
  padding: 16px 0;
}
</style>