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

const OrderBooksAndNotesBy = "books.last_updated_at DESC"; // recency, latest updated notes (default)
const try_again_msg = " Please Go back to the previous page and try again!";

async function checkBookAndNotes() {
    let booksAndNotes = [];
    const result = await db.query(`SELECT * FROM notes JOIN books ON books.id = book_id ORDER BY ${OrderBooksAndNotesBy}`);
    booksAndNotes = result.rows;
    console.log(booksAndNotes);
    return booksAndNotes;
}

async function checkNotesUserWrote (reqBody) {
    const title = reqBody.title;
    const author = reqBody.author;
    const isbn = reqBody.isbn;
    const rating = parseFloat(reqBody.rating);
    const notes = reqBody.notes;
    let year_of_reading = null;
    if (reqBody.year_of_reading) {
        year_of_reading = parseInt(reqBody.year_of_reading);
    };
    let amazon_link = null;
    if (reqBody.amazon_link) {
        amazon_link = reqBody.amazon_link;
    };

    if (title.trim().length === 0 || title.length > 156) {
        return "ERROR! Title too Long or No Title." + try_again_msg;
    };
    if (author.trim().length === 0 || author.length > 156) {
        return "ERROR! Author(s) name(s) too Long or No Author." + try_again_msg;
    };
    if (isbn.trim().length === 0 || isbn.length !== 10) {
        return "ERROR! No ISBN or Incorrect ISBN(10)." + try_again_msg;
    };
    if (Number.isNaN(rating) || rating > 10) {
        return "ERROR! Incorrect rating." + try_again_msg;
    };
    if (notes.trim().length === 0 || notes.length > 24999) {
        return "ERROR! No notes or your notes are too long." + try_again_msg;
    };
    if (year_of_reading !== null) {
        if (Number.isNaN(year_of_reading) || year_of_reading < 1900 || year_of_reading > year) {
            return "ERROR! Incorrect year for year of reading." + try_again_msg;
        };        
    };
    if (amazon_link !== null) {
        if (amazon_link.trim().length > 0 && amazon_link.length > 75) {
            return "ERROR! Invalid amazon link." + try_again_msg;
        };        
    }

    return "No Error";
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

app.get("/create-new-notes", (req, res) => {
    let data = {
        pageTitle: "New Notes",
        currentYear: year,
    };
    res.render("new-notes.ejs", data)
});

app.post("/create-new-notes", async (req, res) => {
    let notesCheckResult = await checkNotesUserWrote(req.body);
    if (notesCheckResult !== "No Error") {
        return res.status(400).send(notesCheckResult);
    };

    let year_of_reading;
    if (req.body.year_of_reading) {
        year_of_reading = parseInt(req.body.year_of_reading);
    };

    let amazon_link = null;
    if (req.body.amazon_link) {
        amazon_link = req.body.amazon_link;
    };

    let rating = parseFloat(req.body.rating);

    const cover = "https://covers.openlibrary.org/b/isbn/"+req.body.isbn+"-L.jpg";

    try {
        let insertBookAndGetId = await db.query("INSERT INTO books (title, author, isbn, cover) VALUES ($1, $2, $3, $4) RETURNING id", [req.body.title, req.body.author, req.body.isbn, cover]);
        let book_id = insertBookAndGetId.rows[0].id
        await db.query("INSERT INTO notes (book_id, rating, year_of_reading, notes, amazon_link) VALUES ($1, $2, $3, $4, $5)", [book_id, rating, year_of_reading, req.body.notes, amazon_link]);
    } catch (err) {
        console.log("Error adding new notes: ");
        console.log(err);
        let error = "ERROR adding new notes." + try_again_msg;
        return res.status(400).send(error);
    }  

    res.redirect("/");
});


app.get("/edit-notes/:id", async (req, res) => {
    let book_id = req.params.id;
    let result;
    try {
        result = await db.query("SELECT * FROM notes JOIN books ON books.id = book_id WHERE books.id = $1", [book_id]);
    } catch (err) {
        console.log("Error querying data", err);
        res.status(400).send("Error querying these notes. Please try again later!");
    }
    let bookAndNotes = result.rows[0];

    let data = {
        pageTitle: "Edit Notes #"+book_id ,
        currentYear: year,
        bookAndNotes: bookAndNotes,        
    };
    console.log("Editing:");
    console.log(bookAndNotes);
    res.render("edit-notes.ejs", data);
});

app.post("/edit-notes/:id", async (req, res) => {
    let book_id = req.params.id;

    let notesCheckResult = await checkNotesUserWrote(req.body);
    if (notesCheckResult !== "No Error") {
        return res.status(400).send(notesCheckResult);
    };

    let year_of_reading;
    if (req.body.year_of_reading) {
        year_of_reading = parseInt(req.body.year_of_reading);
    };

    let amazon_link = null;
    if (req.body.amazon_link) {
        amazon_link = req.body.amazon_link;
    };

    let rating = parseFloat(req.body.rating);

    const cover = "https://covers.openlibrary.org/b/isbn/"+req.body.isbn+"-L.jpg";

    try {
        await db.query("UPDATE books SET (title, author, isbn, cover, last_updated_at) = ($1, $2, $3, $4, CURRENT_TIMESTAMP) WHERE books.id = $5", [req.body.title, req.body.author, req.body.isbn, cover, book_id]);
        await db.query("UPDATE notes SET (rating, year_of_reading, notes, amazon_link) = ($1, $2, $3, $4) WHERE book_id = $5", [rating, year_of_reading, req.body.notes, amazon_link, book_id]);
    } catch (err) {
        console.log("Error editing notes: ");
        console.log(err);
        let error = "ERROR editing notes." + try_again_msg;
        return res.status(400).send(error);        
    }

    res.redirect("/");
});

app.post("/delete-notes/:id", async (req, res) => {

});




app.listen(port, () => {
    console.log(`Server is up and running on port ${port}.`);
    console.log(`visit http://localhost:${port}`);
});