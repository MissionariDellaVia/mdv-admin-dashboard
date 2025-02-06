import axios from 'axios'

const API_URL = 'http://localhost:8000/api/mdv/v1/gospels'
const API_SEARCH_URL = 'http://localhost:8000/api/mdv/v1/search/gospels'

class GospelsService {
    async getAll(page = 1, itemsPerPage = 10) {
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
                    throw new Error('Failed to fetch gospels data')
                }
            })
            .catch(error => {
                console.error('Error fetching gospels:', error)
                throw error
            })
    }

    async search(searchText = "") {
        console.log('searchText:', searchText)
        return axios.get(API_SEARCH_URL, searchText ? {
            params: {
                query: searchText
            }
        } : {})
            .then(response => {
                if (response.data) {
                    return response.data;
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
                if (response.data) {
                    return response.data.total
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