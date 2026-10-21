const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASS = "ZYNVORA123";

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended:true}));

// Upload setup
if(!fs.existsSync('uploads')) fs.mkdirSync('uploads');
const storage = multer.diskStorage({
  destination:'uploads/',
  filename:(req,file,cb)=>cb(null, Date.now()+path.extname(file.originalname))
});
const upload = multer({storage});
app.use('/uploads', express.static('uploads'));
app.use(express.static(__dirname));

// Database
const db = new sqlite3.Database('./database.sqlite');

db.serialize(()=>{
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    fullName TEXT,
    password TEXT,
    avatar TEXT,
    banned INTEGER DEFAULT 0,
    created DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    videoUrl TEXT,
    caption TEXT,
    type TEXT DEFAULT 'video',
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    created DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user TEXT,
    to_user TEXT,
    text TEXT,
    created DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    videoId INTEGER,
    username TEXT,
    text TEXT,
    created DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  // For old DB, add columns if missing
  db.run(`ALTER TABLE users ADD COLUMN avatar TEXT`,()=>{});
  db.run(`ALTER TABLE videos ADD COLUMN comments INTEGER DEFAULT 0`,()=>{});
});

// --- API ---

// Register
app.post('/api/register',(req,res)=>{
  const {username, fullName, password} = req.body;
  if(!username || !password) return res.json({error:'Fill all'});
  db.get('SELECT * FROM users WHERE username=?',[username],(e,row)=>{
    if(row) return res.json({error:'Username taken'});
    db.run('INSERT INTO users(username, fullName, password) VALUES(?,?,?)',[username, fullName, password],function(err){
      if(err) return res.json({error:'Error'});
      db.get('SELECT * FROM users WHERE id=?',[this.lastID],(e2,u)=>res.json({user:u}));
    });
  });
});

// Login
app.post('/api/login',(req,res)=>{
  const {username, password} = req.body;
  db.get('SELECT * FROM users WHERE username=? AND password=?',[username, password],(e,row)=>{
    if(!row) return res.json({error:'Wrong username or password'});
    if(row.banned) return res.json({error:'You are banned'});
    res.json({user:row});
  });
});

// Users
app.get('/api/users',(req,res)=>{
  db.all('SELECT id, username, fullName, avatar, banned, created FROM users ORDER BY id DESC',(e,rows)=>{
    res.json(rows||[]);
  });
});

// Videos
app.get('/api/videos',(req,res)=>{
  db.all('SELECT * FROM videos ORDER BY id DESC',(e,rows)=>{
    res.json(rows||[]);
  });
});
app.post('/api/videos',(req,res)=>{
  const {username, videoUrl, caption, type} = req.body;
  if(!videoUrl) return res.json({error:'No video'});
  db.run('INSERT INTO videos(username, videoUrl, caption, type) VALUES(?,?,?,?)',[username, videoUrl, caption||'', type||'video'],function(e){
    res.json({id:this.lastID});
  });
});

// Like
app.post('/api/like/:id',(req,res)=>{
  db.run('UPDATE videos SET likes = likes + 1 WHERE id=?',[req.params.id],()=>{
    res.json({ok:true});
  });
});

// Upload file (video/image)
app.post('/api/upload', upload.single('file'), (req,res)=>{
  if(!req.file) return res.json({error:'No file'});
  res.json({url:'/uploads/'+req.file.filename});
});

// Profile Avatar Update
app.post('/api/profile/avatar',(req,res)=>{
  const {username, avatar} = req.body;
  db.run('UPDATE users SET avatar=? WHERE username=?',[avatar, username],()=>{
    db.get('SELECT * FROM users WHERE username=?',[username],(e,u)=>{
      res.json({user:u});
    });
  });
});

// Comments
app.get('/api/comments/:videoId',(req,res)=>{
  db.all('SELECT * FROM comments WHERE videoId=? ORDER BY id ASC',[req.params.videoId],(e,rows)=>{
    res.json(rows||[]);
  });
});
app.post('/api/comments',(req,res)=>{
  const {videoId, username, text} = req.body;
  if(!text) return res.json({error:'Empty'});
  db.run('INSERT INTO comments(videoId, username, text) VALUES(?,?,?)',[videoId, username, text],()=>{
    db.run('UPDATE videos SET comments = comments + 1 WHERE id=?',[videoId]);
    res.json({ok:true});
  });
});

// Messages
app.get('/api/messages',(req,res)=>{
  const {user, with:withUser} = req.query;
  db.all('SELECT * FROM messages WHERE (from_user=? AND to_user=?) OR (from_user=? AND to_user=?) ORDER BY id ASC',[user, withUser, withUser, user],(e,rows)=>{
    const list = (rows||[]).map(r=>({from:r.from_user, to:r.to_user, text:r.text, created:r.created}));
    res.json(list);
  });
});
app.get('/api/messages/all',(req,res)=>{
  db.all('SELECT * FROM messages ORDER BY id DESC LIMIT 100',(e,rows)=>res.json(rows||[]));
});
app.post('/api/messages',(req,res)=>{
  const {from, to, text} = req.body;
  db.run('INSERT INTO messages(from_user, to_user, text) VALUES(?,?,?)',[from, to, text],()=>res.json({ok:true}));
});

// Admin
app.post('/api/admin/login',(req,res)=>{
  if(req.body.password===ADMIN_PASS) res.json({ok:true});
  else res.json({error:'Wrong password'});
});
app.post('/api/ban/:id',(req,res)=>{
  if(req.headers['x-admin-pass']!==ADMIN_PASS) return res.json({error:'No admin'});
  db.get('SELECT banned FROM users WHERE id=?',[req.params.id],(e,u)=>{
    const newBan = u && u.banned ? 0 : 1;
    db.run('UPDATE users SET banned=? WHERE id=?',[newBan, req.params.id],()=>res.json({ok:true}));
  });
});
app.delete('/api/users/:id',(req,res)=>{
  if(req.headers['x-admin-pass']!==ADMIN_PASS) return res.json({error:'No admin'});
  db.run('DELETE FROM users WHERE id=?',[req.params.id],()=>res.json({ok:true}));
});
app.delete('/api/videos/:id',(req,res)=>{
  if(req.headers['x-admin-pass']!==ADMIN_PASS) return res.json({error:'No admin'});
  db.run('DELETE FROM videos WHERE id=?',[req.params.id],()=>res.json({ok:true}));
});

// Pages
app.get('/admin',(req,res)=>res.sendFile(path.join(__dirname,'admin.html')));
app.get('/',(req,res)=>res.sendFile(path.join(__dirname,'index.html')));

app.listen(PORT,()=>console.log('ZYNVORA Running on '+PORT));
