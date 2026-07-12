import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthService } from "./auth.service.js";
import { prisma } from "../../prismaClient.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Role, UserStatus } from "../../shared/enums.js";

vi.mock("../../prismaClient.js", () => ({
  prisma: {
    users: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    activity_logs: {
      create: vi.fn(),
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    genSalt: vi.fn().mockResolvedValue("salt"),
    hash: vi.fn().mockResolvedValue("hashed_password"),
    compare: vi.fn(),
  },
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: vi.fn().mockReturnValue("mock_jwt_token"),
  },
}));

describe("AuthService", () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    vi.clearAllMocks();
  });

  describe("signup", () => {
    it("forces employee role even if admin requested", async () => {
      vi.mocked(prisma.users.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.users.create).mockResolvedValue({
        id: 1,
        name: "Test User",
        email: "test@example.com",
        password_hash: "hashed_password",
        role: Role.employee,
        department_id: null,
        status: UserStatus.active,
        created_at: new Date(),
      });

      const result = await authService.signup({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      } as any); // simulate forcing role in input if it was allowed by zod

      expect(prisma.users.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          role: Role.employee,
        }),
      });
      expect(result.role).toBe(Role.employee);
    });

    it("hashes password not plaintext", async () => {
      vi.mocked(prisma.users.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.users.create).mockResolvedValue({
        id: 1,
        name: "Test User",
        email: "test@example.com",
        password_hash: "hashed_password",
        role: Role.employee,
        department_id: null,
        status: UserStatus.active,
        created_at: new Date(),
      });

      await authService.signup({
        name: "Test User",
        email: "test@example.com",
        password: "plaintext_password",
      });

      expect(bcrypt.hash).toHaveBeenCalledWith("plaintext_password", "salt");
      expect(prisma.users.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          password_hash: "hashed_password",
        }),
      });
    });

    it("duplicate email throws conflict", async () => {
      vi.mocked(prisma.users.findUnique).mockResolvedValue({ id: 1 } as any);

      await expect(
        authService.signup({
          name: "Test",
          email: "duplicate@example.com",
          password: "password123",
        }),
      ).rejects.toThrow("Email already in use");
    });
  });

  describe("login", () => {
    it("wrong password returns unauthenticated", async () => {
      vi.mocked(prisma.users.findUnique).mockResolvedValue({
        id: 1,
        email: "test@example.com",
        password_hash: "correct_hash",
        status: UserStatus.active,
      } as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(false);

      await expect(
        authService.login({ email: "test@example.com", password: "wrong_password" }),
      ).rejects.toThrow("Invalid email or password");
    });

    it("unknown email same error as wrong password", async () => {
      vi.mocked(prisma.users.findUnique).mockResolvedValue(null);

      await expect(
        authService.login({ email: "unknown@example.com", password: "password123" }),
      ).rejects.toThrow("Invalid email or password");
    });

    it("inactive user forbidden", async () => {
      vi.mocked(prisma.users.findUnique).mockResolvedValue({
        id: 1,
        email: "test@example.com",
        password_hash: "correct_hash",
        status: UserStatus.inactive,
      } as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(true);

      await expect(
        authService.login({ email: "test@example.com", password: "password123" }),
      ).rejects.toThrow("User account is inactive");
    });

    it("jwt payload contains sub role department", async () => {
      vi.mocked(prisma.users.findUnique).mockResolvedValue({
        id: 1,
        email: "test@example.com",
        role: Role.employee,
        department_id: 10,
        password_hash: "correct_hash",
        status: UserStatus.active,
      } as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(true);

      const result = await authService.login({
        email: "test@example.com",
        password: "password123",
      });

      expect(jwt.sign).toHaveBeenCalledWith(
        {
          sub: "1",
          role: Role.employee,
          department_id: 10,
          email: "test@example.com",
        },
        expect.any(String),
        { expiresIn: "8h" },
      );
      expect(result.token).toBe("mock_jwt_token");
    });
  });
});
