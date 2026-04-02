const app = require('./src/app');
const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});
app.set('socketio', io);

const Message = require('./src/models/message.model');
const Product = require('./src/models/product.model');
const Chat = require('./src/models/chat.model');
const Notification = require('./src/models/notification.model');
const Bid = require('./src/models/bid.model');
const User = require('./src/models/user.model');

const onlineUsers = new Map(); // userId -> socketId

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Heartbeat/Presence registration
  socket.on('user_online', (userId) => {
    if (userId) {
      onlineUsers.set(userId.toString(), socket.id);
      socket.join(userId.toString()); // User joins their own room for global notifications
      io.emit('user_status_change', { userId: userId.toString(), status: 'online' });
      console.log(`User ${userId} is now online`);
    }
  });

  // Join a specific room (Chat or Auction)
  socket.on('join_room', async ({ roomId, userId, type }) => {
    if (userId) {
      onlineUsers.set(userId.toString(), socket.id);
    }
    try {
      if (type === 'chat') {
        const chat = await Chat.findOne({ _id: roomId, participants: userId });
        if (chat) {
          socket.join(roomId);
          console.log(`User ${userId} securely joined chat: ${roomId}`);
        } else {
          socket.emit('error', { message: 'Unauthorized room access.' });
        }
      } else if (type === 'auction') {
        // Auctions are public rooms for registered users
        socket.join(roomId);
        console.log(`User ${userId} watching auction: ${roomId}`);

        // Send initial history
        const history = await Bid.find({ product: roomId })
          .sort({ createdAt: -1 })
          .limit(10)
          .populate('bidder', 'name');
        socket.emit('bid_history', history);

        // Send broadcast history
        const product = await Product.findById(roomId);
        if (product && product.broadcasts) {
          socket.emit('broadcast_history', product.broadcasts.reverse().slice(0, 5));
        }
      }
    } catch (e) {
      console.error('Room Join Error:', e);
    }
  });

  // ── Real-time bidding ────────────────────────────────────────────────────
  socket.on('place_bid', async (data) => {
    const { productId, bidderId, bidAmount } = data;

    try {
      const bidder = await User.findById(bidderId);
      if (bidder && bidder.status === 'banned') {
        socket.emit('bid_error', { message: 'You are currently banned and can only watch. Interaction is disabled.' });
        return;
      }

      const product = await Product.findById(productId);

      if (!product || product.status !== 'active_auction') {
        socket.emit('bid_error', { message: 'This auction is not active.' });
        return;
      }

      // Guard: Seller cannot bid on their own item
      if (product.seller.toString() === bidderId) {
        socket.emit('bid_error', { message: 'You cannot bid on your own listing.' });
        return;
      }

      if (new Date() > product.auctionEndTime) {
        socket.emit('bid_error', { message: 'Auction has already ended.' });
        return;
      }

      // Lock: Check fresh DB state for highest bid
      if (bidAmount <= product.currentHighestBid) {
        socket.emit('bid_error', { message: `Bid must be higher than current highest (₹${product.currentHighestBid}).` });
        return;
      }

      // Record the bid
      const newBid = await Bid.create({
        product: productId,
        bidder: bidderId,
        amount: bidAmount
      });

      // Update Product pointer
      product.currentHighestBid = bidAmount;
      product.highestBidder = bidderId;
      await product.save();

      const populatedBid = await newBid.populate('bidder', 'name');

      // Fetch fresh history for the room
      const history = await Bid.find({ product: productId })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('bidder', 'name');

      // Broadcast to everyone in the auction room
      io.to(productId).emit('bid_updated', {
        productId,
        currentHighestBid: product.currentHighestBid,
        highestBidderName: populatedBid.bidder.name,
        history: history
      });

    } catch (err) {
      console.error('Bid processing error:', err);
      socket.emit('bid_error', { message: 'Server error while processing bid.' });
    }
  });

  // ── Seller Broadcasts ────────────────────────────────────────────────────
  socket.on('seller_broadcast', async ({ productId, text }) => {
    try {
      const product = await Product.findById(productId);
      if (!product) return;

      const newBroadcast = { text, timestamp: new Date() };
      product.broadcasts.push(newBroadcast);
      await product.save();

      io.to(productId).emit('broadcast_received', newBroadcast);
    } catch (err) {
      console.error('Broadcast saving error:', err);
    }
  });

  // In-memory cooldown tracker for spam prevention
  const lastMessageTimers = new Map(); // userId -> timestamp

  // Handle individual chat messages with strict spam protection & limits
  socket.on('send_message', async (data) => {
    try {
      const { chatId, senderId, text, isAudio, attachmentUrl, isImage } = data;
      const now = Date.now();

      // 0. Ban check
      const sender = await User.findById(senderId);
      if (sender && sender.status === 'banned') {
        return socket.emit('error', { message: 'You are currently banned and can only watch. Interaction is disabled.' });
      }

      // 1. Participant & Access Verification
      const chat = await Chat.findOne({ _id: chatId, participants: senderId });
      if (!chat) return socket.emit('error', { message: 'Unauthorized access.' });

      // 2. Anti-Spam (1 second cooldown)
      const prevTime = lastMessageTimers.get(senderId.toString());
      if (prevTime && (now - prevTime < 1000)) {
        return socket.emit('error', { message: 'Slow down! Please wait a second before sending another message.' });
      }
      lastMessageTimers.set(senderId.toString(), now);

      // 3. Size Limits (100 words per message - Admins exempt)
      const wordCount = text ? text.trim().split(/\s+/).length : 0;
      if (sender && sender.role !== 'admin' && wordCount > 100) {
        return socket.emit('error', { message: 'Message exceeds the 100-word limit per query.' });
      }

      // 4. Database Bloat Prevention (Max 50 messages per chat thread - Admins exempt)
      const totalMessages = await Message.countDocuments({ chat: chatId });
      if (sender && sender.role !== 'admin' && totalMessages >= 50) {
        return socket.emit('error', { message: 'Chat interaction limit reached (50 messages). Please resolve this query in current messages.' });
      }

      const message = await Message.create({
        chat: chatId,
        sender: senderId,
        content: text || '',
        attachmentUrl: attachmentUrl || '',
        isAudio: isAudio || false,
        isImage: isImage || false
      });

      // Update Chat metadata: lastMessage and increment unreadCount
      if (chat) {
        chat.lastMessage = text;
        chat.participants.forEach(participant => {
          if (participant.toString() !== senderId) {
            chat.unreadCount.set(participant.toString(), (chat.unreadCount.get(participant.toString()) || 0) + 1);

            // Create a database notification for the recipient
            Notification.create({
              recipient: participant,
              sender: senderId,
              chat: chatId,
              product: chat.product,
              content: text
            }).catch(e => console.error('Notification Error:', e));
          }
        });
        await chat.save();
      }

      const populatedMsg = await message.populate('sender', 'name');
      // Broadcast to both participants via their personal rooms
      chat.participants.forEach(p => {
        io.to(p.toString()).emit('receive_message', populatedMsg);
      });
    } catch (err) {
      console.error('Error saving message:', err);
    }
  });

  socket.on('check_online', ({ userId }) => {
    socket.emit('user_status_change', { userId, status: onlineUsers.has(userId) ? 'online' : 'offline' });
  });

  socket.on('disconnect', () => {
    let disconnectedUserId = null;
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        disconnectedUserId = userId;
        break;
      }
    }
    if (disconnectedUserId) {
      onlineUsers.delete(disconnectedUserId);
      io.emit('user_status_change', { userId: disconnectedUserId, status: 'offline' });
    }
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`Campus Kart is running on port ${PORT}`);
});
