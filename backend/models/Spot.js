const mongoose = require('mongoose');

const spotSchema = new mongoose.Schema({
  spotNumber: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ['Available', 'Booked', 'Occupied'],
    default: 'Available',
  },
  // To handle race conditions, we can utilize Mongoose's optimistic concurrency
  // control. We add an activeBooking field to track who has it, helping prevent
  // double bookings.
  currentBookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null,
  }
}, { 
  timestamps: true,
  optimisticConcurrency: true // Enables Mongoose optimistic concurrency control on the version key (__v)
});

module.exports = mongoose.model('Spot', spotSchema);
