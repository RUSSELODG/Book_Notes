import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const port = 3000;

const date = new Date();
const year = date.getFullYear();


const db = new pg.Client({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: Number(process.env.PGPORT),
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true}));
app.use(express.static("public"));

const OrderBooksAndNotesBy = "notes.id DESC"; // recency, latest updated notes (default)

async function checkBookAndNotes() {
    let booksAndNotes = [];
    const result = await db.query("SELECT * FROM notes JOIN books ON books.id = book_id ORDER BY $1", [OrderBooksAndNotesBy]);
    booksAndNotes = result.rows;
    console.log(booksAndNotes);
    return booksAndNotes;
}

app.get("/", async (req, res) => {
    let booksAndNotes = await checkBookAndNotes();
    if (booksAndNotes.length === 0) {
        let data = {
            pageTitle: "Home",
            currentYear: year,
        };        
        return res.render("index.ejs", data);
    };

    let data = {
        pageTitle: "Home",
        currentYear: year,
        booksAndNotes: booksAndNotes,
    };
    res.render("index.ejs", data);
});

app.listen(port, () => {
    console.log(`Server is up and running on port ${port}.`);
    console.log(`visit http://localhost:${port}`);
});