import axios from 'axios'

const API_URL = 'https://your-api-endpoint.com/api/gospels'

class GospelsService {
    getAll() {
        // return axios.get(API_URL)
        return Promise.resolve({
            data: [
                { id: 1, date: '2025-01-01', title: 'Gospel 1' },
                { id: 2, date: '2025-02-01', title: 'Gospel 2' },
                { id: 3, date: '2025-03-01', title: 'Gospel 3' },
            ]
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

export default new GospelsService()