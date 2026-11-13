import { randomInt } from "node:crypto";
import { HttpError, UNIQUE_VIOLATION } from "./errors";
import { hashPassword } from "./auth";
import { User } from "./models";

// No 0/O/1/I so codes are easy to read out loud.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export async function newInviteCode() {
  for (let i = 0; i < 8; i++) {
    const code = Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
    if (!(await User.findByInviteCode(code))) return code;
  }
  throw new Error("Could not generate an invite code.");
}

export async function createAccount({ name, email, password, role, timezone }) {
  try {
    return await User.create({
      name,
      email,
      password_hash: await hashPassword(password),
      role,
      timezone,
      invite_code: role === "patient" ? await newInviteCode() : null,
    });
  } catch (err) {
    if (err.code === UNIQUE_VIOLATION) throw new HttpError(409, "That email is already registered.");
    throw err;
  }
}
