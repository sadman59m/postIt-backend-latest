const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/user");

exports.singup = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("User validation failed.");
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }
  const email = req.body.email;
  const password = req.body.password;
  const name = req.body.name;

  bcrypt
    .hash(password, 12)
    .then((hashedP) => {
      const user = new User({
        email: email,
        password: hashedP,
        name: name,
      });
      return user.save();
    })
    .then((user) => {
      res.status(201).json({ message: "User Created", userId: user._id });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.login = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  let loggedUser;

  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        const error = new Error("User with this email does not exist.");
        error.statusCode = 401;
        throw error;
      }
      loggedUser = user;
      return bcrypt.compare(password, user.password);
    })
    .then((isEqual) => {
      if (!isEqual) {
        const error = new Error("Invalid password");
        error.statusCode = 401;
        throw error;
      }

      // applying jwt
      const token = jwt.sign(
        { email: loggedUser.email, userId: loggedUser._id.toString() },
        "verysecretkey",
        { expiresIn: "1h" }
      );
      res.status(200).json({ token: token, userId: loggedUser._id.toString() });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
