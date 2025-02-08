import axiosInstance from "./authInstance";
import eventBus from "./eventBus";

export default {
    async login(credentials) {
        try {
            const response = await axiosInstance.post("/login", credentials);
            // Save the token in localStorage after a successful login
            localStorage.setItem("authToken", response.data.access_token);
            // Emit auth-changed event with the new token
            eventBus.emit("auth-changed", response.data.access_token);
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    async logout() {
        try {
            // Call the logout API to invalidate the current token.
            await axiosInstance.post("/logout");

            localStorage.removeItem("authToken");

            // Remove the token from localStorage
            // Emit auth-changed event with null to update the auth state
            eventBus.emit("auth-changed", null);
        } catch (error) {
            throw error;
        }
    },
};