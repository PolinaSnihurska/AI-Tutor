import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validateRequest } from '../middleware/security';
import { z } from 'zod';
import * as gdprController from '../controllers/gdprController';

/**
 * GDPR Routes
 * Implements requirement 9.2, 9.4 - GDPR compliance endpoints
 */

const router = Router();

// Validation schemas
const consentSchema = z.object({
  consentType: z.enum(['terms', 'privacy', 'marketing', 'analytics']),
  granted: z.boolean(),
});

const deletionRequestSchema = z.object({
  reason: z.string().optional(),
});

// All GDPR routes require authentication
router.use(authenticate);

// Consent management
router.post(
  '/consent',
  validateRequest(consentSchema),
  gdprController.recordConsent
);

router.get(
  '/consent/history',
  gdprController.getConsentHistory
);

router.get(
  '/consent/current',
  gdprController.getCurrentConsents
);

// Data export (Right to Data Portability)
router.post(
  '/export',
  gdprController.requestDataExport
);

router.get(
  '/export/:requestId',
  gdprController.getDataExportStatus
);

router.get(
  '/export/download',
  gdprController.downloadExportedData
);

// Data deletion (Right to be Forgotten)
router.post(
  '/delete',
  validateRequest(deletionRequestSchema),
  gdprController.requestDataDeletion
);

router.delete(
  '/delete/:requestId',
  gdprController.cancelDataDeletion
);

router.get(
  '/delete/:requestId',
  gdprController.getDataDeletionStatus
);

export default router;

