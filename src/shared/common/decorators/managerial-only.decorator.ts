import { SetMetadata } from '@nestjs/common';

export const MANAGERIAL_ONLY_KEY = 'managerialOnly';

export const ManagerialOnly = () => SetMetadata(MANAGERIAL_ONLY_KEY, true);
