const { Server } = require('socket.io');
const User = require('./models/User');
const { verifyToken } = require('./utils/jwt');

function attachSocket(server, allowedOrigins) {
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Not authenticated'));

      const payload = verifyToken(token);
      const user = await User.findById(payload.sub).select('name email role brokerageId isActive tokenVersion');
      if (!user || !user.isActive || user.tokenVersion !== payload.tv) {
        return next(new Error('Session revoked or account disabled'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Invalid socket session'));
    }
  });

  io.on('connection', (socket) => {
    const brokerageId = socket.user.brokerageId?.toString();
    if (brokerageId) {
      socket.join(`brokerage:${brokerageId}`);
    }

    socket.emit('socket:ready', {
      userId: socket.user._id.toString(),
      brokerageId: brokerageId || null,
    });
  });

  return io;
}

module.exports = attachSocket;

// const { Server } = require('socket.io');
// const User = require('./models/User');
// const { verifyToken } = require('./utils/jwt');

// function attachSocket(server, allowedOrigins) {
//   const io = new Server(server, {
//     cors: {
//       origin: allowedOrigins,
//       credentials: true,
//     },
//   });

//   io.use(async (socket, next) => {
//     try {
//       const token = socket.handshake.auth?.token;
//       if (!token) return next(new Error('Not authenticated'));

//       const payload = verifyToken(token);
//       const user = await User.findById(payload.sub).select('name email role brokerageId isActive tokenVersion');
//       if (!user || !user.isActive || user.tokenVersion !== payload.tv) {
//         return next(new Error('Session revoked or account disabled'));
//       }

//       socket.user = user;
//       next();
//     } catch (error) {
//       next(new Error('Invalid socket session'));
//     }
//   });

//   io.on('connection', (socket) => {
//     const brokerageId = socket.user.brokerageId?.toString();
//     if (brokerageId) {
//       socket.join(`brokerage:${brokerageId}`);
//     }

//     socket.emit('socket:ready', {
//       userId: socket.user._id.toString(),
//       brokerageId: brokerageId || null,
//     });
//   });

//   return io;
// }

// module.exports = attachSocket;
