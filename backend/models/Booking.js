const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  spot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Spot',
    required: true,
  },
  status: {
    type: String,
    enum: ['Booked', 'Checked-In', 'Completed', 'Cancelled'],
    default: 'Booked',
  },
  qrCodeToken: {
    type: String,
    unique: true,
    sparse: true,
  },
  startTime: {
    type: Date,
    default: Date.now,
  },
  endTime: {
    type: Date,
  }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
