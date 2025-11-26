import { Response } from 'express';
import { AdminRequest } from '../middleware/adminAuth';
import { Admin } from '../models/Admin';
import { z } from 'zod';

const GetUsersSchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val) : 50)),
  role: z.enum(['student', 'parent', 'admin']).optional(),
});

export const getDashboardMetrics = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const metrics = await Admin.getDashboardMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Get dashboard metrics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllUsers = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { page, limit, role } = GetUsersSchema.parse(req.query);

    const result = await Admin.getAllUsers(page, limit, role);

    res.json({
      users: result.users,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
      return;
    }
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserDetails = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const userDetails = await Admin.getUserDetails(userId);

    if (!userDetails) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(userDetails);
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateUserStatus = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { emailVerified } = req.body;

    if (typeof emailVerified !== 'boolean') {
      res.status(400).json({ error: 'emailVerified must be a boolean' });
      return;
    }

    await Admin.updateUserStatus(userId, emailVerified);

    res.json({ message: 'User status updated successfully' });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteUser = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    // Prevent admins from deleting themselves
    if (userId === req.admin?.id) {
      res.status(400).json({ error: 'Cannot delete your own account' });
      return;
    }

    await Admin.deleteUser(userId);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
