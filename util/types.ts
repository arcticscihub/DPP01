import { ObjectId } from 'bson';

export type CircularityType = 'redesign' | 'repair' | 'reuse' | 'new' | 'other';
export type ConsumptionType = 'ELECTRICITY' | 'TRANSPORT' | 'WASTE' | 'WASTE_WATER' | 'WATER';
export type RoleType = 'administrator' | 'owner' | 'editor' | 'viewer';
export type StatusType = 'active' | 'deactivated' | 'deleted' | 'draft' | 'expired';
export type WithID<T> = T & { _id: ObjectId };

export enum CircularityMetrics {
  REDESIGN = 'redesign',
  REPAIR = 'repair',
  REUSE = 'reuse',
  NEW = 'new',
  OTHER = 'other'
}

export enum AccessRoles {
  ADMIN = 3,
  OWNER = 2,
  EDITOR = 1,
  VIEWER = 0
}

export enum Consumptions {
  ELECTRICITY = 'ELECTRICITY',
  TRANSPORT = 'TRANSPORT',
  WASTE = 'WASTE',
  WASTE_WATER = 'WASTE_WATER',
  WATER = 'WATER'
}

export enum OnboardingState {
  INITIAL = 'Initial',
  COMPANY = 'Company',
  LOCATION = 'Location',
  FORM = 'Form'
}

export enum States {
  ACTIVE = 'active',
  DEACTIVATED = 'deactivated',
  DELETED = 'deleted',
  DRAFT = 'draft',
  EXPIRED = 'expired'
}
