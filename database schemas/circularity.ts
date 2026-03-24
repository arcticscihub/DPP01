import { ObjectId } from 'bson';
import { Document, InferSchemaType, Schema, model } from 'mongoose';

interface ICircularity extends Document {
  _id: ObjectId;
  label: string;
  value: string;
  priority: number;
}

const circularitySchema = new Schema<ICircularity>({
  label: { type: String, required: true },
  value: { type: String, required: true },
  priority: { type: Number, required: true }
});

export const Circularity = model<ICircularity>('Circularity', circularitySchema);
export type Circularity = InferSchemaType<typeof circularitySchema>;
