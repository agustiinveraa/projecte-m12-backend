import mysql from "mysql2";

export const {
  PORT = 3000,
  SALT_ROUNDS = 10, // para el hashç
  SECRET_JWT_KEY = "this_is_an_large_and_secure_key_esto_es_una_llave_segura_y_larga",
  CONNECTION = mysql.createConnection({
    host: "localhost",
    database: "projecte_m12",
    user: "root",
    password: "",
  }),
} = process.env;
