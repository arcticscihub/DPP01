import { ObjectId } from 'bson';
import { InferSchemaType, Schema, model } from 'mongoose';

interface IOperation {
  _id?: ObjectId;
  name: string;
  type: string;
  categories: string[];
  locationId?: ObjectId;
  companyId: ObjectId;
}

const operationSchema = new Schema<IOperation>(
  {
    name: { type: String, required: true },
    type: { type: String, required: true },
    categories: [{ type: String, required: true }],
    locationId: { type: Schema.Types.ObjectId, required: false },
    companyId: { type: Schema.Types.ObjectId, required: true }
  },
  { timestamps: true }
);

export const Operation = model<IOperation>('Operation', operationSchema);
export type Operation = InferSchemaType<typeof operationSchema>;
