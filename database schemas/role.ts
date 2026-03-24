import { ObjectId } from 'bson';
import { Document, InferSchemaType, Schema, model } from 'mongoose';

interface IRole extends Document {
  _id: ObjectId;
  label: string;
  value: number;
}

const RoleSchema = new Schema<IRole>({
  label: { type: String, required: true },
  value: { type: Number, required: true }
});

export const Role = model<IRole>('Role', RoleSchema);
export type Role = InferSchemaType<typeof RoleSchema>;
