import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.middleware';
import { usersModel } from '../models/users.model';
import { AuthError, authService } from '../services/auth.service';
import { presence } from '../services/presence.service';
import { toPublicUser } from '../types';

export const authRoutes = Router();

const signupSchema = z.object({
  username: z.string().min(3).max(20),
  nickname: z.string().min(1).max(40).optional(),
  password: z.string().min(6).max(100),
});

authRoutes.post('/signup', async (req, res, next) => {
  try {
    const { username, nickname, password } = signupSchema.parse(req.body);
    const { user, token } = await authService.signup(username, nickname ?? username, password);
    res.status(201).json({
      token,
      user: toPublicUser(user, true),
    });
  } catch (err) {
    next(err);
  }
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

authRoutes.post('/login', async (req, res, next) => {
  try {
    const { username, password } = loginSchema.parse(req.body);
    const { user, token } = await authService.login(username, password);
    res.json({ token, user: toPublicUser(user, presence.isOnline(user.id)) });
  } catch (err) {
    next(err);
  }
});

authRoutes.get('/me', requireAuth, (req, res) => {
  const user = usersModel.byId(req.userId!);
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }
  res.json({ user: toPublicUser(user, presence.isOnline(user.id)) });
});

const updateMeSchema = z.object({
  nickname: z.string().min(1).max(40).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

authRoutes.patch('/me', requireAuth, (req, res, next) => {
  try {
    const fields = updateMeSchema.parse(req.body);
    usersModel.updateProfile(req.userId!, fields);
    const user = usersModel.byId(req.userId!)!;
    res.json({ user: toPublicUser(user, presence.isOnline(user.id)) });
  } catch (err) {
    next(err);
  }
});

const changePwSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).max(100),
});

authRoutes.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = changePwSchema.parse(req.body);
    await authService.changePassword(req.userId!, currentPassword, newPassword);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
