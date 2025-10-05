export interface Book {
  book_id: string;
  book_name: string;
  cover_url: string;
  author_id: string;
  decription: string;
  created_date: string;
  updated_date: string;
  published_date: string;
  is_actived: number;
  publication_status: number;
  bookshelve_id: string;
  progress_status: number;

  // mở rộng để tương thích backend sau này
  price?: number;
  sale_price?: number;
  author_name?: string;
}
