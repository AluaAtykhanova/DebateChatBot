import {Sequelize} from 'sequelize'
const sequelize = new Sequelize("postgres://postgres:postgres@postgres:5432/debate_chat_bot");

export default new Sequelize(
    process.env.DB_NAME, // база данных
    process.env.DB_USER, // пользователь
    process.env.DB_PASS, // пароль
    {
        dialect: 'postgres',
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
    }
)