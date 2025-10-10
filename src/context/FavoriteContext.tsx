import { createContext, useContext, useState, type ReactNode } from 'react';

interface Book {
    book_id: string;
    book_name: string;
    cover_url: string;
    decription: string;
    published_date: string;
}

interface FavoritesContextType {
    favorites: Book[];
    toggleFavorite: (book: Book) => void;
    isFavorite: (bookId: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
    const [favorites, setFavorites] = useState<Book[]>([]);

    const toggleFavorite = (book: Book) => {
        setFavorites(prev => {
            const exists = prev.find(b => b.book_id === book.book_id);
            if (exists) {
                return prev.filter(b => b.book_id !== book.book_id);
            } else {
                return [...prev, book];
            }
        });
    };

    const isFavorite = (bookId: string) => {
        return favorites.some(book => book.book_id === bookId);
    };

    return (
        <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite }}>
            {children}
        </FavoritesContext.Provider>
    );
}

export const useFavorites = () => {
    const context = useContext(FavoritesContext);
    if (!context) {
        throw new Error('useFavorites must be used within a FavoritesProvider');
    }
    return context;
};