import axios from 'axios'

const API_URL = 'http://localhost:8000/api/mdv/v1/saints'

class SaintsService {
    getAll() {
        return axios.get(API_URL)
            .then(response => {
                if (response.data.success) {
                    return response.data.data
                } else {
                    throw new Error('Failed to fetch saints data')
                }
            })
            .catch(error => {
                console.error('Error fetching saints:', error)
                throw error
            })
    }

    get(id) {
        return axios.get(`${API_URL}/${id}`)
    }

    create(data) {
        return axios.post(API_URL, data).then(response => {
            if (response.data.success) {
                return response.data.data
            } else {
                throw new Error('Failed to fetch saints data')
            }
        }).catch(error => {
            console.error('Error fetching saints:', error)
            throw error
        })
    }

    update(id, data) {
        return axios.put(`${API_URL}/${id}`, data)
    }

    delete(id) {
        return axios.delete(`${API_URL}/${id}`)
    }
}

export default new SaintsService()