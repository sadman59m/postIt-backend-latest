const express = require("express");
const { body } = require("express-validator");

const router = express.Router();

const feedController = require("../controllers/feed");
const routeCheck = require("../middleware/is_auth");

router.get("/posts", routeCheck.isAuth, feedController.getPosts);

router.post(
  "/post",
  routeCheck.isAuth,
  [
    body("title").trim().isLength({ min: 5 }),
    body("content").trim().isLength({ min: 5 }),
  ],
  feedController.createPost
);

router.get("/post/:postId", routeCheck.isAuth, feedController.getPost);

router.put(
  "/post/:postId",
  routeCheck.isAuth,
  [
    body("title").trim().isLength({ min: 5 }),
    body("content").trim().isLength({ min: 5 }),
  ],
  feedController.updatePost
);

router.delete("/post/:postId", routeCheck.isAuth, feedController.deletePost);

router.get("/status", routeCheck.isAuth, feedController.getUserStatus);

router.put("/status", routeCheck.isAuth, feedController.updateUserStatus);

module.exports = router;
