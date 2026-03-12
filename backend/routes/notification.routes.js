// backend/routes/notification.routes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
  getNotificationSettings,
  updateNotificationSettings,
} = require('../controllers/notification.controller');

router.use(authenticate);

router.get('/',                   getNotifications);
router.get('/unread-count',       getUnreadCount);
router.put('/read-all',           markAllAsRead);
router.patch('/read-all',         markAllAsRead);
router.put('/:id/read',           markAsRead);
router.patch('/:id/read',         markAsRead);
router.delete('/read/clear',      deleteAllRead);
router.delete('/:id',             deleteNotification);
router.get('/settings',           getNotificationSettings);
router.put('/settings',           updateNotificationSettings);

module.exports = router;
