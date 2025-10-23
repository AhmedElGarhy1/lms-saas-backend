// import {
//   Entity,
//   Column,
//   CreateDateColumn,
//   UpdateDateColumn,
//   PrimaryGeneratedColumn,
// } from 'typeorm';
// import { Exclude } from 'class-transformer';
// import { Locale } from '@/i18n/i18n.config';
// import { User } from './user.entity';

// @Entity('user_settings')
// export class UserSettings {
//   @PrimaryGeneratedColumn('uuid')
//   id: string;

//   @Column({ type: 'uuid' })
//   user_id: string;

//   @Column()
//   user: User;

//   @Column({ nullable: true })
//   @Exclude()
//   twoFactorSecret: string;

//   @Column({ default: false })
//   twoFactorEnabled: boolean;

//   @Column({ type: 'enum', enum: Locale, default: Locale.EN })
//   locale: Locale;

//   @CreateDateColumn()
//   createdAt: Date;

//   @UpdateDateColumn()
//   updatedAt: Date;
// }
