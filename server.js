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
      date = new Date().toDateString(); // if no date provided set to current date
    } else {
      // check for date input format yyyy-mm-dd
      var date_regex = /^\d{4}\-\d{1,2}\-\d{1,2}$/;
      if (!date_regex.test(req.body.date)) {
        return res.json({ message: "Incorrect date format. Please try again." });
      } else {
        date = new Date(req.body.date).toDateString();
      }
    }

    const newFields = {
      description: description,
      duration: duration,
      date: date.toString(),
    };
    const updatedUser = await userModel.findOneAndUpdate({ _id: userId }, { $push: { log: newFields } }, { new: true, runValidators: true });

    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      date: updatedUser.log[updatedUser.log.length - 1].date.toDateString(),
      description: updatedUser.log[updatedUser.log.length - 1].description,
      duration: updatedUser.log[updatedUser.log.length - 1].duration,
    });
  } catch (error) {
    console.log(error);
  }
});

// get user all exercises log and count

app.get("/api/users/:_id/logs", async (req, res) => {
  const userId = await req.params._id;
  let { from, to, limit } = req.query;
  // const userObj = await userModel.findOne({ _id: userId });

  // if (!userObj) {
  //   res.send("Incorrect user Id");
  // }

  // // from,to parameters

  // // limit parameter
  // let logs = userObj.log;
  // if (!limit) {
  //   const newLogs = logs.map((exc) => {
  //     const { description, duration, date } = exc;
  //     return {
  //       description,
  //       duration,
  //       date: date,
  //     };
  //   });
  //   const count = newLogs.length;
  //   res.json({ _id: userId, username: userObj.username, count: count, log: newLogs });
  // } else {
  //   const nm = Number(limit);
  //   const spliceLogs = logs.splice(0, nm);
  //   const newLogs = spliceLogs.map((exc) => {
  //     const { description, duration, date } = exc;
  //     return {
  //       description,
  //       duration,
  //       date: date,
  //     };
  //   });
  //   const count = newLogs.length;
  //   res.json({ _id: userId, username: userObj.username, count: count, log: newLogs });
  // }

  userModel.findById(userId, (err, user) => {
    if (err) {
      console.error(err);
    }

    if (user) {
      let log = user.log;
      if (from) {
        log = log.filter((exercise) => new Date(exercise.date).getTime() >= new Date(from).getTime());
        from = new Date(from).toDateString();
      }
      if (to) {
        log = log.filter((exercise) => new Date(exercise.date).getTime() <= new Date(to).getTime());
        to = new Date(to).toDateString();
      }
      if (limit >= 1) {
        log = log.slice(0, limit);
      }

      if (from && !to) {
        res.json({
          _id: user.id,
          username: user.username,
          from: from,
          count: log.length,
          log: log,
        });
      } else if (to && !from) {
        res.json({
          _id: user.id,
          username: user.username,
          to: to,
          count: log.length,
          log: log,
        });
      } else if (from && to) {
        res.json({
          _id: user.id,
          username: user.username,
          from: from,
          to: to,
          count: log.length,
          log: log,
        });
      } else {
        res.json({
          _id: user.id,
          username: user.username,
          count: log.length,
          log: log,
        });
      }
    } else {
      res.send("unknown userId");
    }
  });
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
