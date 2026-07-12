import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../prismaClient.js";
import { AppError } from "../../shared/errors.js";
import { UnauthorizedError, ForbiddenError } from "../../shared/auth.js";
import { Role, UserStatus, ACT } from "../../shared/enums.js";
import { logActivity } from "../../shared/activity.js";
import { z } from "zod";
import { signupSchema, loginSchema } from "./auth.schema.js";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-prod";
const JWT_EXPIRES_IN = "8h";

export class AuthService {
  async signup(data: z.infer<typeof signupSchema>) {
    // Check if email already exists
    const existingUser = await prisma.users.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new AppError("CONFLICT", 409, "Email already in use");
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(data.password, salt);

    // Create user with forced 'employee' role
    const newUser = await prisma.users.create({
      data: {
        name: data.name,
        email: data.email,
        password_hash,
        role: Role.employee, // Force employee role
        department_id: data.department_id || null,
        status: UserStatus.active,
      },
    });

    // Log activity
    await logActivity(newUser.id, ACT.SIGNUP, "user", newUser.id);

    return {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      department_id: newUser.department_id,
      status: newUser.status,
      created_at: newUser.created_at,
    };
  }

  async login(data: z.infer<typeof loginSchema>) {
    const user = await prisma.users.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const isValidPassword = await bcrypt.compare(data.password, user.password_hash);
    if (!isValidPassword) {
      throw new UnauthorizedError("Invalid email or password");
    }

    if (user.status === UserStatus.inactive) {
      throw new ForbiddenError("User account is inactive");
    }

    const payload = {
      sub: user.id.toString(),
      role: user.role,
      department_id: user.department_id,
      email: user.email,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // Log activity
    await logActivity(user.id, ACT.LOGIN, "user", user.id);

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department_id: user.department_id,
        status: user.status,
      },
    };
  }

  async getMe(userId: number) {
    const user = await prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedError("User not found");
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department_id: user.department_id,
      status: user.status,
      created_at: user.created_at,
    };
  }
}
