import sequelize from '../sequelize.js'
import database from 'sequelize'

const { DataTypes } = database

/*
 * Описание моделей
 */

// модель «Пользователь», таблица БД  с САЙТА
const User = sequelize.define('user', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    email: {type: DataTypes.STRING, unique: true},
    role: {type: DataTypes.STRING, defaultValue: 'USER'},
})

// Модель связующая информацию с сайта и чат-бота
const User_bot = sequelize.define('user_bot', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    message: {type: DataTypes.STRING},
})

// Модель для общения с ботом хранит айди чата 
const Bot = sequelize.define('bot', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    chat_id: {type: DataTypes.INTEGER, primaryKey: true},
})

/*
 * Описание связей
 */
// Юзер имеет множество побочных продуктов(сообщений), а все сообщения принадлежат одному юзеру. 
// То же самое с Bot он создан для получения chat_id
User.hasMany(User_bot)
User_bot.belongsTo(User)

Bot.hasMany(User_bot)
User_bot.belongsTo(Bot)
// Описание связей соединило уникальные ключи между таблицами установило первичные и вторичные ключи




export {
    User,
    User_bot,
    Bot,
}