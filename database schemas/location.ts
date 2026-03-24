import { ObjectId } from 'bson';
import { Document, InferSchemaType, Schema, model } from 'mongoose';

interface ILocation {
  _id?: ObjectId;
  name: string;
  type: string;
  address: string;
  postCode: string;
  city: string;
  country: string;
  companyId: ObjectId;
}

const locationSchema = new Schema<ILocation>(
  {
    name: { type: String, required: true },
    type: { type: String, required: true },
    address: { type: String, required: true },
    postCode: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
    companyId: { type: Schema.Types.ObjectId, required: true }
  },
  { timestamps: true }
);

export const Location = model<ILocation>('Location', locationSchema);
export type Location = InferSchemaType<typeof locationSchema>;
