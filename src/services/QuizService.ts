import axios from "axios";
import { useMutation, useQuery } from "@tanstack/react-query";

const API_BASE_URL = "http://localhost:8081/api/rookie";

/* ====================== COMMON PAGED RESPONSE ====================== */

export interface PagedResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: string[];
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  totalPages: number;
  totalElements: number;
  last: boolean;
  size: number;
  number: number;
  sort: string[];
  numberOfElements: number;
  first: boolean;
  empty: boolean;
}

/* ====================== QUIZ INTERFACES ====================== */

export interface Quiz {
  quizId?: string;
  id?: string;
  title: string;
  totalScore: number;
  chapterId: string;
  attemptCount?: number;
  questionCount?: number;
  isActived: "ACTIVE" | "INACTIVE" | string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface QuizSearchParams {
  page?: number;
  size?: number;
  sort?: string[];
  q?: string;
  chapterId?: string;
  isActived?: "ACTIVE" | "INACTIVE" | string;
}

/* ====================== QUIZ API CALLS ====================== */

/** POST /books/quizzes */
export const createQuiz = async (data: Quiz): Promise<Quiz> => {
  // ensure backend receives attemptCount & questionCount fields
  const response = await axios.post(`${API_BASE_URL}/books/quizzes`, data);
  return response.data;
};

/** GET /books/quizzes/{id} */
export const getQuizById = async (id: string): Promise<Quiz> => {
  const response = await axios.get(`${API_BASE_URL}/books/quizzes/${id}`);
  return response.data;
};

/** PUT /books/quizzes/{id} */
export const updateQuiz = async (id: string, data: Quiz): Promise<Quiz> => {
  const response = await axios.put(`${API_BASE_URL}/books/quizzes/${id}`, data);
  return response.data;
};

/** DELETE /books/quizzes/{id} */
export const deleteQuiz = async (id: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/books/quizzes/${id}`);
};

/** GET /books/quizzes (paged search/list) */
export const searchQuizzes = async (
  params?: QuizSearchParams
): Promise<PagedResponse<Quiz>> => {
  const response = await axios.get(`${API_BASE_URL}/books/quizzes`, {
    params,
  });
  return response.data;
};

/* ====================== QUIZ REACT QUERY HOOKS ====================== */

export const useCreateQuiz = () => {
  return useMutation({
    mutationFn: (data: Quiz) => createQuiz(data),
  });
};

export const useGetQuizById = (id?: string) => {
  return useQuery({
    queryKey: ["quizzes", id],
    queryFn: () => getQuizById(id as string),
    enabled: !!id,
  });
};

export const useUpdateQuiz = () => {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Quiz }) =>
      updateQuiz(id, data),
  });
};

export const useDeleteQuiz = () => {
  return useMutation({
    mutationFn: (id: string) => deleteQuiz(id),
  });
};

export const useSearchQuizzes = (params?: QuizSearchParams) => {
  return useQuery({
    queryKey: ["quizzes", "search", params],
    queryFn: () => searchQuizzes(params),
  });
};

/* ====================== QUESTION INTERFACES ====================== */

export interface Question {
  id?: string;
  quizId: string;
  content: string;
  score: number;
  // theo swagger: answerCount (số đáp án) trong payload tạo question
  answerCount?: number;
  isActived: "ACTIVE" | "INACTIVE" | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface QuestionSearchParams {
  page?: number;
  size?: number;
  sort?: string[];
  q?: string;
  quizId?: string;
  isActived?: "ACTIVE" | "INACTIVE" | string;
}

/* ====================== QUESTION API CALLS ====================== */

/** POST /questions */
export const createQuestion = async (data: Question): Promise<Question> => {
  // include answerCount when creating question (API expects "answerCount")
  const response = await axios.post(`${API_BASE_URL}/questions`, data);
  return response.data;
};

/** GET /questions/{id} */
export const getQuestionById = async (id: string): Promise<Question> => {
  const response = await axios.get(`${API_BASE_URL}/questions/${id}`);
  return response.data;
};

/** PUT /questions/{id} */
export const updateQuestion = async (
  id: string,
  data: Question
): Promise<Question> => {
  const response = await axios.put(`${API_BASE_URL}/questions/${id}`, data);
  return response.data;
};

/** DELETE /questions/{id} */
export const deleteQuestion = async (id: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/questions/${id}`);
};

/** GET /questions (paged search/list) */
export const searchQuestions = async (
  params?: QuestionSearchParams
): Promise<PagedResponse<Question>> => {
  const response = await axios.get(`${API_BASE_URL}/questions`, {
    params,
  });
  return response.data;
};

/* ====================== QUESTION REACT QUERY HOOKS ====================== */

export const useCreateQuestion = () => {
  return useMutation({
    mutationFn: (data: Question) => createQuestion(data),
  });
};

export const useGetQuestionById = (id?: string) => {
  return useQuery({
    queryKey: ["questions", id],
    queryFn: () => getQuestionById(id as string),
    enabled: !!id,
  });
};

export const useUpdateQuestion = () => {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Question }) =>
      updateQuestion(id, data),
  });
};

export const useDeleteQuestion = () => {
  return useMutation({
    mutationFn: (id: string) => deleteQuestion(id),
  });
};

export const useSearchQuestions = (params?: QuestionSearchParams) => {
  return useQuery({
    queryKey: ["questions", "search", params],
    queryFn: () => searchQuestions(params),
  });
};

/* ====================== ANSWER INTERFACES ====================== */

export interface Answer {
  id?: string;
  content: string;
  isCorrect: boolean;
  questionId: string;
  isActived: "ACTIVE" | "INACTIVE" | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AnswerSearchParams {
  page?: number;
  size?: number;
  sort?: string[];
  q?: string;
  questionId?: string;
  isCorrect?: boolean;
  isActived?: "ACTIVE" | "INACTIVE" | string;
}

/* ====================== ANSWER API CALLS ====================== */

/** POST /answers */
export const createAnswer = async (data: Answer): Promise<Answer> => {
  const response = await axios.post(`${API_BASE_URL}/answers`, data);
  return response.data;
};

/** GET /answers/{id} */
export const getAnswerById = async (id: string): Promise<Answer> => {
  const response = await axios.get(`${API_BASE_URL}/answers/${id}`);
  return response.data;
};

/** PUT /answers/{id} */
export const updateAnswer = async (
  id: string,
  data: Answer
): Promise<Answer> => {
  const response = await axios.put(`${API_BASE_URL}/answers/${id}`, data);
  return response.data;
};

/** DELETE /answers/{id} */
export const deleteAnswer = async (id: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/answers/${id}`);
};

/** GET /answers (paged search/list) */
export const searchAnswers = async (
  params?: AnswerSearchParams
): Promise<PagedResponse<Answer>> => {
  const response = await axios.get(`${API_BASE_URL}/answers`, {
    params,
  });
  return response.data;
};

/* ====================== ANSWER REACT QUERY HOOKS ====================== */

export const useCreateAnswer = () => {
  return useMutation({
    mutationFn: (data: Answer) => createAnswer(data),
  });
};

export const useGetAnswerById = (id?: string) => {
  return useQuery({
    queryKey: ["answers", id],
    queryFn: () => getAnswerById(id as string),
    enabled: !!id,
  });
};

export const useUpdateAnswer = () => {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Answer }) =>
      updateAnswer(id, data),
  });
};

export const useDeleteAnswer = () => {
  return useMutation({
    mutationFn: (id: string) => deleteAnswer(id),
  });
};

export const useSearchAnswers = (params?: AnswerSearchParams) => {
  return useQuery({
    queryKey: ["answers", "search", params],
    queryFn: () => searchAnswers(params),
  });
};