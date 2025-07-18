import { AttendanceStatus } from './bulk-mark-attendance.dto';

export interface AttendanceResponseDto {
  id: string;
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
  note?: string;
  markedById: string;
  createdAt: Date;
  updatedAt: Date;
}
