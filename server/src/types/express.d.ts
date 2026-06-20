// Augment Express Request so TypeScript knows about auth properties set by middleware
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: string;
    }
  }
}

export {};
