import { ObjectId } from 'bson';
import { InferSchemaType, Schema, model } from 'mongoose';

interface IAsset {
  _id?: ObjectId;
  name: string;
  type: string;
  energySource: string;
  fuelTypes: string[];
  locationId: ObjectId;
  companyId: ObjectId;
}

const assetSchema = new Schema<IAsset>(
  {
    name: { type: String, required: true },
    type: { type: String, required: true },
    energySource: { type: String, required: true },
    fuelTypes: [{ type: String, required: true }],
    locationId: { type: Schema.Types.ObjectId, required: true },
    companyId: { type: Schema.Types.ObjectId, required: true }
  },
  { timestamps: true }
);

export const Asset = model<IAsset>('Asset', assetSchema);
export type Asset = InferSchemaType<typeof assetSchema>;
