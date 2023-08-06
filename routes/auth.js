const express = require("express");
const { body } = require("express-validator");

const User = require("../models/user");

const router = express.Router();

const authController = require("../controllers/auth");

router.put(
  "/singup",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .custom((value, { req }) => {
        return User.findOne({ email: value }).then((userDoc) => {
          if (userDoc) {
            return Promise.reject("Email already exists.");
          }
        });
      }),
    body("password").trim().isLength({ min: 5 }),
    body("name").trim().not().isEmpty(),
  ],
  authController.singup
);

router.post("/login", authController.login);

module.exports = router;
