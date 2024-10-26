import DBLocal from 'db-local'
import bcrpyt from 'bcrypt'
import { SALT_ROUNDS } from './config.js'

const { Schema } = new DBLocal({ path: './db' })

const User = Schema('User', {
  _id: { type: String, required: true },
  username: { type: String, required: true },
  password: { type: String, required: true }
})

export class UserRepository {
  static async create ({ username, password }) {
    Validation.username(username)
    Validation.password(password)

    // 2. asegurarse que el username no existe
    const user = User.findOne({ username })
    if (user) throw new Error('username already exists')

    const id = crypto.randomUUID() // en caso de que si quieres hacer el id auto en codigo
    
    const hashedPassword = await bcrpyt.hash(password, SALT_ROUNDS) 

    User.create({
      _id: id,
      username,
      password: hashedPassword
    }).save()

    return id
  }

  static async login ({ username, password }) {
    Validation.username(username);
    Validation.password(password);

    const user = User.findOne({ username })
    if (!user) throw new Error("that username doesn't exists");
    
    const isValid = await bcrpyt.compare(password, user.password)
    if (!isValid) throw new Error("error password");
    
    return {
      username: user.username
    }
  }
}

class Validation {
  static username (username) {
    if (typeof username !== 'string') throw new Error('username must be a string')
    if (username.length < 3) throw new Error('username min 3 length')
  }
  static password (password) {
    if (typeof password !== 'string') throw new Error('password must be a string')
    if (password.length < 6) throw new Error('password min 6 length')
  }
}