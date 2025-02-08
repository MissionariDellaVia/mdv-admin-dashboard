// src/services/TextContentsService.js
import axios from 'axios'

const API_URL = 'http://localhost:8000/api/mdv/v1/content/pages'

class TextContentsService {
    getAll() {
        return axios.get(API_URL)
    }

    create(data) {
        return axios.post(API_URL, data)
    }

    update(id, data) {
        return axios.put(`${API_URL}/${id}`, data)
    }

    delete(id) {
        return axios.delete(`${API_URL}/${id}`)
    }
}

export default new TextContentsService()