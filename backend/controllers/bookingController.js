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

// Book a spot (Customer only)
exports.bookSpot = async (req, res) => {
  try {
    const { spotId } = req.body;
    const userId = req.user.userId;

    if (!spotId) return res.status(400).json({ error: 'Spot ID is required' });

    // 1. Atomic update to prevent race conditions
    const updatedSpot = await Spot.findOneAndUpdate(
      { _id: spotId, status: 'Available' },
      { status: 'Booked' },
      { new: true }
    );

    if (!updatedSpot) {
      return res.status(409).json({ error: 'Race condition averted: Spot is no longer available' });
    }

    // 2. We now have exclusive claim to this spot. Create the booking.
    const qrToken = crypto.randomBytes(16).toString('hex');
    const newBooking = new Booking({
      user: userId,
      spot: updatedSpot._id,
      status: 'Booked',
      qrCodeToken: qrToken
    });

    await newBooking.save();

    // 3. Link booking to spot
    updatedSpot.currentBookingId = newBooking._id;
    await updatedSpot.save();

    // 4. Emit Socket.io event to all connected clients
    req.io.emit('spotUpdated', {
      spotId: updatedSpot._id,
      spotNumber: updatedSpot.spotNumber,
      status: updatedSpot.status
    });

    res.status(200).json({
      message: 'Spot booked successfully',
      booking: newBooking
    });
  } catch (error) {
    console.error('Book Spot Error:', error);
    res.status(500).json({ error: 'Internal server error during booking' });
  }
};

// Scan QR Code (Guard only)
exports.scanQrCode = async (req, res) => {
  try {
    const { qrCodeToken } = req.body;

    if (!qrCodeToken) return res.status(400).json({ error: 'QR Code token is required' });

    const booking = await Booking.findOne({ qrCodeToken, status: 'Booked' }).populate('spot');
    
    if (!booking) {
      return res.status(404).json({ error: 'Invalid or already processed QR Code' });
    }

    const spot = booking.spot;

    // Update booking and spot status
    booking.status = 'Checked-In';
    spot.status = 'Occupied';

    await booking.save();
    await spot.save();

    // Broadcast the update
    req.io.emit('spotUpdated', {
      spotId: spot._id,
      spotNumber: spot.spotNumber,
      status: spot.status
    });

    res.status(200).json({
      message: 'Check-in successful',
      spotNumber: spot.spotNumber
    });
  } catch (error) {
    console.error('Scan QR Error:', error);
    res.status(500).json({ error: 'Internal server error during QR scan' });
  }
};

// Get Admin Stats (Admin only)
exports.getAdminStats = async (req, res) => {
  try {
    const totalSpots = await Spot.countDocuments();
    const availableSpots = await Spot.countDocuments({ status: 'Available' });
    const bookedSpots = await Spot.countDocuments({ status: 'Booked' });
    const occupiedSpots = await Spot.countDocuments({ status: 'Occupied' });
    
    // Revenue mock: Assume $10 per completed/checked-in booking for simplicity
    const checkInCount = await Booking.countDocuments({ status: { $in: ['Checked-In', 'Completed'] } });
    const totalRevenue = checkInCount * 10;

    res.status(200).json({
      totalSpots,
      availableSpots,
      bookedSpots,
      occupiedSpots,
      totalRevenue
    });
  } catch (error) {
    console.error('Admin Stats Error:', error);
    res.status(500).json({ error: 'Internal server error fetching stats' });
  }
};
