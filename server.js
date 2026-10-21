const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({limit: '50mb'}));
app.use(express.static(__dirname));

const db = new sqlite3.Database('./zynvora.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    bio TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    videoUrl TEXT NOT NULL,
    descp TEXT,
    likes INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// API Routes
app.post('/api/register', (req, res) => {
  const {username, bio} = req.body;
  if(!username) return res.json({error: 'username required'});
  db.run("INSERT INTO users (username, bio) VALUES (?, ?)", [username, bio||''], function(err){
    if(err) return res.json({error: err.message});
    res.json({success:true, id:this.lastID});
  });
});

app.get('/api/users', (req, res) => {
  db.all("SELECT * FROM users ORDER BY id DESC", (e,r)=>res.json(r||[]));
});

app.delete('/api/users/:id', (req, res) => {
  db.run("DELETE FROM users WHERE id=?", [req.params.id], ()=>res.json({success:true}));
});

app.post('/api/videos', (req, res) => {
  const {username, videoUrl, descp} = req.body;
  db.run("INSERT INTO videos (username, videoUrl, descp) VALUES (?, ?, ?)", [username||'anon', videoUrl, descp||''], function(e){
    if(e) return res.json({error:e.message});
    res.json({success:true, id:this.lastID});
  });
});

app.get('/api/videos', (req, res) => {
  db.all("SELECT * FROM videos ORDER BY id DESC", (e,r)=>res.json(r||[]));
});

app.delete('/api/videos/:id', (req, res) => {
  db.run("DELETE FROM videos WHERE id=?", [req.params.id], ()=>res.json({success:true}));
});

// Pages
app.get('/', (req,res)=> res.sendFile(path.join(__dirname,'index.html')));
app.get('/admin', (req,res)=> res.sendFile(path.join(__dirname,'admin.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('ZYNVORA LIVE ON '+PORT));
