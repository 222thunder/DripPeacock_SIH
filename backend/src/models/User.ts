import mongoose, { Document, Schema } from 'mongoose';

export enum UserRole {
  ADMIN = 'ADMIN',
  INSPECTOR = 'INSPECTOR',
  SUPERVISOR = 'SUPERVISOR',
}

export interface IUser extends Document {
  email: string;
  password?: string;
  role: UserRole;
  name?: string;
}

const UserSchema: Schema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.INSPECTOR,
      required: true,
    },
    name: { type: String },
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
