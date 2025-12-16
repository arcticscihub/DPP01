import { ObjectId } from 'bson';
import { InferSchemaType, Schema, model } from 'mongoose';

import { Consumptions, ConsumptionType } from '../util/types';

interface IRelation {
  businessUnits: ObjectId[];
  assets: ObjectId[];
}

interface ITypeData {
  assetId?: ObjectId;
  transportType?: string;
  energySource?: string;
}

interface IConsumptionData {
  _id?: ObjectId;
  value?: number;
  unit?: string;
  kilometers?: number;
  type?: string;
  periodStart: Date;
  periodEnd: Date;
  numberOfPeople?: number;
  destinationFrom?: string;
  destinationTo?: string;
}

interface IConsumption {
  _id?: ObjectId;
  type: ConsumptionType;
  state: string;
  company?: ObjectId;
  relations: IRelation;
  location?: ObjectId;
  typeData?: ITypeData;
  data: IConsumptionData[];
}

const consumptionDataSchema = new Schema<IConsumptionData>(
  {
    value: { type: Number, required: false },
    unit: { type: String, required: false },
    kilometers: { type: String, required: false },
    type: { type: String, required: false },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    numberOfPeople: { type: Number, required: false },
    destinationFrom: { type: String, required: false },
    destinationTo: { type: String, required: false }
  },
  { timestamps: true }
);

const consumptionSchema = new Schema<IConsumption>(
  {
    type: { type: String, required: true, enum: Consumptions },
    state: { type: String, required: true, lowercase: true },
    company: { type: Schema.Types.ObjectId, required: false, ref: 'Company' },
    relations: {
      businessUnits: [{ type: Schema.Types.ObjectId, required: true, ref: 'Operation' }],
      assets: [{ type: Schema.Types.ObjectId, required: true, ref: 'Asset' }]
    },
    location: { type: Schema.Types.ObjectId, required: false, ref: 'Location' },
    typeData: {
      type: {
        assetId: { type: Schema.Types.ObjectId, required: false },
        transportType: { type: String, required: false },
        energySource: { type: String, required: false }
      },
      required: false
    },
    data: [consumptionDataSchema]
  },
  { timestamps: true }
);

export const Consumption = model<IConsumption>('Consumption', consumptionSchema);
export type Consumption = InferSchemaType<typeof consumptionSchema>;
export type ConsumptionData = InferSchemaType<typeof consumptionDataSchema>;
