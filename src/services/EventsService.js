import axios from 'axios'

const API_URL = 'https://your-api-endpoint.com/api/gospels'

class EventService {
    getAll() {
        // return axios.get(API_URL)
        return Promise.resolve({
            data: []
        })
    }

    get(id) {
        return axios.get(`${API_URL}/${id}`)
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

export default new EventService()