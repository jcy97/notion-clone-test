import { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";

export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      message: "입력값이 올바르지 않습니다.",
      errors: errors.array(),
    });
    return;
  }
  next();
};

export const validateRegister = [
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 6 }),
  body("name").trim().isLength({ min: 1 }),
];

export const validateLogin = [
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 1 }),
];

export const validatePage = [
  body("title").optional().trim().isLength({ min: 1 }),
  body("isPublic").optional().isBoolean(),
];

export const validateBlock = [
  body("type").isIn(["text", "heading", "image", "table"]),
  body("content").optional().isString(),
  body("position").isNumeric(),
];
