const Spot = require('../models/Spot');
const Booking = require('../models/Booking');
const crypto = require('crypto');

// Get all spots (Accessible by all authenticated users)
exports.getSpots = async (req, res) => {
  try {
    const spots = await Spot.find().sort({ spotNumber: 1 });
    res.status(200).json({ spots });
  } catch (error) {
    console.error('Get Spots Error:', error);
    res.status(500).json({ error: 'Internal server error fetching spots' });
  }
};

// Get current user's active booking
exports.getMyBooking = async (req, res) => {
  try {
    const userId = req.user.userId;
    const booking = await Booking.findOne({ 
      user: userId, 
      status: { $in: ['Booked', 'Checked-In'] } 
    }).populate('spot');

    res.status(200).json({ booking });
  } catch (error) {
    console.error('Get My Booking Error:', error);
    res.status(500).json({ error: 'Internal server error fetching your booking' });
  }
};

// Book a spot (Customer only)
exports.bookSpot = async (req, res) => {
  try {
    const { spotId, vehicleType, vehicleRegistration, startTime } = req.body;
    const userId = req.user.userId;

    if (!spotId) return res.status(400).json({ error: 'Spot ID is required' });

    // NEW: Check if user already has an active booking
    const activeBooking = await Booking.findOne({ 
      user: userId, 
      status: { $in: ['Booked', 'Checked-In'] } 
    });

    if (activeBooking) {
      return res.status(403).json({ error: 'You already have an active reservation.' });
    }

    const updatedSpot = await Spot.findOneAndUpdate(
      { _id: spotId, status: 'Available' },
      { status: 'Booked' },
      { new: true }
    );

    if (!updatedSpot) {
      return res.status(409).json({ error: 'Race condition averted: Spot is no longer available' });
    }

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

    req.io.emit('spotUpdated', {
      spotId: updatedSpot._id,
      spotNumber: updatedSpot.spotNumber,
      status: updatedSpot.status,
      booking: newBooking
    });

    res.status(200).json({ message: 'Spot booked successfully', booking: newBooking });
  } catch (error) {
    console.error('Book Spot Error:', error);
    res.status(500).json({ error: 'Internal server error during booking' });
  }
};

// Cancel a booking (Customer only)
exports.cancelBooking = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { bookingId } = req.body;

    const booking = await Booking.findOne({ _id: bookingId, user: userId, status: 'Booked' }).populate('spot');
    
    if (!booking) {
      return res.status(404).json({ error: 'Active booking not found or cannot be cancelled.' });
    }

    const spot = booking.spot;
    booking.status = 'Cancelled';
    spot.status = 'Available';
    spot.currentBookingId = null;

    await booking.save();
    await spot.save();

    req.io.emit('spotUpdated', { spotId: spot._id, spotNumber: spot.spotNumber, status: spot.status });
    res.status(200).json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get User Booking History
exports.getUserHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const history = await Booking.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate('spot', 'spotNumber');

    res.status(200).json({ history });
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
      if (!booking) return res.status(404).json({ error: 'No active booking found for this token.' });
      
      booking.status = 'Checked-In';
      booking.spot.status = 'Occupied';
      await booking.save();
      await booking.spot.save();

      req.io.emit('spotUpdated', { spotId: booking.spot._id, spotNumber: booking.spot.spotNumber, status: 'Occupied', booking });
      return res.status(200).json({ message: 'Check-in successful', spotNumber: booking.spot.spotNumber });
    } else {
      const booking = await Booking.findOne({ qrCodeToken, status: 'Checked-In' }).populate('spot');
      if (!booking) return res.status(404).json({ error: 'No vehicle found inside with this token.' });
      
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

// Force Action (Guard only - bypass QR)
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

// Get Admin Stats (Admin only)
exports.getAdminStats = async (req, res) => {
  try {
    const totalSpots = await Spot.countDocuments();
    const availableSpots = await Spot.countDocuments({ status: 'Available' });
    const bookedSpots = await Spot.countDocuments({ status: 'Booked' });
    const occupiedSpots = await Spot.countDocuments({ status: 'Occupied' });
    
    const checkInCount = await Booking.countDocuments({ status: { $in: ['Checked-In', 'Completed'] } });
    const totalRevenue = checkInCount * 10;

    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);
    const dailyCheckins = await Booking.countDocuments({ 
      status: 'Checked-In', 
      updatedAt: { $gte: startOfDay } 
    });

    const recentActivity = await Booking.find()
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate('user', 'name')
      .populate('spot', 'spotNumber');

    res.status(200).json({
      totalSpots,
      availableSpots,
      bookedSpots,
      occupiedSpots,
      totalRevenue,
      dailyCheckins,
      recentActivity
    });
  } catch (error) {
    console.error('Admin Stats Error:', error);
    res.status(500).json({ error: 'Internal server error fetching stats' });
  }
};
