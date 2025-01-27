import mysql from 'mysql2';

export const {
  PORT = 3000,
  SALT_ROUNDS = 10, // para el hash
  SECRET_JWT_KEY = 'this_is_an_large_and_secure_key_esto_es_una_llave_segura_y_larga',
  CONNECTION = mysql.createConnection({
    host: 'localhost',
    database: 'projecte_m12',
    user: 'root',
    password: ''
  }),
  DEEPSEEK_API_KEY = 'sk-b84b975ce725437d89337a529741c040', // Añadir la API key de DeepSeek
  DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/v1/poker/decisions' // Endpoint de DeepSeek
} = process.env;