import axios from 'axios'

const API_URL = 'http://localhost:8000/api/mdv/v1/gospels'

class GospelsService {
    async getAll() {
        return axios.get(API_URL)
            .then(response => {
                if (response.data.success) {
                    return response.data.data.data
                } else {
                    throw new Error('Failed to fetch gospels data')
                }
            })
            .catch(error => {
                console.error('Error fetching gospels:', error)
                throw error
            })
    }

    async getTotal() {
        return await axios.get(API_URL)
            .then(response => {
                if (response.data.success) {
                    return response.data.data.total
                } else {
                    throw new Error('Failed to fetch gospels data')
                }
            })
            .catch(error => {
                console.error('Error fetching gospels:', error)
                throw error
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