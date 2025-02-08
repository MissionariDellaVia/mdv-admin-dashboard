import axios from 'axios';

const BASE_URL = 'http://localhost:8000/api';

const authInstance = axios.create({
    baseURL: BASE_URL,
});

// Request interceptor to attach the Bearer token to each request if available
authInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers['Authorization'] = 'Bearer ' + token;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default authInstance;