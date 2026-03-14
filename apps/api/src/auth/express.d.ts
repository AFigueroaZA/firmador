import type { RequestUser } from './interfaces/request-user.interface';

declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }
}

export {};
