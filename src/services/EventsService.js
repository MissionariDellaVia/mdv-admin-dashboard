import axiosInstance from './authInstance';

const API_URL = '/mdv/v1/events';

class EventService {
    getAll() {
        return axiosInstance.get(API_URL);
    }

    get(id) {
        return axiosInstance.get(`${API_URL}/${id}`);
    }

    create(data) {
        return axiosInstance.post(API_URL, data);
    }

    update(id, data) {
        return axiosInstance.put(`${API_URL}/${id}`, data);
    }

    delete(id) {
        return axiosInstance.delete(`${API_URL}/${id}`);
    }
}

export default new EventService();