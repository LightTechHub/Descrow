// backend/controllers/notification.controller.js
// ✅ Matches your existing Notification model (../models/Notification)
// ✅ Matches your existing routes: GET /, PUT /:id/read, PUT /read-all,
//    DELETE /:id, DELETE /read/clear, GET /settings, PUT /settings

const Notification = require('../models/Notification');
const User = require('../models/User.model'); // ✅ FIXED: was missing, crashed settings routes

/**
 * GET /api/notifications
 * Get user's notifications with pagination and optional unreadOnly filter
 */
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const query = { user: userId };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('metadata.escrowId', 'title status'),
      Notification.countDocuments(query),
      Notification.countDocuments({ user: userId, isRead: false })
    ]);

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch notifications' });
  }
};

/**
 * PUT /api/notifications/:id/read
 * Mark one notification as read
 */
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOne({ _id: id, user: userId });
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({ success: true, data: notification });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to mark notification as read' });
  }
};

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.updateMany(
      { user: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to mark all as read' });
  }
};

/**
 * DELETE /api/notifications/:id
 * Delete one notification
 */
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOneAndDelete({ _id: id, user: userId });
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to delete notification' });
  }
};

/**
 * DELETE /api/notifications/read/clear
 * Delete all read notifications
 */
exports.deleteAllRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await Notification.deleteMany({ user: userId, isRead: true });

    res.json({ success: true, message: `${result.deletedCount} notifications deleted` });
  } catch (error) {
    console.error('Delete all read error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to delete notifications' });
  }
};

/**
 * GET /api/notifications/settings
 * Get notification preferences
 */
exports.getNotificationSettings = async (req, res) => {
  try {
    const User = require('../models/User.model');
    const user = await User.findById(req.user.id).select('notificationSettings');

    res.json({
      success: true,
      data: user?.notificationSettings || {
        email: { escrowUpdates: true, messages: true, disputes: true, payments: true, marketing: false },
        push:  { escrowUpdates: true, messages: true, disputes: true, payments: true }
      }
    });
  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch notification settings' });
  }
};

/**
 * PUT /api/notifications/settings
 * Update notification preferences
 */
exports.updateNotificationSettings = async (req, res) => {
  try {
    const User = require('../models/User.model');
    const { email, push } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { 'notificationSettings.email': email, 'notificationSettings.push': push } },
      { new: true }
    ).select('notificationSettings');

    res.json({ success: true, message: 'Notification settings updated', data: user.notificationSettings });
  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update notification settings' });
  }
};
