    actor?: ActorUser,
    options?: {
      userId?: string;
      centerId?: string;
      includeAll?: boolean;
    },
  ): Promise<Pagination<UserPaymentStatementItemDto>> {
    // Build query with joins to get payment and user name information
    const queryBuilder = this.getRepository()
      .manager.createQueryBuilder(Payment, 'p')
      // Join for sender names (users)
      .leftJoin(
        'user_profiles',
        'senderProfile',
        'p.senderId = senderProfile.id AND p.senderType = :userProfileType',
        { userProfileType: 'USER_PROFILE' },
      )
      .leftJoin('users', 'senderUser', 'senderProfile.userId = senderUser.id')
      // Join for receiver names (users)
      .leftJoin(
        'user_profiles',
        'receiverProfile',
        'p.receiverId = receiverProfile.id AND p.receiverType = :userProfileType',
        { userProfileType: 'USER_PROFILE' },
      )
      .leftJoin(
        'users',
        'receiverUser',
        'receiverProfile.userId = receiverUser.id',
      )
      // Join for center filtering through branches
      .leftJoin(
        'branches',
        'senderBranch',
        'p.senderId = senderBranch.id AND p.senderType = :branchType',
        { branchType: 'BRANCH' },
      )
      .leftJoin(
        'centers',
        'senderCenter',
        'senderBranch.centerId = senderCenter.id',
      )
      .leftJoin(
        'branches',
        'receiverBranch',
        'p.receiverId = receiverBranch.id AND p.receiverType = :branchType',
        { branchType: 'BRANCH' },
      )
      .leftJoin(
        'centers',
        'receiverCenter',
        'receiverBranch.centerId = receiverCenter.id',
      );

    // Apply user filtering (if not admin view)
    if (!options?.includeAll && options?.userId) {
      queryBuilder.where(
        '((p.senderId = :userId AND p.senderType = :userProfileType) OR (p.receiverId = :userId AND p.receiverType = :userProfileType))',
        { userId: options.userId, userProfileType: 'USER_PROFILE' },
      );
    }

    // Apply center filtering only for admin views (includeAll = true)
    // User views should show all payments regardless of center
    let centerId: string | undefined;
    if (options?.includeAll) {
      centerId = options?.centerId || actor?.centerId;
      if (centerId) {
        queryBuilder.andWhere(
          '(senderBranch.centerId = :centerId OR receiverBranch.centerId = :centerId)',
          { centerId },
        );
      }
    }

    // Select human-readable names and user IDs
    queryBuilder
      .addSelect(
        "COALESCE(senderUser.name, CONCAT(senderCenter.name, CONCAT(' - ', senderBranch.city)))",
        'senderName',
      )
      .addSelect('senderProfile.id', 'senderProfileId')
      .addSelect('senderUser.id', 'senderUserId')
      .addSelect(
        "COALESCE(receiverUser.name, CONCAT(receiverCenter.name, CONCAT(' - ', receiverBranch.city)))",
        'receiverName',
      )
      .addSelect('receiverProfile.id', 'receiverProfileId')
      .addSelect('receiverUser.id', 'receiverUserId');

    // Set parameters
    const parameters: any = {
      userProfileType: 'USER_PROFILE',
      branchType: 'BRANCH',
    };
    if (options?.userId) parameters.userId = options.userId;
    if (centerId) parameters.centerId = centerId;
    queryBuilder.setParameters(parameters);

    // Apply filters from dto
    if (dto.status) {
      queryBuilder.andWhere('p.status = :status', { status: dto.status });
    }
    if (dto.reason) {
      queryBuilder.andWhere('p.reason = :reason', { reason: dto.reason });
    }
    if (dto.source) {
      queryBuilder.andWhere('p.source = :source', { source: dto.source });
    }

    // Get paginated results with computed fields using the repository's paginate method
    const result = (await this.paginate(
      dto,
      {
        searchableColumns: [],
        sortableColumns: ['createdAt', 'status', 'amount'],
        defaultSortBy: ['createdAt', 'DESC'],
      },
      '',
      queryBuilder,
      {
        includeComputedFields: true,
        computedFieldsMapper: (entity: Payment, raw: any): PaymentWithNames => {
          // Add computed name fields from joined data
          return {
            ...entity,
            senderName: raw.senderName,
            receiverName: raw.receiverName,
            senderProfileId: raw.senderProfileId,
            senderUserId: raw.senderUserId,
            receiverProfileId: raw.receiverProfileId,
            receiverUserId: raw.receiverUserId,
          } as PaymentWithNames;
        },
      },
    )) as Pagination<PaymentWithNames>;

    // Transform to UserPaymentStatementItemDto
    const items: UserPaymentStatementItemDto[] = result.items.map(
      (payment: PaymentWithNames) => {
        // Determine user's role in the payment
        let userRole: 'sender' | 'receiver' = 'sender'; // Default for admin view

        if (!options?.includeAll && options?.userId) {
          // For user-specific view, determine role based on profile ID match
          userRole =
            payment.senderProfileId === options.userId ? 'sender' : 'receiver';
        }

        // Calculate signed amount based on user role
        const signedAmount = userRole === 'sender'
          ? -payment.amount.toNumber()  // Negative for sent payments
          : payment.amount.toNumber();  // Positive for received payments

        return {
          id: payment.id,
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt,
          amount: payment.amount.toNumber(),
          signedAmount,
          status: payment.status,
          reason: payment.reason,
          source: payment.source,
          senderId: payment.senderId,
          receiverId: payment.receiverId,
          correlationId: payment.correlationId,
          paidAt: payment.paidAt,
          senderName: payment.senderName || 'N/A',
          receiverName: payment.receiverName || 'N/A',
          userRole,
        };
      },
    );

    return {
      ...result,
      items,
    };
  }
}
