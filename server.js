import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();
import axios from "axios";


const app = express();
const port = 3000;
const API_URL = "http://localhost:4000";

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

let OrderBooksAndNotesBy = "books.last_updated_at DESC"; // recency, latest updated notes (default)
const try_again_msg = " Please Go back to the previous page and try again!";
const logDashes = ("-------------------------------------------------------------");

async function checkBookAndNotes() {
    let booksAndNotes = [];
    const result = await db.query(`SELECT * FROM notes JOIN books ON books.id = book_id ORDER BY ${OrderBooksAndNotesBy}`);
    booksAndNotes = result.rows;

    console.log(logDashes);
    console.log("Books and Notes:");
    console.log(booksAndNotes);
    console.log(logDashes);
    console.log("");

    return booksAndNotes;
}

async function checkNotesUserWrote (reqBody) {
    const title = reqBody.title.trim();
    const author = reqBody.author.trim();
    const isbn = reqBody.isbn.trim();
    const rating = parseFloat(reqBody.rating);
    const notes = reqBody.notes.trim();
    let year_of_reading = null;
    if (reqBody.year_of_reading) {
        year_of_reading = parseInt(reqBody.year_of_reading);
    };
    let amazon_link = null;
    if (reqBody.amazon_link && reqBody.amazon_link.trim().length > 0) {
        amazon_link = reqBody.amazon_link.trim();
    };

    if (title.length === 0 || title.length > 156) {
        return {error:"ERROR! Title too Long or No Title." + try_again_msg, data:null};
    };
    if (author.length === 0 || author.length > 156) {
        return {error:"ERROR! Author(s) name(s) too Long or No Author." + try_again_msg, data:null};
    };
    if (isbn.length === 0 || isbn.length !== 10) {
        return {error:"ERROR! No ISBN or Incorrect ISBN(10)." + try_again_msg, data:null};
    };
    if (Number.isNaN(rating) || rating < 0 || rating > 10) {
        return {error:"ERROR! Incorrect rating." + try_again_msg, data:null};
    };
    if (notes.length === 0 || notes.length > 24999) {
        return {error:"ERROR! No notes or your notes are too long." + try_again_msg, data:null};
    };
    if (year_of_reading !== null) {
        if (Number.isNaN(year_of_reading) || year_of_reading < 1900 || year_of_reading > year) {
            return {error:"ERROR! Incorrect year for year of reading." + try_again_msg, data:null};
        };        
    };
    if (amazon_link !== null && amazon_link.length > 75) {
        return {error:"ERROR! Invalid amazon link." + try_again_msg, data:null};
    };

    return {
        error: null,
        data: {
            title: title, 
            author: author, 
            isbn: isbn, 
            rating: rating, 
            notes: notes, 
            year_of_reading: year_of_reading, 
            amazon_link: amazon_link
        }
    };
}

async function checkBookNotesExists (book_id) {
    let result = await db.query("SELECT 1 FROM notes JOIN books ON books.id = book_id WHERE books.id = $1", [book_id]);
    if (result.rowCount === 0) {
        return false;
    } else {
        return true;
    };
}


app.get("/", async (req, res) => {
    let booksAndNotes = await checkBookAndNotes();
    let data = {
        pageTitle: "Home",
        currentYear: year,
    };
    if (booksAndNotes.length !== 0) {
        data.booksAndNotes = booksAndNotes;
    };

    res.render("index.ejs", data);
});


app.post("/sortNotes", (req, res) => {
    let orderBy = req.body.orderBy;
    switch (orderBy) {
        case "title":
            OrderBooksAndNotesBy = "books.title ASC"; // title 

            console.log(logDashes);
            console.log("Sorting Notes by Book's title ASC.");
            console.log(logDashes);
            console.log("");

            break;
        case "recency":
            OrderBooksAndNotesBy = "books.last_updated_at DESC"; // recency, latest updated notes (default)
            
            console.log(logDashes);
            console.log("Sorting Notes by recency(last updated) DESC.");
            console.log(logDashes);
            console.log("");
            
            break;
        case "rating":
            OrderBooksAndNotesBy = "notes.rating DESC"; // rating

            console.log(logDashes);
            console.log("Sorting Notes by rating DESC.");
            console.log(logDashes);
            console.log("");

            break;
        default:
            OrderBooksAndNotesBy = "books.last_updated_at DESC"; // recency, latest updated notes (default)

            console.log(logDashes);
            console.log("Sorting Notes by recency(last updated) DESC.");
            console.log(logDashes);
            console.log("");

    };

    res.redirect("/");
});


app.get("/create-new-notes", (req, res) => {
    let data = {
        pageTitle: "New Notes",
        currentYear: year,
    };

    console.log(logDashes);
    console.log("Trying to create new Notes.");
    console.log(logDashes);
    console.log("");

    res.render("new-notes.ejs", data);
});


app.post("/create-new-notes", async (req, res) => {
    const result = await checkNotesUserWrote(req.body);
    if (result.error) {

        console.log(logDashes);
        console.log("Error Adding new Notes. Error:");
        console.log(result.error);
        console.log(logDashes);
        console.log("");

        return res.status(400).send(result.error);
    };

    const data = result.data;

    const cover = "https://covers.openlibrary.org/b/isbn/"+data.isbn+"-L.jpg";

    try {
        let insertBookAndGetId = await db.query("INSERT INTO books (title, author, isbn, cover) VALUES ($1, $2, $3, $4) RETURNING id", [data.title, data.author.toUpperCase(), data.isbn, cover]);
        let book_id = insertBookAndGetId.rows[0].id;
        await db.query("INSERT INTO notes (book_id, rating, year_of_reading, notes, amazon_link) VALUES ($1, $2, $3, $4, $5)", [book_id, data.rating, data.year_of_reading, data.notes, data.amazon_link]);
    } catch (err) {

        console.log(logDashes);
        console.log("Error adding new notes: ");
        console.log(err);
        console.log(logDashes);
        console.log("");

        let error = "ERROR adding new notes." + try_again_msg;
        return res.status(400).send(error);
    }  

    console.log(logDashes);
    console.log("Added these new notes: ");
    console.log(data);
    console.log(logDashes);
    console.log("");

    res.redirect("/");
});


app.get("/read-notes/:id", async (req, res) => {
    let book_id = req.params.id;

    let BookNotesExists = await checkBookNotesExists(book_id);
    if (!BookNotesExists) {

        console.log(logDashes);
        console.log("Error Reading Book#"+book_id+". Book Not Found.");
        console.log(logDashes);
        console.log("");

        let error = "Error Reading Book. Book #"+book_id+" Not found."+try_again_msg;
        return res.status(400).send(error);
    };

    let bookAndNotes;
    try {
        let result=  await db.query("SELECT * FROM notes JOIN books ON books.id = book_id WHERE book_id = $1", [book_id]);
        bookAndNotes = result.rows[0];
    } catch (err) {

        console.log(logDashes);
        console.log("Error querying Notes of Book#"+book_id+": ");
        console.log(err);
        console.log(logDashes);
        console.log("");

        let error = "Error querying these notes."+try_again_msg;
        res.status(400).send(error);
    }    

    let result = await db.query("SELECT COUNT(*) FROM notes JOIN books ON books.id = book_id");
    let numberOfNotes = parseInt(result.rows[0].count, 10); //10 here means I'm working with decimals.

    let data = {
        pageTitle: "notes #"+book_id,
        currentYear: year,
        bookAndNotes: bookAndNotes,
        numberOfNotes: numberOfNotes,
    };
    res.render("read-notes.ejs", data);
});


app.get("/edit-notes/:id", async (req, res) => {
    let book_id = req.params.id;

    let BookNotesExists = await checkBookNotesExists(book_id);
    if (!BookNotesExists) {

        console.log(logDashes);
        console.log("Error Editing Book#"+book_id+". Book Not Found.");
        console.log(logDashes);
        console.log("");

        let error = "Error Editing Book. Book #"+book_id+" Not found."+try_again_msg;
        return res.status(400).send(error);
    };

    let result;
    try {
        result = await db.query("SELECT * FROM notes JOIN books ON books.id = book_id WHERE books.id = $1", [book_id]);
    } catch (err) {

        console.log(logDashes);
        console.log("Error querying Notes of Book#"+book_id+": ");
        console.log(err);
        console.log(logDashes);
        console.log("");

        res.status(400).send("Error querying these notes. Please try again later!");
    }
    let bookAndNotes = result.rows[0];

    let data = {
        pageTitle: "Edit Notes#"+book_id ,
        currentYear: year,
        bookAndNotes: bookAndNotes,        
    };

    console.log(logDashes);
    console.log("Editing Notes of Book#"+book_id+": ");
    console.log(bookAndNotes);
    console.log(logDashes);
    console.log("");

    res.render("edit-notes.ejs", data);
});


app.post("/edit-notes/:id", async (req, res) => {
    let book_id = req.params.id;

    const result = await checkNotesUserWrote(req.body);
    if (result.error) {

        console.log(logDashes);
        console.log("Error Editing Notes of Book#"+book_id+". Error:");
        console.log(result.error);
        console.log(logDashes);
        console.log("");

        return res.status(400).send(result.error);
    };

    const data = result.data;

    const cover = "https://covers.openlibrary.org/b/isbn/"+data.isbn+"-L.jpg";

    try {
        await db.query("UPDATE books SET (title, author, isbn, cover, last_updated_at) = ($1, $2, $3, $4, CURRENT_TIMESTAMP) WHERE books.id = $5", [data.title, data.author.toUpperCase(), data.isbn, cover, book_id]);
        await db.query("UPDATE notes SET (rating, year_of_reading, notes, amazon_link) = ($1, $2, $3, $4) WHERE book_id = $5", [data.rating, data.year_of_reading, data.notes, data.amazon_link, book_id]);
    } catch (err) {

        console.log(logDashes);
        console.log("Error editing notes#"+book_id+": ");
        console.log(err);
        console.log(logDashes);
        console.log("");

        let error = "ERROR editing notes." + try_again_msg;
        return res.status(400).send(error);        
    }

    console.log(logDashes);
    console.log("Edited Notes of Book#"+book_id+" into:");
    console.log(data);
    console.log(logDashes);
    console.log("");

    res.redirect("/");
});


// use a post route method instead if it's a serious project.
app.get("/delete-notes/:id", async (req, res) => {
    let book_id = req.params.id;

    let BookNotesExists = await checkBookNotesExists(book_id);
    if (!BookNotesExists) {

        console.log(logDashes);
        console.log("Error deleting Book#"+book_id+". Book Not Found.");
        console.log(logDashes);
        console.log("");

        let error = "Error deleting Book. Book #"+book_id+" Not found."+try_again_msg;
        return res.status(400).send(error);
    };

    try {
        await db.query("DELETE from notes WHERE book_id = $1", [book_id]);
        await db.query("DELETE FROM books WHERE books.id = $1", [book_id]);  
    } catch (err) {

        console.log(logDashes);
        console.log("Error deleting Book#"+book_id+" from Books and Notes:");
        console.log(err);
        console.log(logDashes);
        console.log("");

        let error = "Error deleting notes #"+book_id+"."+try_again_msg;
        res.status(400).send(error);
    }

    console.log(logDashes);
    console.log("Deleted Book#"+book_id+" from Books and Notes.");
    console.log(logDashes);
    console.log("");

    res.redirect("/");
});


app.get("/about", (req, res) => {
    let data = {
        pageTitle: "About",
        currentYear: year,
    };
    res.render("about.ejs", data);
});



// hitting the API Example;
app.get("/get-all-books-and-notes", async (req, res) => {
    try {
        let response = await axios.get(`${API_URL}/get-books-and-notes-by-id-desc`);

        console.log(logDashes);
        console.log("Fetching Books and Notes from API:");
        console.log(response.data);
        console.log(logDashes);
        console.log("");

        res.send(response.data);
    } catch (err) {

        console.log(logDashes);
        console.log("Error Fetching data from API: ", err);
        console.log(logDashes);
        console.log("");

        res.status(500).json({message: "Error fetching books and notes!"});
    }
});


app.get("/get-book-and-notes-by-id", async (req, res) => {
    let id = 12; // or something else you want.
    try {
        let response = await axios.get(`${API_URL}/get-book-and-notes/${id}`);

        console.log(logDashes);
        console.log("Fetching Notes of Book#"+id+" from API:");
        console.log(response.data);
        console.log(logDashes);
        console.log("");

        res.send(response.data);
    } catch (err) {

        console.log(logDashes);
        console.log("Error Fetching data from API: ", err);
        console.log(logDashes);
        console.log("");

        res.status(500).json({message: "Error fetching book and notes!"});
    }
});

app.listen(port, () => {
    console.log(`Server is up and running on port ${port}.`);
    console.log(`visit http://localhost:${port}`);
});