const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 10000;
const ADMIN_PASSWORD = "ZYNVORA123";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let users = [];
let videos = [];
let messages = [];

app.get('/api/users', (req, res) => res.json(users));
app.get('/api/videos', (req, res) => res.json(videos.reverse()));

app.get('/api/messages', (req, res) => {
  const { user, with: withUser } = req.query;
  if(user && withUser){
    const filtered = messages.filter(m => 
      (m.from===user && m.to===withUser) || (m.from===withUser && m.to===user)
    );
    return res.json(filtered);
  }
  res.json(messages);
});

app.post('/api/admin/login', (req,res)=>{
  if(req.body.password === ADMIN_PASSWORD) return res.json({success:true});
  return res.status(401).json({error:'Wrong password'});
});

app.post('/api/register', (req, res) => {
  const { username, fullName, password } = req.body;
  if(!username || !password) return res.status(400).json({error:'missing'});
  if(users.find(u=>u.username===username)) return res.status(400).json({error:'User exists'});
  const newUser = { id: Date.now(), username, fullName: fullName||username, password, banned: false, created: new Date().toISOString() };
  users.push(newUser);
  res.json({ success:true, user: newUser });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u=>u.username===username && u.password===password);
  if(!user) return res.status(400).json({error:'Invalid login'});
  if(user.banned) return res.status(403).json({error:'You are banned by admin'});
  res.json({ success:true, user });
});

app.post('/api/ban/:id', (req, res) => {
  if(req.headers['x-admin-pass'] !== ADMIN_PASSWORD) return res.status(401).json({error:'admin only'});
  const user = users.find(u=>u.id==req.params.id);
  if(user){ user.banned = !user.banned; }
  res.json({ success:true });
});

app.delete('/api/users/:id', (req, res) => {
  if(req.headers['x-admin-pass'] !== ADMIN_PASSWORD) return res.status(401).json({error:'admin only'});
  users = users.filter(u=>u.id != req.params.id);
  res.json({ success:true });
});

app.post('/api/videos', (req, res) => {
  const { username, videoUrl, caption, type } = req.body;
  if(!videoUrl) return res.status(400).json({error:'videoUrl required'});
  const user = users.find(u=>u.username===username);
  if(user && user.banned) return res.status(403).json({error:'banned'});
  const newVideo = { id: Date.now(), username: username||'anon', videoUrl, caption: caption||'', type: type||'video', likes:0, created: new Date().toISOString() };
  videos.push(newVideo);
  res.json(newVideo);
});

app.post('/api/like/:id', (req,res)=>{
  const v = videos.find(v=>v.id==req.params.id);
  if(v) v.likes++;
  res.json({success:true});
});

app.delete('/api/videos/:id', (req, res) => {
  if(req.headers['x-admin-pass'] !== ADMIN_PASSWORD) return res.status(401).json({error:'admin only'});
  videos = videos.filter(v=>v.id != req.params.id);
  res.json({ success:true });
});

app.post('/api/messages', (req,res)=>{
  const { from, to, text } = req.body;
  if(!from || !to || !text) return res.status(400).json({error:'missing'});
  const msg = { id: Date.now(), from, to, text, created: new Date().toISOString() };
  messages.push(msg);
  res.json(msg);
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

app.listen(PORT, ()=> console.log('ZYNVORA LIVE'));
