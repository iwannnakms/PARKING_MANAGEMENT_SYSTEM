const Spot = require('../models/Spot');
const Booking = require('../models/Booking');
const User = require('../models/User');
const crypto = require('crypto');
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create Razorpay Order
exports.createOrder = async (req, res) => {
  try {
    const amount = 100 * 100; // Amount in paise (₹100)
    const options = {
      amount,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`
    };
    const order = await razorpay.orders.create(options);
    res.status(200).json({ order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create payment order' });
  }
};

// Book a spot
exports.bookSpot = async (req, res) => {
  try {
    const { spotId, vehicleType, vehicleRegistration, startTime, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const userId = req.user.userId;

    if (!spotId) return res.status(400).json({ error: 'Spot ID is required' });

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature.' });
    }

    const activeBooking = await Booking.findOne({ user: userId, status: { $in: ['Booked', 'Checked-In'] } });
    if (activeBooking) return res.status(403).json({ error: 'You already have an active reservation.' });

    const updatedSpot = await Spot.findOneAndUpdate({ _id: spotId, status: 'Available' }, { status: 'Booked' }, { new: true });
    if (!updatedSpot) return res.status(409).json({ error: 'Spot no longer available' });

    const qrToken = crypto.randomBytes(16).toString('hex');
    const newBooking = new Booking({
      user: userId,
      spot: updatedSpot._id,
      status: 'Booked',
      qrCodeToken: qrToken,
      vehicleType: vehicleType || 'Four-wheeler',
      vehicleRegistration: vehicleRegistration || 'N/A',
      startTime: startTime ? new Date(startTime) : Date.now()
    });

    await newBooking.save();
    updatedSpot.currentBookingId = newBooking._id;
    await updatedSpot.save();

    req.io.emit('spotUpdated', { spotId: updatedSpot._id, spotNumber: updatedSpot.spotNumber, status: updatedSpot.status, booking: newBooking });
    res.status(200).json({ message: 'Spot booked successfully', booking: newBooking });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Unified Token Validation (Check-in/Check-out)
exports.validateToken = async (req, res) => {
  try {
    const { qrCodeToken, mode } = req.body;
    if (mode === 'checkin') {
      const booking = await Booking.findOne({ qrCodeToken, status: 'Booked' }).populate('spot');
      if (!booking) return res.status(404).json({ error: 'No active booking found.' });
      
      booking.status = 'Checked-In';
      booking.checkInTime = Date.now();
      booking.spot.status = 'Occupied';
      await booking.save();
      await booking.spot.save();

      req.io.emit('spotUpdated', { spotId: booking.spot._id, spotNumber: booking.spot.spotNumber, status: 'Occupied', booking });
      return res.status(200).json({ message: 'Check-in successful', spotNumber: booking.spot.spotNumber });
    } else {
      const booking = await Booking.findOne({ qrCodeToken, status: 'Checked-In' }).populate('spot');
      if (!booking) return res.status(404).json({ error: 'No vehicle found inside.' });
      
      booking.status = 'Completed';
      booking.endTime = Date.now();
      booking.spot.status = 'Available';
      booking.spot.currentBookingId = null;
      await booking.save();
      await booking.spot.save();

      req.io.emit('spotUpdated', { spotId: booking.spot._id, spotNumber: booking.spot.spotNumber, status: 'Available', booking });
      return res.status(200).json({ message: 'Check-out successful', spotNumber: booking.spot.spotNumber });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Force Action
exports.forceAction = async (req, res) => {
  try {
    const { spotId, action } = req.body;
    const spot = await Spot.findById(spotId);
    if (!spot) return res.status(404).json({ error: 'Spot not found' });
    let booking;
    if (action === 'checkin') {
      spot.status = 'Occupied';
      booking = await Booking.findOne({ spot: spotId, status: 'Booked' });
      if (booking) {
        booking.status = 'Checked-In';
        booking.checkInTime = Date.now();
        await booking.save();
      }
    } else {
      spot.status = 'Available';
      spot.currentBookingId = null;
      booking = await Booking.findOne({ spot: spotId, status: 'Checked-In' });
      if (booking) {
        booking.status = 'Completed';
        booking.endTime = Date.now();
        await booking.save();
      }
    }
    await spot.save();
    req.io.emit('spotUpdated', { spotId: spot._id, spotNumber: spot.spotNumber, status: spot.status, booking });
    res.status(200).json({ message: `Force ${action} successful` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Manage Spot Count (Admin only)
exports.manageSpots = async (req, res) => {
  try {
    const { targetCount } = req.body;
    const currentCount = await Spot.countDocuments();
    
    if (targetCount > currentCount) {
      const spotsToAdd = [];
      for (let i = currentCount + 1; i <= targetCount; i++) {
        spotsToAdd.push({
          spotNumber: `A${i.toString().padStart(2, '0')}`,
          status: 'Available'
        });
      }
      await Spot.insertMany(spotsToAdd);
    } else if (targetCount < currentCount) {
      const diff = currentCount - targetCount;
      const spotsToRemove = await Spot.find({ status: 'Available' })
        .sort({ spotNumber: -1 })
        .limit(diff);
      
      const ids = spotsToRemove.map(s => s._id);
      await Spot.deleteMany({ _id: { $in: ids } });
    }

    req.io.emit('spotUpdated', { refresh: true });
    res.status(200).json({ message: `Inventory updated to ${targetCount} spots` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Simple getters
exports.getSpots = async (req, res) => {
  try {
    const spots = await Spot.find().sort({ spotNumber: 1 });
    res.status(200).json({ spots });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getMyBooking = async (req, res) => {
  try {
    const userId = req.user.userId;
    const booking = await Booking.findOne({ user: userId, status: { $in: ['Booked', 'Checked-In'] } }).populate('spot');
    res.status(200).json({ booking });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.cancelBooking = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { bookingId } = req.body;
    const booking = await Booking.findOne({ _id: bookingId, user: userId, status: 'Booked' }).populate('spot');
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    booking.status = 'Cancelled';
    booking.spot.status = 'Available';
    booking.spot.currentBookingId = null;
    await booking.save();
    await booking.spot.save();
    req.io.emit('spotUpdated', { spotId: booking.spot._id, spotNumber: booking.spot.spotNumber, status: 'Available' });
    res.status(200).json({ message: 'Cancelled' });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getUserHistory = async (req, res) => {
  try {
    const history = await Booking.find({ user: req.user.userId }).sort({ createdAt: -1 }).populate('spot');
    res.status(200).json({ history });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getRecentActivity = async (req, res) => {
  try {
    const activity = await Booking.find().sort({ updatedAt: -1 }).limit(15).populate('user').populate('spot');
    res.status(200).json({ activity });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getAdminStats = async (req, res) => {
  try {
    const totalSpots = await Spot.countDocuments();
    const availableSpots = await Spot.countDocuments({ status: 'Available' });
    const bookedSpots = await Spot.countDocuments({ status: 'Booked' });
    const occupiedSpots = await Spot.countDocuments({ status: 'Occupied' });
    const checkInCount = await Booking.countDocuments({ status: { $in: ['Checked-In', 'Completed'] } });
    const totalRevenue = checkInCount * 100;
    const startOfDay = new Date(); startOfDay.setHours(0,0,0,0);
    const dailyCheckins = await Booking.countDocuments({ status: 'Checked-In', updatedAt: { $gte: startOfDay } });
    const recentActivity = await Booking.find().sort({ updatedAt: -1 }).limit(10).populate('user').populate('spot');
    res.status(200).json({ totalSpots, availableSpots, bookedSpots, occupiedSpots, totalRevenue, dailyCheckins, recentActivity });
  } catch (error) { res.status(500).json({ error: error.message }); }
};
