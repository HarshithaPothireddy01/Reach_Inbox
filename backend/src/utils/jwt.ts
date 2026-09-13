import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.js";

export function createToken(user: {
  id: string;
  email: string;
}) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
}