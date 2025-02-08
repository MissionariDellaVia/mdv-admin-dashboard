import axiosInstance from './authInstance';

const API_URL = '/mdv/v1/seeds';

class SeedsService {
    getAll() {
        return axiosInstance.get(API_URL);
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

export default new SeedsService();