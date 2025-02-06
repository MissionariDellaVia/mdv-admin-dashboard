import axios from 'axios'

const API_URL = 'http://localhost:8000/api/mdv/v1/saints'

class SaintsService {
    getAll(page = 1, itemsPerPage = 10) {
        return axios.get(API_URL, {
            params: {
                page: page,
                limit: itemsPerPage
            }
        })
            .then(response => {
                if (response.data) {
                    return {
                        data: response.data.data,
                        total: response.data.total
                    }
                } else {
                    throw new Error('Failed to fetch saints data')
                }
            })
            .catch(error => {
                console.error('Error fetching saints:', error)
                throw error
            })
    }

    async getTotal() {
        return await axios.get(API_URL)
            .then(response => {
                if (response.data) {
                    return response.data.total
                } else {
                    throw new Error('Failed to fetch saint data')
                }
            })
            .catch(error => {
                console.error('Error fetching saint:', error)
                throw error
            })
    }

    get(id) {
        return axios.get(`${API_URL}/${id}`)
    }

    create(data) {
        return axios.post(API_URL, data).then(response => {
            if (response.data) {
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