const express = require("express");
const app = express();
const cors = require("cors");
const db = require("mongodb");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// parse form data
app.use(express.urlencoded({ extended: false }));
// parse json
app.use(express.json());

// create Mongo DB Schema/Model
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    require: true,
  },
  count: {
    type: Number,
  },
  log: [
    {
      description: {
        type: String,
      },
      duration: {
        type: Number,
      },
      date: {
        type: Date,
      },
    },
  ],
});

const userModel = mongoose.model("User", userSchema);

// routes

// get all users
app.get("/api/users", async (req, res) => {
  const fetchUsers = await userModel.find({});
  const allUsers = fetchUsers.map((user) => {
    return { _id: user._id, username: user.username };
  });
  res.json(allUsers);
});

// create new user
app.post("/api/users", async (req, res) => {
  let username = req.body.username;
  if (!username) {
    res.json({ message: "Please provide username" });
  } else {
    try {
      const userExists = await userModel.findOne({ username: username });
      if (userExists) {
        res.json({ message: "user already exists, try again" });
      }
      const user = await userModel.create({ username });
      res.json({ username: username, _id: user._id });
    } catch (error) {
      console.log(error);
    }
  }
});

// create exercise

app.post("/api/users/:_id/exercises", async (req, res) => {
  try {
    const userId = await req.params._id;
    // search for user in db
    const user = await userModel.findOne({ _id: userId });
    if (!user) {
      return res.json({ message: "Incorrect user id, please try again" });
    }
    // get exercise form data
    const description = req.body.description;
    const duration = req.body.duration;
    if (!description || !duration) {
      return res.json({ message: "Please provide Description and Duration of exercise." });
    }
    // get date input or create
    let date;
    if (!req.body.date) {
      date = new Date(); // if no date provided set to current date
    } else {
      // check for date input format yyyy-mm-dd
      var date_regex = /^\d{4}\-\d{1,2}\-\d{1,2}$/;
      if (!date_regex.test(req.body.date)) {
        return res.json({ message: "Incorrect date format. Please try again." });
      } else {
        date = new Date(req.body.date);
      }
    }

    const newFields = {
      description: description,
      duration: duration,
      date: date,
    };
    const updatedUser = await userModel.findOneAndUpdate({ _id: userId }, { $push: { log: newFields } }, { new: true, runValidators: true });
    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      date: updatedUser.date,
      description: updatedUser.description,
      duration: updatedUser.duration,
    });
  } catch (error) {
    console.log(error);
  }
});

// Connect to DB  to server

const initial = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useCreateIndex: true,
      useFindAndModify: true,
      useUnifiedTopology: true,
    });
    const listener = app.listen(process.env.PORT || 3000, () => {
      console.log("Your app is listening on port " + listener.address().port);
    });
  } catch (error) {
    console.log(error);
  }
};

initial();
