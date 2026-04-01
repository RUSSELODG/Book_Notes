DROP TABLE IF EXISTS books, notes; 

CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(156) NOT NULL,
    author VARCHAR(156) NOT NULL,
    isbn TEXT CHECK (LENGTH(isbn) = 10),
    cover VARCHAR(75),
    last_updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notes (
    id SERIAL PRIMARY KEY,
    book_id INT REFERENCES books(id),
    rating INT CHECK (rating <= 10) NOT NULL,
    year_of_reading INT CHECK (year_of_reading BETWEEN 1900 AND 2100),
    notes TEXT NOT NULL,
    amazon_link VARCHAR(75)
);