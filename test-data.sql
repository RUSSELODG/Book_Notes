-- You can only run this if there's no data in this database wether it was deleted or not created, or you'll have issues with the ids given that it's SERIAL


INSERT INTO books (title, author, isbn, cover) 
VALUES ('Exploring the Universe', 'ANTHEA MATON', '0134233859', 'https://covers.openlibrary.org/b/isbn/0134233859-L.jpg');

INSERT INTO notes (book_id, rating, year_of_reading, notes, amazon_link)
VALUES (1, 7, 2026, 'blablabla', 'https://a.co/d/0ah4H5YN');



INSERT INTO books (title, author, isbn, cover) 
VALUES ('Ant and Bee And Kind Dog', 'ANGELA BANNER', '0718200373', 'https://covers.openlibrary.org/b/isbn/0718200373-L.jpg');

INSERT INTO notes (book_id, rating, notes)
VALUES (2, 5.5, 'blablabla2');



INSERT INTO books (title, author, isbn, cover) 
VALUES ('UNIVERSITY PHYSICS (Second Edition)', 'ALVIN HUDSON/REX NELSON', '0030469791', 'https://covers.openlibrary.org/b/isbn/0030469791-L.jpg');

INSERT INTO notes (book_id, rating, year_of_reading, notes)
VALUES (3, 8, 2026, 'blablabla3');