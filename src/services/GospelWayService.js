// src/services/GospelWayService.js

import axios from 'axios'

const API_URL = 'http://localhost:8000/api/mdv/v1/gospelway'

class GospelWayService {
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