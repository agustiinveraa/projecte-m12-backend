import bcrpyt from "bcrypt";
import { CONNECTION, SALT_ROUNDS } from "./config.js";

export class UserRepository {
  static async create({
    dni,
    nickname,
    email,
    password,
    name,
    surname,
    birthdate,
  }) {
    Validation.dni(dni);
    Validation.nickname(nickname);
    Validation.email(email);
    Validation.password(password);
    Validation.name(name);
    Validation.surname(surname);
    Validation.birthdate(birthdate);

    const [existingUser] = await CONNECTION.promise().query(
      "SELECT * FROM users WHERE nickname = ?",
      [nickname]
    );
    if (existingUser.length > 0) throw new Error("nickname already exists");

    const hashedPassword = await bcrpyt.hash(password, SALT_ROUNDS);

    const [result] = await CONNECTION.promise().query(
      "INSERT INTO users (dni, nickname, email, password, name, surname, birthdate) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [dni, nickname, email, hashedPassword, name, surname, birthdate]
    );
  }

  static async login({ nickname, password }) {
    Validation.nickname(nickname);
    Validation.password(password);

    const [existingUser] = await CONNECTION.promise().query(
      "SELECT * FROM users WHERE nickname = ?",
      [nickname]
    );
    if (existingUser.length === 0) throw new Error("user no exists");

    const isValid = await bcrpyt.compare(password, existingUser[0].password);
    if (!isValid) throw new Error("password doesn't match");

    return existingUser[0];
  }

  // TODO: Hacer que cuando se borre la cuenta no pete el backend
  static async delete({ nickname }) {
    console.log(nickname)
    const [result] = await CONNECTION.promise().query(
      "DELETE FROM users WHERE nickname = ?",
      [nickname]
    );

    if (result.affectedRows === 0) throw new Error("user no exists");

    return { message: "User deleted successfully" };
  }

  static async transaction({ identifier, amount }) {
    if (amount <= 0) throw new Error("Amount must be greater than zero");
  
    // Verifica si identifier es un dni o un nickname
    const condition = /^\d{8}[A-Z]$/.test(identifier) ? 'dni' : 'nickname';
  
    const [result] = await CONNECTION.promise().query(
      `UPDATE users SET balance = balance + ? WHERE ${condition} = ?`,
      [amount, identifier]
    );
  
    if (result.affectedRows === 0) {
      throw new Error("User not found or no changes made");
    }
  }

  static async getBalance(identifier) {
    // Verifica si identifier es un dni o un nickname
    const condition = /^\d{8}[A-Z]$/.test(identifier) ? 'dni' : 'nickname';
  
    const [result] = await CONNECTION.promise().query(
      `SELECT balance FROM users WHERE ${condition} = ?`,
      [identifier]
    );
  
    if (result.length === 0) {
      throw new Error("User not found");
    }
  
    return result[0].balance;
  }

  static async updateProfilePicture({ userId, profilePicturePath }) {
    console.log("hola")
    return new Promise((resolve, reject) => {
        const query = `
            UPDATE users
            SET src = ?
            WHERE id = ?;
        `;

        CONNECTION.query(query, [profilePicturePath, userId], (err, results) => {
            if (err) {
                return reject(err);
            }

            resolve({ message: "Profile picture updated successfully" });
        });
    });
  }

}

class Validation {
  static dni(dni) {
    if (!/^\d{8}[A-Z]$/.test(dni))
      throw new Error("dni must contain exactly 8 digits followed by a letter");

    const letters = "TRWAGMYFPDXBNJZSQVHLCKE";
    const number = parseInt(dni.slice(0, 8), 10);
    const letter = dni[8];
    const correctLetter = letters[number % 23];
    if (letter !== correctLetter)
      throw new Error("dni number does not match the letter");
  }
  static nickname(nickname) {

  }
  static email(email) {
    if (typeof email !== "string") throw new Error("email must be a string");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new Error("email must be in format");
  }
  static password(password) {
    if (typeof password !== "string")
      throw new Error("password must be a string");
    if (password.length < 8)
      throw new Error("password must be at least 8 characters long");
    if (password.includes(" "))
      throw new Error("password cannot contain spaces");
    if (/^[_.!@#$%^&]/.test(password))
      throw new Error("password cannot start with a special character");
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[_.!@#$%^&])/.test(password))
      throw new Error(
        "The password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
      );
  }
  static name(name) {
    if (typeof name !== "string") throw new Error("name must be a string");
    if (name.length < 3) throw new Error("name min 3 length");
    if (/(?=.*[_.!@#$%^&])/.test(name))
      throw new Error("name cannot contain special characters");
  }
  static surname(surname) {
    if (typeof surname !== "string")
      throw new Error("surname must be a string");
    if (surname.length < 3) throw new Error("surname min 3 length");
    if (/(?=.*[_.!@#$%^&])/.test(surname))
      throw new Error("surname cannot contain special characters");
  }
  static birthdate(birthdate) {
    if (typeof birthdate !== "string")
      throw new Error("birthdate must be a string");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthdate))
      throw new Error("birthdate must be in format DD-MM-YYYY");

    const [year] = birthdate.split("-").map(Number);
    var currentYear = new Date().getFullYear() - 18;
    if (year < 1900 || year > currentYear)
      throw new Error(
        "birthdate year must be between 1900 and the current year, and you have to be 18 years or older"
      );
  }
}
