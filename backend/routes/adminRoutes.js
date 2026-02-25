import express from 'express';
import { 
  adminLogin, 
  getDashboardStats, 
  getSuccessUsers, 
  getFailureUsers,
  deleteUserRecord,
  getSingleImage // ✅ New function for optimized image loading
} from '../controllers/adminController.js';

const router = express.Router();

// Login Route
router.post('/login', adminLogin);

// Dashboard Data Routes
router.get('/stats', getDashboardStats);
router.get('/success-users', getSuccessUsers);
router.get('/failure-users', getFailureUsers);

// ✅ Image Fetch Route (Single Image on Click)
// Example: /api/admin/image/success/15/generated
router.get('/image/:type/:id/:imageType', getSingleImage);

// Delete Route
router.delete('/delete/:type/:id', deleteUserRecord);

export default router;