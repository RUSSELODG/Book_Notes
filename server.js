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

app.get("/create-new-notes/", (req, res) => {
    let data = {
        pageTitle: "New Notes",
        currentYear: year,
    };
    res.render("new-notes.ejs", data)
});

app.post("/create-new-notes", async (req, res) => {
    // console.log(req.body);
    const title = req.body.title;
    const author = req.body.author;
    const isbn = req.body.isbn;
    const rating = parseFloat(req.body.rating);
    const notes = req.body.notes;
    let year_of_reading;
    if (req.body.year_of_reading) {
        year_of_reading = parseInt(req.body.year_of_reading);
    };
    let amazon_link;
    if (req.body.amazon_link) {
        amazon_link = req.body.amazon_link;
    };
    let try_again_msg = " Please Go back to the previous page and try again!";

    if (title.trim().length === 0 || title.length > 156) {
        let error = "ERROR! Title too Long or No Title." + try_again_msg;
        return res.status(400).send(error);
    };
    if (author.trim().length === 0 || author.length > 156) {
        let error = "ERROR! Author(s) name(s) too Long or No Author." + try_again_msg;
        return res.status(400).send(error);
    };
    if (isbn.trim().length === 0 || isbn.length !== 10) {
        let error = "ERROR! No ISBN or Incorrect ISBN(10)." + try_again_msg;
        return res.status(400).send(error);
    };
    if (Number.isNaN(rating) || rating > 10) {
        let error = "ERROR! Incorrect rating." + try_again_msg;
        return res.status(400).send(error);
    };
    if (notes.trim().length === 0 || notes.length > 24999) {
        let error = "ERROR! No notes or your notes are too long." + try_again_msg;
        return res.status(400).send(error);
    };
    if (year_of_reading) {
        if (Number.isNaN(year_of_reading) || year_of_reading < 1900 || year_of_reading > year) {
            let error = "ERROR! Incorrect year for year of reading." + try_again_msg;
            return res.status(400).send(error);
        };
    };
    if (amazon_link) {
        if (amazon_link.trim().length === 0 || amazon_link.length > 75) {
            let error = "ERROR! Invalid amazon link format." + try_again_msg;
            return res.status(400).send(error);
        };
    };
    const cover = "https://covers.openlibrary.org/b/isbn/"+isbn+"-L.jpg";

    try {
        let insertBookAndGetId = await db.query("INSERT INTO books (title, author, isbn, cover) VALUES ($1, $2, $3, $4) RETURNING id", [title, author, isbn, cover]);
        // let book_id = await db.query("SELECT id FROM books ORDER BY id DESC LIMIT 1");
        let book_id = insertBookAndGetId.rows[0].id
        await db.query("INSERT INTO notes (book_id, rating, year_of_reading, notes, amazon_link) VALUES ($1, $2, $3, $4, $5)", [book_id, rating, year_of_reading, notes, amazon_link]);
    } catch (err) {
        console.log("Error adding new notes: ");
        console.log(err);
        let error = "ERROR adding new notes." + try_again_msg;
        return res.status(400).send(error);
    }  

    res.redirect("/");
});

//  if (eTitle.trim().length > 41 || eContent.trim().length > 16160) {
//     let error = "ERROR! Title or Content too Long! Please Go back to the previous page and try again!";
//     return res.status(400).send(error);
//   };
//   if (eTitle.trim().length ===0 || eContent.trim().length ===0 ) {
//     let error = "ERROR! Your Essay either lacks a title or content or both. Please Go back to the previous page and try again!";
//     return res.status(400).send(error);
//   };





app.listen(port, () => {
    console.log(`Server is up and running on port ${port}.`);
    console.log(`visit http://localhost:${port}`);
});