import express from "express";
import pg from "pg";
import bodyParser from "body-parser";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const port = 4000;

const db = new pg.Client({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: Number(process.env.PGPORT),
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true}));

app.get("/get-books-and-notes-by-id-desc", async (req, res) => {
    try {
        let books;
        let result = await db.query("SELECT * FROM notes JOIN books ON books.id = book_id ORDER BY books.id DESC");
        books = result.rows;
        console.log(books);
        res.json(books);
    } catch (err) {
        console.log("Error running query: ", err)
        res.status(400).json({message: "Book and notes not found!"});
    }
});

app.get("/get-book-and-notes/:id", async (req, res) => {
    try {
        let book;
        let result = await db.query("SELECT * FROM notes JOIN books ON books.id = book_id WHERE book_id = $1", [req.params.id]);
        book = result.rows[0];
        res.json(book);  
    } catch (err) {
        // console.log("Error running query: ", err)
        res.status(400).json({message: "Book and notes not found!"});
    }  
});


app.listen(port, () => {
    console.log(`API server is up and running on port ${port}`);
});