const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // To parse JSON bodies
app.use(express.urlencoded({ extended: true })); // To parse URL-encoded bodies
app.use(express.static('public'));

// Database Connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Mongoose Schemas and Models
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// POST /api/users
app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body;
    const newUser = new User({ username });
    const savedUser = await newUser.save();
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (error) {
    res.status(400).json({ error: 'Username already taken' });
  }
});

// GET /api/users
app.get('/api/users', async (req, res) => {
  const users = await User.find({}, 'username _id');
  res.json(users);
});

// POST /api/users/:_id/exercises
app.post('/api/users/:_id/exercises', async (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const newExercise = new Exercise({
      userId: _id,
      description,
      duration,
      date: date ? new Date(date) : new Date(),
    });

    const savedExercise = await newExercise.save();
    res.json({
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString(),
      _id: user._id,
    });
  } catch (error) {
    res.status(400).json({ error: 'Error saving exercise' });
  }
});

// GET /api/users/:_id/logs
app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  try {
    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let query = { userId: _id };
    if (from) query.date = { ...query.date, $gte: new Date(from) };
    if (to) query.date = { ...query.date, $lte: new Date(to) };

    let log = await Exercise.find(query)
      .select('description duration date')
      .limit(parseInt(limit))
      .exec();

    log = log.map(ex => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString(),
    }));

    res.json({
      username: user.username,
      count: log.length,
      _id: user._id,
      log,
    });
  } catch (error) {
    res.status(400).json({ error: 'Error fetching logs' });
  }
});

// Start the server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
