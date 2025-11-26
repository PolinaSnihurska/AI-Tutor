import { Request, Response } from 'express';
import { GDPRService } from '../services/gdprService';

/**
 * GDPR Controller
 * Handles GDPR compliance endpoints
 * Implements requirement 9.2, 9.4
 */

/**
 * Record user consent
 */
export async function recordConsent(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const { consentType, granted } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }
    
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string;
    const userAgent = req.headers['user-agent'];
    
    await GDPRService.recordConsent(
      userId,
      consentType,
      granted,
      ipAddress,
      userAgent
    );
    
    res.json({
      success: true,
      message: 'Consent recorded successfully',
    });
  } catch (error) {
    console.error('Record consent error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record consent',
    });
  }
}

/**
 * Get user consent history
 */
export async function getConsentHistory(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }
    
    const history = await GDPRService.getConsentHistory(userId);
    
    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error('Get consent history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve consent history',
    });
  }
}

/**
 * Get current consent status
 */
export async function getCurrentConsents(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }
    
    const consents = await GDPRService.getCurrentConsents(userId);
    
    res.json({
      success: true,
      data: consents,
    });
  } catch (error) {
    console.error('Get current consents error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve consents',
    });
  }
}

/**
 * Request data export
 */
export async function requestDataExport(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }
    
    const requestId = await GDPRService.requestDataExport(userId);
    
    res.json({
      success: true,
      message: 'Data export request submitted successfully',
      data: {
        requestId,
        estimatedTime: '24-48 hours',
      },
    });
  } catch (error) {
    console.error('Request data export error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit data export request',
    });
  }
}

/**
 * Get data export status
 */
export async function getDataExportStatus(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const { requestId } = req.params;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }
    
    const status = await GDPRService.getDataExportStatus(requestId);
    
    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Export request not found',
      });
    }
    
    // Verify the request belongs to the user
    if (status.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }
    
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Get data export status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve export status',
    });
  }
}

/**
 * Download exported data
 */
export async function downloadExportedData(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }
    
    // Generate the export on-demand
    const data = await GDPRService.processDataExport(userId);
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="user_data_${userId}_${Date.now()}.json"`);
    
    res.json(data);
  } catch (error) {
    console.error('Download exported data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download data',
    });
  }
}

/**
 * Request data deletion
 */
export async function requestDataDeletion(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const { reason } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }
    
    const requestId = await GDPRService.requestDataDeletion(userId, reason);
    
    res.json({
      success: true,
      message: 'Data deletion request submitted successfully',
      data: {
        requestId,
        gracePeriod: '30 days',
        scheduledFor: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });
  } catch (error) {
    console.error('Request data deletion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit data deletion request',
    });
  }
}

/**
 * Cancel data deletion request
 */
export async function cancelDataDeletion(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const { requestId } = req.params;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }
    
    // Verify the request belongs to the user
    const status = await GDPRService.getDataDeletionStatus(requestId);
    
    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Deletion request not found',
      });
    }
    
    if (status.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }
    
    const cancelled = await GDPRService.cancelDataDeletion(requestId);
    
    if (!cancelled) {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel deletion request (may already be processed)',
      });
    }
    
    res.json({
      success: true,
      message: 'Data deletion request cancelled successfully',
    });
  } catch (error) {
    console.error('Cancel data deletion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel deletion request',
    });
  }
}

/**
 * Get data deletion status
 */
export async function getDataDeletionStatus(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const { requestId } = req.params;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }
    
    const status = await GDPRService.getDataDeletionStatus(requestId);
    
    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Deletion request not found',
      });
    }
    
    // Verify the request belongs to the user
    if (status.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }
    
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Get data deletion status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve deletion status',
    });
  }
}

