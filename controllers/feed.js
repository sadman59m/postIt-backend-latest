const fs = require("fs");
const path = require("path");

const { validationResult } = require("express-validator");

const Post = require("../models/post");
const User = require("../models/user");
const io = require("../socket");

exports.getPosts = async (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2; //defined in front end

  try {
    const totalItems = await Post.find().countDocuments();
    const posts = await Post.find()
      .populate("creator", ["name", "email"])
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    res.status(200).json({
      message: "Posts Fetching Successful",
      posts: posts,
      totalItems: totalItems,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }

  // Post.countDocuments()
  //   .then((totalDocs) => {
  //     totalItems = totalDocs;
  //     return Post.find()
  //       .populate("creator", ["name", "email"])
  //       .skip((currentPage - 1) * perPage)
  //       .limit(perPage);
  //   })
  //   .then((posts) => {
  //     res.status(200).json({
  //       message: "posts fetched successfully",
  //       posts: posts,
  //       totalItems: totalItems, //defined in frontEnd
  //     });
  //   })
  //   .catch((err) => {
  //     if (!err.statusCode) {
  //       err.statusCode = 500;
  //     }
  //     next(err);
  //   });
};

exports.createPost = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const error = new Error("validation failed.");
    error.statusCode = 422;
    throw error;
  }

  if (!req.file) {
    const error = new Error("No image provided");
    error.statusCode = 422;
    throw error;
  }

  const title = req.body.title;
  const content = req.body.content;
  const imageUrl = req.file.path.replace("\\", "/");

  const post = new Post({
    title: title,
    content: content,
    imageUrl: imageUrl,
    creator: req.userId,
  });

  let postId;
  // let creator;

  post
    .save()
    .then((post) => {
      postId = post._id;
      return User.findById(req.userId);
    })
    .then((user) => {
      if (!user) {
        const error = new Error("User not found");
        error.statusCode = 401;
        throw error;
      }
      user.posts.push(postId);
      return user.save();
    })
    .then((result) => {
      io.getI0().emit("posts", {
        action: "create",
        post: { ...post._doc, creator: { id: req.userId, name: result.name } },
        creator: { _id: result._id, name: result.name },
      });
      res.status(201).json({
        message: "Post created Successfully",
        post: post,
        creator: { _id: result._id, name: result.name },
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.getPost = (req, res, next) => {
  const postId = req.params.postId;
  Post.findById(postId)
    .populate("creator", "name")
    .then((post) => {
      if (!post) {
        const error = new Error("Post not found.");
        error.statusCode = 404;
        throw error; // next catch block will catch this error
      }
      res.status(200).json({ message: "Post found", post: post });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.updatePost = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("validation failed.");
    error.statusCode = 422;
    throw error;
  }

  const postId = req.params.postId;
  const title = req.body.title;
  const content = req.body.content;
  let imageUrl = req.body.image;

  if (req.file) {
    imageUrl = req.file.path.replace("\\", "/");
  }
  if (!imageUrl) {
    const error = new Error("No image provided");
    error.statusCode = 422;
    throw error;
  }

  let updatedPost;

  Post.findById(postId)
    .populate("creator")
    .then((post) => {
      updatedPost = post;
      if (!post) {
        const error = new Error("Post not found.");
        error.statusCode = 404;
        throw error;
      }
      if (post.creator._id.toString() !== req.userId) {
        const error = new Error("Not authorized");
        error.statusCode = 401;
        throw error;
      }
      if (imageUrl !== post.imageUrl) {
        clearImage(post.imageUrl);
      }
      post.title = title;
      post.content = content;
      post.imageUrl = imageUrl;
      return post.save();
    })
    .then((result) => {
      io.getI0().emit("posts", {
        action: "update",
        post: {
          ...updatedPost._doc,
          creator: { id: req.userId, name: updatedPost.creator.name },
        },
        creator: {
          _id: updatedPost.creator._id,
          name: updatedPost.creator.name,
        },
      });
      res.status(200).json({
        message: "Post update Successful",
        post: result,
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.deletePost = (req, res, next) => {
  const postId = req.params.postId;
  Post.findById(postId)
    .then((post) => {
      if (!post) {
        const error = new Error("Post not found.");
        error.statusCode = 404;
        throw error;
      }
      if (post.creator.toString() !== req.userId) {
        const error = new Error("Not authorized");
        error.statusCode = 401;
        throw error;
      }
      clearImage(post.imageUrl);
      return Post.findByIdAndRemove(postId);
    })
    .then((result) => {
      return User.findById(req.userId);
    })
    .then((user) => {
      user.posts.pull(postId);
      return user.save();
    })
    .then((resutl) => {
      io.getI0().emit("posts", {
        action: "delete",
        post: postId,
      });
      res.status(200).json({ message: "Post Deleted." });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.getUserStatus = async (req, res, next) => {
  try {
    const userData = await User.findById(req.userId);
    const userStatus = userData.status;
    res.status(200).json({ message: "status reached", status: userStatus });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updateUserStatus = async (req, res, next) => {
  try {
    const newStatus = req.body.status;

    const userData = await User.findById(req.userId);

    userData.status = newStatus;

    const updatedUser = userData.save();
    res.status(200).json({ message: "status updated" });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// Helper Fucntion
const clearImage = (filePath) => {
  filePath = path.join(__dirname, "..", filePath);
  fs.unlink(filePath, (err) => {
    console.log(err);
  });
};
