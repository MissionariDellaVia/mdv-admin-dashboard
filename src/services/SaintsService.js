import axiosInstance from './authInstance';

const API_URL = '/mdv/v1/saints';
const API_SEARCH_URL = '/mdv/v1/search/saints';

class SaintsService {
    getAll(page = 1, itemsPerPage = 10) {
        return axiosInstance
            .get(API_URL, {
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
                    };
                } else {
                    throw new Error('Failed to fetch saints data');
                }
            })
            .catch(error => {
                console.error('Error fetching saints:', error);
                throw error;
            });
    }

    async search(searchText = "") {
        return axiosInstance
            .get(API_SEARCH_URL, searchText ? {
                params: { query: searchText }
            } : {})
            .then(response => {
                if (response.data) {
                    return response.data;
                } else {
                    throw new Error('Failed to fetch saints data');
                }
            })
            .catch(error => {
                console.error('Error fetching saints:', error);
                throw error;
            });
    }

    async getTotal() {
        return axiosInstance
            .get(API_URL)
            .then(response => {
                if (response.data) {
                    return response.data.total;
                } else {
                    throw new Error('Failed to fetch saints data');
                }
            })
            .catch(error => {
                console.error('Error fetching saints:', error);
                throw error;
            });
    }

    get(id) {
        return axiosInstance.get(`${API_URL}/${id}`);
    }

    create(data) {
        return axiosInstance.post(API_URL, data)
            .then(response => {
                if (response.data) {
                    return response.data.data;
                } else {
                    throw new Error('Failed to create saint record');
                }
            })
            .catch(error => {
                console.error('Error creating saint record:', error);
                throw error;
            });
    }

    update(id, data) {
        return axiosInstance.put(`${API_URL}/${id}`, data);
    }

    delete(id) {
        return axiosInstance.delete(`${API_URL}/${id}`);
    }
}

export default new SaintsService();