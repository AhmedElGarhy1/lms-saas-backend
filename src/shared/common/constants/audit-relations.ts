/**
 * Standard select fields for audit relations (creator, updater, deleter)
 * Only includes userProfile.id and userProfile.user.name for minimal data loading
 */
export const AUDIT_RELATION_SELECT = {
  creator: ['creator.id', 'creator.user', 'creatorUser.id', 'creatorUser.name'],
  updater: [
    'updater.id',
    'updater.user',
    'updaterUser.id',
    'updaterUser.name',
  ],
  deleter: [
    'deleter.id',
    'deleter.user',
    'deleterUser.id',
    'deleterUser.name',
  ],
};

/**
 * All audit relation selects combined
 */
export const ALL_AUDIT_RELATION_SELECT = [
  ...AUDIT_RELATION_SELECT.creator,
  ...AUDIT_RELATION_SELECT.updater,
  ...AUDIT_RELATION_SELECT.deleter,
];
