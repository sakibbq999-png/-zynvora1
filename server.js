const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Memory Database - Render e er cheye valo cholbe
let users = [];
let videos = [];

// --- API ---
app.get('/api/users', (req, res) => {
  res.json(users);
});

app.post('/api/register', (req, res) => {
  const { username, bio } = req.body;
  if (!username) return res.status(400).json({ error: 'username required' });
  const newUser = { id: Date.now(), username, bio: bio || '' };
  users.push(newUser);
  res.json(newUser);
});

app.delete('/api/users/:id', (req, res) => {
  users = users.filter(u => u.id != req.params.id && u.id != Number(req.params.id));
  res.json({ success: true });
});

app.get('/api/videos', (req, res) => {
  res.json(videos);
});

app.post('/api/videos', (req, res) => {
  const { username, videoUrl, descp } = req.body;
  if (!videoUrl) return res.status(400).json({ error: 'videoUrl required' });
  const newVideo = { id: Date.now(), username: username || 'anon', videoUrl, descp: descp || '' };
  videos.push(newVideo);
  res.json(newVideo);
});

app.delete('/api/videos/:id', (req, res) => {
  videos = videos.filter(v => v.id != req.params.id && v.id != Number(req.params.id));
  res.json({ success: true });
});

// --- PAGES ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.listen(PORT, () => {
  console.log('ZYNVORA LIVE ON ' + PORT);
});
