import db from "./";
import { DataTypes, Model } from "sequelize";

interface UserAttributes {
    id: number;
    name: string;
    fullname: string;
    password_hash: string;
    created: Date;
    email: string;
    verified: boolean;
    status: string;
    type: 'user' | 'admin';
}

class User extends Model<UserAttributes> implements UserAttributes {
    public id!: number;
    public name!: string;
    public fullname!: string;
    public password_hash!: string;
    public created!: Date;
    public email!: string;
    public verified!: boolean;
    public status!: string;
    public type!: 'user' | 'admin';
}

User.init({
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true
    }, 
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    fullname: {
        type: DataTypes.STRING,
        allowNull: false
    },
    password_hash: {
        type: DataTypes.STRING,
        allowNull: false
    },
    created: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false
    },
    verified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'offline'
    },
    type: {
        type: DataTypes.STRING,
        defaultValue: 'user',
        allowNull: false
    }
}, {
    sequelize: db,
    modelName: 'users',
    timestamps: false
})

export default User