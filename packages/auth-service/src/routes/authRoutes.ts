import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticate } from '../middleware/authenticate';
import { validateRequest } from '../middleware/security';
import {
  RegisterSchema,
  LoginSchema,
  RefreshTokenSchema,
  VerifyEmailSchema,
  RequestPasswordResetSchema,
  ResetPasswordSchema,
  ChangePasswordSchema,
  LogoutSchema,
} from '../validation/authSchemas';

const router = Router();
const authController = new AuthController();

// Public routes with validation
router.post('/register', validateRequest(RegisterSchema), (req, res) => authController.register(req, res));
router.post('/login', validateRequest(LoginSchema), (req, res) => authController.login(req, res));
router.post('/refresh-token', validateRequest(RefreshTokenSchema), (req, res) => authController.refreshToken(req, res));
router.post('/verify-email', validateRequest(VerifyEmailSchema), (req, res) => authController.verifyEmail(req, res));
router.post('/request-password-reset', validateRequest(RequestPasswordResetSchema), (req, res) => authController.requestPasswordReset(req, res));
router.post('/reset-password', validateRequest(ResetPasswordSchema), (req, res) => authController.resetPassword(req, res));

// Protected routes with validation
router.post('/change-password', authenticate, validateRequest(ChangePasswordSchema), (req, res) => authController.changePassword(req, res));
router.post('/logout', authenticate, validateRequest(LogoutSchema), (req, res) => authController.logout(req, res));

export default router;
