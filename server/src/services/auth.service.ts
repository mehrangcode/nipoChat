import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { usersModel } from '../models/users.model';
import { UserRow } from '../types';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export class AuthError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

export interface JwtPayload {
  uid: number;
  username: string;
}

function sign(user: UserRow): string {
  const payload: JwtPayload = { uid: user.id, username: user.username };
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as any });
}

export const authService = {
  /**
   * Register a new user with a password they chose in the signup form.
   */
  async signup(usernameRaw: string, nicknameRaw: string, password: string) {
    const username = usernameRaw.trim().toLowerCase();
    const nickname = nicknameRaw.trim() || username;

    if (!USERNAME_RE.test(username)) {
      throw new AuthError(
        400,
        'Username must be 3-20 chars: lowercase letters, digits, or underscore.'
      );
    }
    if (password.length < 6) {
      throw new AuthError(400, 'Password must be at least 6 characters.');
    }
    if (usersModel.byUsername(username)) {
      throw new AuthError(409, 'This username is already taken.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = usersModel.create({ username, nickname, passwordHash });

    return { user, token: sign(user) };
  },

  async login(usernameRaw: string, password: string) {
    const username = usernameRaw.trim().toLowerCase();
    const user = usersModel.byUsername(username);
    if (!user) throw new AuthError(401, 'Invalid username or password.');

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw new AuthError(401, 'Invalid username or password.');

    return { user, token: sign(user) };
  },

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = usersModel.byId(userId);
    if (!user) throw new AuthError(404, 'User not found.');
    const ok = await bcrypt.compare(currentPassword, user.password_hash);
    if (!ok) throw new AuthError(401, 'Current password is incorrect.');
    if (newPassword.length < 6) {
      throw new AuthError(400, 'New password must be at least 6 characters.');
    }
    const hash = await bcrypt.hash(newPassword, 10);
    usersModel.updatePassword(userId, hash);
  },

  verify(token: string): JwtPayload {
    return jwt.verify(token, env.jwtSecret) as JwtPayload;
  },
};
