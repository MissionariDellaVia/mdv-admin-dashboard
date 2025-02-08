import axiosInstance from './authInstance';

const API_URL = '/mdv/v1/gospels';
const API_SEARCH_URL = '/mdv/v1/search/gospels';

class GospelsService {
    async getAll(page = 1, itemsPerPage = 10) {
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
                    throw new Error('Failed to fetch gospels data');
                }
            })
            .catch(error => {
                console.error('Error fetching gospels:', error);
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
                    throw new Error('Failed to fetch gospels data');
                }
            })
            .catch(error => {
                console.error('Error fetching gospels:', error);
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
                    throw new Error('Failed to fetch gospels data');
                }
            })
            .catch(error => {
                console.error('Error fetching gospels:', error);
                throw error;
            });
    }

    get(id) {
        return axiosInstance.get(`${API_URL}/${id}`);
    }

    create(data) {
        return axiosInstance.post(API_URL, data);
    }

    update(id, data) {
        return axiosInstance.put(`${API_URL}/${id}`, data);
    }

    delete(id) {
        return axiosInstance.delete(`${API_URL}/${id}`);
    }
}

export default new GospelsService();