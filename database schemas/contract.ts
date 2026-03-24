import { ObjectId } from 'bson';
import { InferSchemaType, Schema, model } from 'mongoose';

import { CircularityMetrics, CircularityType, States, StatusType, WithID } from '../util/types';
import { boolean } from 'zod';

export interface IContractSupplier {
  supplier?: ObjectId;
  useSupplierContact?: boolean;
  contacts: ObjectId[];
  info?: string;
}

export interface IContractScope {
  mainCategory: string[];
  subCategory: string[];
  product: string[];
}

export interface IAttachment {
  name: string;
  fullPath: string;
  size: number;
  type: string;
  data?: string;
}

interface IContract {
  name?: string;
  status?: StatusType;
  type?: string;
  company?: ObjectId;
  circularity: CircularityType[];
  valid?: {
    fromDate?: Date;
    toDate?: Date;
  };
  department: string[];
  scope?: IContractScope;
  files?: WithID<IAttachment>[];
  orderAmount?: {
    from?: number;
    to?: number;
    currency?: string;
    taxIncluded?: boolean;
    description?: string;
  };
  description?: string;
  suppliers: IContractSupplier[];
  managers: ObjectId[];
  bonuses: string[];
  additionalInformation: {
    title?: string;
    text?: string;
  }[];
  alternativeContracts: ObjectId[];
}

const contractSchema = new Schema<IContract>(
  {
    name: { type: String, required: false },
    status: { type: String, required: false, default: 'active', enum: States },
    type: { type: String, required: false },
    company: { type: Schema.Types.ObjectId, required: false, ref: 'Company' },
    circularity: [{ type: String, required: true, enum: CircularityMetrics }],
    valid: {
      fromDate: { type: Date, required: false },
      toDate: { type: Date, required: false }
    },
    department: [{ type: String, required: true }],
    scope: {
      mainCategory: [{ type: String, required: true }],
      subCategory: [{ type: String, required: false }],
      product: [{ type: String, required: true }]
    },
    orderAmount: {
      from: { type: Number, required: false },
      to: { type: Number, required: false },
      currency: { type: String, required: false },
      taxIncluded: { type: Boolean, required: false, default: false },
      description: { type: String, required: false }
    },
    description: { type: String, required: false },
    suppliers: [
      {
        supplier: { type: Schema.Types.ObjectId, required: false, ref: 'Supplier' },
        useSupplierContact: { type: Boolean, required: false },
        contacts: [{ type: Schema.Types.ObjectId, required: true, ref: 'Contact' }],
        info: { type: String, required: false }
      }
    ],
    managers: [{ type: Schema.Types.ObjectId, required: false, ref: 'User' }],
    bonuses: [{ type: String, required: true }],
    additionalInformation: [
      {
        title: { type: String, required: false },
        text: { type: String, required: false }
      }
    ],
    alternativeContracts: [{ type: Schema.Types.ObjectId, required: true, ref: 'Company' }],
    files: [
      {
        name: { type: String, required: true },
        fullPath: { type: String, required: true },
        size: { type: Number, required: false },
        type: { type: String, required: false }
      }
    ]
  },
  { timestamps: true }
);

export const Contract = model<IContract>('Contract', contractSchema);
export type Contract = InferSchemaType<typeof contractSchema>;
