import express from 'express';
import { generateDoctorImage, getUploadStats } from '../controllers/imageController.js';

const router = express.Router();

// Main Generation Route
// Frontend is endpoint par hit karega: /api/images/generate
router.post('/generate', generateDoctorImage);

// Public Stats (Optional, agar future me landing page par dikhana ho)
router.get('/stats', getUploadStats);

export default router;