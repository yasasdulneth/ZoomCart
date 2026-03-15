import type { Request, Response } from 'express';
import { NotificationModel, type NotificationTargetAudience, type NotificationType } from '../models/notification.model';

export async function listAdminNotifications(req: Request, res: Response) {
  if (!req.admin) return res.status(401).json({ message: 'Unauthorized' });

  const adminId = req.admin._id;
  const notifications = await NotificationModel.find({
    isActive: true,
    $or: [
      { targetAudience: 'BROADCAST' },
      { targetAudience: 'ALL_ADMINS' },
      { targetAudience: 'STAFF' },
      { targetAdminId: adminId },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(200);

  return res.json({ notifications });
}

export async function createNotification(req: Request, res: Response) {
  if (!req.admin) return res.status(401).json({ message: 'Unauthorized' });

  const { title, message, type, targetAudience, targetUserId, targetAdminId } = req.body ?? {};
  if (!title || !message) return res.status(400).json({ message: 'Title and message are required' });

  const t = String(type ?? 'SYSTEM').trim() as NotificationType;
  const aud = String(targetAudience ?? 'ALL_ADMINS').trim() as NotificationTargetAudience;
  const allowedTypes: NotificationType[] = ['SYSTEM', 'PAYMENT', 'LOW_STOCK', 'PRODUCT', 'EMPLOYEE'];
  const allowedAud: NotificationTargetAudience[] = ['STAFF', 'APP_USER', 'ALL_ADMINS', 'ALL_USERS', 'BROADCAST'];
  if (!allowedTypes.includes(t)) return res.status(400).json({ message: 'Invalid type' });
  if (!allowedAud.includes(aud)) return res.status(400).json({ message: 'Invalid targetAudience' });

  const notification = await NotificationModel.create({
    title: String(title).trim(),
    message: String(message).trim(),
    type: t,
    targetAudience: aud,
    targetUserId: targetUserId ?? undefined,
    targetAdminId: targetAdminId ?? undefined,
    sentByAdminId: req.admin._id,
    isRead: false,
    isActive: true,
  });

  return res.status(201).json({ notification });
}

export async function markNotificationRead(req: Request, res: Response) {
  if (!req.admin) return res.status(401).json({ message: 'Unauthorized' });
  const notification = await NotificationModel.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
  if (!notification) return res.status(404).json({ message: 'Notification not found' });
  return res.json({ notification });
}

export async function deleteNotification(req: Request, res: Response) {
  if (!req.admin) return res.status(401).json({ message: 'Unauthorized' });
  const notification = await NotificationModel.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!notification) return res.status(404).json({ message: 'Notification not found' });
  return res.json({ message: 'Notification deleted (soft)', notification });
}

