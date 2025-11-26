import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticate } from '../middleware/authenticate';
import { authorizeParent } from '../middleware/authorize';

const router = Router();
const userController = new UserController();

// All routes require authentication
router.use(authenticate);

// User profile routes
router.get('/profile', (req, res) => userController.getProfile(req, res));
router.put('/profile', (req, res) => userController.updateProfile(req, res));

// Parent-child management routes (parent only)
router.post('/children', authorizeParent, (req, res) => userController.linkChild(req, res));
router.delete('/children/:childId', authorizeParent, (req, res) => userController.unlinkChild(req, res));
router.get('/children', authorizeParent, (req, res) => userController.getChildren(req, res));

export default router;
