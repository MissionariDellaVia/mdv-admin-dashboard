import axiosInstance from './authInstance';

const COMMENTS_API_URL = '/mdv/v1/comments';

class CommentsService {
    async getAll(gospelId, page = 1, itemsPerPage = 10) {
        return axiosInstance
            .get(COMMENTS_API_URL, {
                params: {
                    gospel_id: gospelId,
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
                    throw new Error('Failed to fetch comments data');
                }
            })
            .catch(error => {
                console.error('Error fetching comments:', error);
                throw error;
            });
    }

    async getTotal() {
        return axiosInstance
            .get(COMMENTS_API_URL)
            .then(response => {
                if (response.data) {
                    return response.data.total;
                } else {
                    throw new Error('Failed to fetch comments data');
                }
            })
            .catch(error => {
                console.error('Error fetching comments:', error);
                throw error;
            });
    }

    get(id) {
        return axiosInstance.get(`${COMMENTS_API_URL}/${id}`);
    }

    create(data) {
        return axiosInstance.post(COMMENTS_API_URL, data);
    }

    update(id, data) {
        return axiosInstance.put(`${COMMENTS_API_URL}/${id}`, data);
    }

    delete(id) {
        return axiosInstance.delete(`${COMMENTS_API_URL}/${id}`);
    }
}

export default new CommentsService();