import { ObjectId } from 'bson';
import { InferSchemaType, Schema, model } from 'mongoose';

import { AccessRoles, OnboardingState, States } from '../util/types';
import { StatusType } from '../util/types';

interface IUser {
  firstName?: string;
  lastName?: string;
  status?: StatusType;
  email: string;
  phoneNumber?: number;
  phoneCountryCode?: string;
  isVerified?: Boolean;
  role: number;
  password?: string;
  onboarding: {
    state: string;
  };
  company?: ObjectId;
  department?: string;
  jobTitle?: string;
  favourites?: {
    contracts: ObjectId[];
  };
  notes?: {
    contracts: {
      contractId: ObjectId;
      text: string;
    }[];
  };
}

const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: false },
    lastName: { type: String, required: false },
    status: { type: String, required: false, default: States.ACTIVE, enum: States },
    email: { type: String, required: true, lowercase: true },
    phoneNumber: { type: Number, required: false },
    phoneCountryCode: { type: String, required: false },
    isVerified: { type: Boolean, required: true, default: false },
    role: {
      type: Schema.Types.Mixed,
      required: true,
      default: AccessRoles.VIEWER,
      enum: AccessRoles
    },
    password: { type: String, required: false },
    onboarding: {
      state: {
        type: String,
        required: true,
        default: OnboardingState.INITIAL,
        enum: OnboardingState
      }
    },
    company: { type: Schema.Types.ObjectId, required: false, ref: 'Company' },
    department: { type: String, required: false },
    jobTitle: { type: String, required: false },
    favourites: {
      contracts: [{ type: Schema.Types.ObjectId, required: true }]
    },
    notes: {
      contracts: [
        {
          contractId: { type: Schema.Types.ObjectId, required: true },
          text: { type: String, required: true }
        }
      ]
    }
  },
  { timestamps: true }
);

export const User = model<IUser>('User', userSchema);
export type User = InferSchemaType<typeof userSchema>;
