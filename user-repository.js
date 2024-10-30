import bcrpyt from "bcrypt";
import { CONNECTION, SALT_ROUNDS } from "./config.js";

export class UserRepository {
  static async create({ dni, nickname, password, name, surname, birthdate }) {
    Validation.dni(dni);
    Validation.nickname(nickname);
    Validation.password(password);
    Validation.name(name);
    Validation.surname(surname);
    Validation.birthdate(birthdate);

    const [existingUser] = await CONNECTION.promise().query(
      "SELECT * FROM user WHERE nickname = ?",
      [nickname]
    );
    if (existingUser.length > 0) throw new Error("nickname already exists");

    const hashedPassword = await bcrpyt.hash(password, SALT_ROUNDS);

    const [result] = await CONNECTION.promise().query(
      "INSERT INTO user (dni, nickname, password, name, surname, birthdate) VALUES (?, ?, ?, ?, ?, ?)",
      [dni, nickname, hashedPassword, name, surname, birthdate]
    );
  }

  static async login({ nickname, password }) {
    Validation.nickname(nickname);
    Validation.password(password);

    const [existingUser] = await CONNECTION.promise().query(
      "SELECT * FROM user WHERE nickname = ?",
      [nickname]
    );
    if (existingUser.length === 0) throw new Error("nickname already exists");

    const isValid = await bcrpyt.compare(password, existingUser[0].password);
    if (!isValid) throw new Error("password doesn't match");

    return existingUser[0];
  }
}

class Validation {
  // TODO: validaciones completas de los campos
  static dni(dni) {
    if (!/^\d{8}[A-Z]$/.test(dni) || dni.length !== 9) {
      throw new Error("dni must contain exactly 8 digits followed by a letter");
    }
  }
  static nickname(nickname) {
    if (typeof nickname !== "string")
      throw new Error("nickname must be a string");
    if (nickname.length < 3) throw new Error("nickname min 3 length");
  }
  static password(password) {
    if (typeof password !== "string")
      throw new Error("password must be a string");
    if (password.length < 8) throw new Error("password min 8 length");
  }
  static name(name) {
    if (typeof name !== "string") throw new Error("name must be a string");
    if (name.length < 3) throw new Error("name min 3 length");
  }
  static surname(surname) {
    if (typeof surname !== "string")
      throw new Error("surname must be a string");
    if (surname.length < 3) throw new Error("surname min 3 length");
  }
  static birthdate(birthdate) {
    if (typeof birthdate !== "string")
      throw new Error("birthdate must be a string");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthdate))
      throw new Error("birthdate must be in format YYYY-MM-DD");
  }
}
