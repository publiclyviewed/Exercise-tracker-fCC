const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");
const { Schema } = mongoose;

mongoose
  .connect(process.env.DB_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to the database"))
  .catch((err) => console.error("Database connection error:", err));

const UserSchema = new Schema({ username: String });
const User = mongoose.model("User", UserSchema);

const ExerciseSchema = new Schema({
  user_id: { type: String, required: true },
  description: String,
  duration: Number,
  date: Date,
});
const Exercise = mongoose.model("Exercise", ExerciseSchema);

app.use(cors());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => res.sendFile(__dirname + "/views/index.html"));

app.post("/api/users", async (req, res) => {
  const userObj = new User({ username: req.body.username });
  try {
    const user = await userObj.save();
    res.json({ username: user.username, _id: user._id });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating user");
  }
});

app.get("/api/users", async (req, res) => {
  const users = await User.find({}).select("_id username");
  res.json(users);
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const id = req.params._id;
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) {
      res.status(404).send("Could not find user");
      return;
    }

    const parsedDate = date ? new Date(date) : new Date();
    if (isNaN(parsedDate)) {
      res.status(400).send({ error: "Invalid date" });
      return;
    }

    const exerciseObj = new Exercise({
      user_id: user._id,
      description,
      duration,
      date: parsedDate,
    });

    const exercise = await exerciseObj.save();
    res.json({
      _id: user._id,
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error saving exercise");
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const { to, from, limit } = req.query;
  const id = req.params._id;

  try {
    const user = await User.findById(id);
    if (!user) {
      res.status(404).send("Could not find user");
      return;
    }

    const dateObj = {};
    if (from) dateObj["$gte"] = new Date(from);
    if (to) dateObj["$lte"] = new Date(to);

    const filter = { user_id: id };
    if (from || to) filter.date = dateObj;

    const exercises = await Exercise.find(filter).limit(+limit || 500);
    const log = exercises.map((e) => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString(),
    }));

    res.json({ username: user.username, count: exercises.length, _id: user._id, log });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving logs");
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + (process.env.PORT || 3000));
});
