import { Router } from 'express';
import { ParentController } from '../controllers/parentController';
import { UserController } from '../controllers/userController';
import { authenticate } from '../middleware/authenticate';
import { authorizeParent } from '../middleware/authorize';

const router = Router();
const parentController = new ParentController();
const userController = new UserController();

// All routes require authentication and parent role
router.use(authenticate);
router.use(authorizeParent);

// Children management
router.get('/children', (req, res) => userController.getChildren(req, res));

// Notification preferences
router.get('/notification-preferences', (req, res) => 
  parentController.getNotificationPreferences(req, res)
);
router.put('/notification-preferences', (req, res) => 
  parentController.updateNotificationPreferences(req, res)
);

// Parental controls
router.get('/children/:childId/controls', (req, res) => 
  parentController.getParentalControls(req, res)
);
router.put('/children/:childId/controls', (req, res) => 
  parentController.updateParentalControls(req, res)
);

// Activity monitoring
router.get('/children/:childId/activity-log', (req, res) => 
  parentController.getChildActivityLog(req, res)
);
router.get('/children/:childId/learning-time', (req, res) => 
  parentController.getLearningTimeMonitoring(req, res)
);

export default router;
