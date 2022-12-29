import { Subjects } from './subjects';

export interface UccxUpdatedEvent {
  subject: Subjects.UccxUpdated;
  data: {
    name: string;
    value: string;
    configurationsIp: string;
    configurationsTenant: string;
  };
}
