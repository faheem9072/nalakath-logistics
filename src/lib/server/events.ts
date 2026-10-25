import { EventEmitter } from 'events';

export const fleetEvents = new EventEmitter();
fleetEvents.setMaxListeners(200);
