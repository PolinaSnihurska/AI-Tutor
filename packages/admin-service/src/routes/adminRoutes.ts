import { Router } from 'express';
import { adminLogin, getAdminProfile } from '../controllers/adminAuthController';
import {
  getDashboardMetrics,
  getAllUsers,
  getUserDetails,
  updateUserStatus,
  deleteUser,
} from '../controllers/dashboardController';
import { authenticateAdmin } from '../middleware/adminAuth';

const router = Router();

// Auth routes (no authentication required)
router.post('/auth/login', adminLogin);

// Protected routes (authentication required)
router.get('/auth/profile', authenticateAdmin, getAdminProfile);
router.get('/dashboard/metrics', authenticateAdmin, getDashboardMetrics);
router.get('/users', authenticateAdmin, getAllUsers);
router.get('/users/:userId', authenticateAdmin, getUserDetails);
router.patch('/users/:userId/status', authenticateAdmin, updateUserStatus);
router.delete('/users/:userId', authenticateAdmin, deleteUser);

export default router;
