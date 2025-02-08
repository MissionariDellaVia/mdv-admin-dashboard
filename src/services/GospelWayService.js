// src/services/GospelWayService.js

import axios from 'axios'

const API_URL = 'http://localhost:8000/api/mdv/v1/gospel-way'

class GospelWayService {

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
                    throw new Error('Failed to fetch gospels way data')
                }
            })
            .catch(error => {
                console.error('Error fetching gospels way:', error)
                throw error
            })
    }

    create(data) {
        return axios.post(API_URL, data)
            .then(response => {
                if (response.data) {
                    return response.data
                } else {
                    throw new Error('Failed to create GospelWay record')
                }
            })
            .catch(error => {
                console.error('Error creating GospelWay record:', error)
                throw error
            })
    }
}

export default new GospelWayService()