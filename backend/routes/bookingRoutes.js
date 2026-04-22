const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// Get all spots (Requires login, any role)
router.get('/spots', verifyToken, bookingController.getSpots);

// Get current user's active booking
router.get('/my-booking', verifyToken, bookingController.getMyBooking);

// Get user booking history
router.get('/history', verifyToken, bookingController.getUserHistory);

// Book a spot (Requires login, Customer only)
router.post('/book', verifyToken, requireRole('customer'), bookingController.bookSpot);

// Cancel a booking (Requires login, Customer only)
router.post('/cancel', verifyToken, requireRole('customer'), bookingController.cancelBooking);

// Force Action (Requires login, Guard only)
router.post('/force', verifyToken, requireRole('guard'), bookingController.forceAction);

// Unified Validation (Requires login, Guard only) - Handles Entry & Exit
router.post('/validate-token', verifyToken, requireRole('guard'), bookingController.validateToken);

// Get Admin Stats (Requires login, Admin only)
router.get('/stats', verifyToken, requireRole('admin'), bookingController.getAdminStats);

module.exports = router;
