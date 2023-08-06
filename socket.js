let io;

module.exports = {
  init: (httpServer) => {
    io = require("socket.io")(httpServer, {
      cors: {
        origin: "*",
      },
    });
    return io;
  },
  getI0: () => {
    if (!io) {
      const error = new Error("Socekt Connection Failed");
      error.statusCode = 500;
      throw error;
    }
    return io;
  },
};
