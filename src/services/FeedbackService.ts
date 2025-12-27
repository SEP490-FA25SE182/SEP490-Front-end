import axios from "axios";
import { API_RK } from "@/config";

/* =====================================================
    INTERFACES
===================================================== */

/** Feedback entity (đúng theo response backend) */
export interface Feedback {
    feedbackId: string;
    content: string;
    rating: string;
    createdAt: string;
    updatedAt: string;
    isActived: "ACTIVE" | "INACTIVE";
    userId: string;
    bookId: string;
    orderDetailId: string;
}

/** Body khi tạo mới feedback */
export interface CreateFeedbackRequest {
    content: string;
    rating: string;
    userId: string;
    bookId: string;
    orderDetailId: string;
}

/** Body khi cập nhật feedback */
export interface UpdateFeedbackRequest {
    content?: string;
    rating?: string;
    isActived?: "ACTIVE" | "INACTIVE";
}

/* =====================================================
    SERVICE FUNCTIONS
===================================================== */

export const FeedbackService = {
    /**  Lấy tất cả feedbacks (có thể lọc theo userId, bookId, orderDetailId) */
    async getAll(params?: {
        userId?: string;
        bookId?: string;
        orderDetailId?: string;
    }): Promise<Feedback[]> {
        const query = new URLSearchParams();
        if (params?.userId) query.append("userId", params.userId);
        if (params?.bookId) query.append("bookId", params.bookId);
        if (params?.orderDetailId) query.append("orderDetailId", params.orderDetailId);

        const res = await axios.get(`${API_RK}/users/feedbacks?${query.toString()}`);
        const data = res.data;
        return data?.content || [];
    },

    /**  Lấy feedback theo ID */
    async getById(id: string): Promise<Feedback> {
        const res = await axios.get(`${API_RK}/users/feedbacks/${id}`);
        return res.data;
    },

    /**  Tạo mới feedback */
    async create(data: CreateFeedbackRequest): Promise<Feedback> {
        const res = await axios.post(`${API_RK}/users/feedbacks`, data);
        return res.data;
    },

    /**  Cập nhật feedback theo ID */
    async update(id: string, data: UpdateFeedbackRequest): Promise<Feedback> {
        const res = await axios.put(`${API_RK}/users/feedbacks/${id}`, data);
        return res.data;
    },

    /**  Xóa feedback theo ID */
    async delete(id: string): Promise<void> {
        await axios.delete(`${API_RK}/users/feedbacks/${id}`);
    },

    
};
